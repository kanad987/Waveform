/**
 * Web MIDI Input Manager for Wavey
 * Handles MIDI device discovery, permission requests, note-on / note-off message handling,
 * and tracks currently held physical keys with 100% confidence.
 */

import type { ActiveNoteInfo } from './musicTheory';
import { createActiveNote, STANDARD_A4 } from './musicTheory';
import { pianoSynth } from './pianoSynth';

export interface MidiDeviceOption {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
}

export type MidiEventCallback = (activeNotes: ActiveNoteInfo[]) => void;

// Safe definitions for Web MIDI in browser environments
interface BrowserMIDIPort {
  id: string;
  name?: string;
  manufacturer?: string;
  state: string;
  type: string;
}

interface BrowserMIDIInput extends BrowserMIDIPort {
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
}

interface BrowserMIDIAccess {
  inputs: Map<string, BrowserMIDIInput>;
  onstatechange: ((event: { port: BrowserMIDIPort }) => void) | null;
}

export class MidiManager {
  private midiAccess: BrowserMIDIAccess | null = null;
  private selectedInputId: string | 'all' = 'all';
  private activeInputs: Map<string, BrowserMIDIInput> = new Map();
  private heldNotes: Map<number, ActiveNoteInfo> = new Map();
  private listeners: Set<MidiEventCallback> = new Set();
  private a4Tuning: number = STANDARD_A4;
  private useFlats: boolean = false;
  private synthEnabled: boolean = true;
  private isConnected: boolean = false;

  constructor() {}

  /**
   * Check if Web MIDI is supported by the current browser.
   */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public setA4Tuning(a4: number) {
    this.a4Tuning = a4;
  }

  public setUseFlats(useFlats: boolean) {
    this.useFlats = useFlats;
  }

  public setSynthEnabled(enabled: boolean) {
    this.synthEnabled = enabled;
  }

  /**
   * Request Web MIDI access from the browser.
   */
  public async requestAccess(): Promise<{ success: boolean; error?: string; devices: MidiDeviceOption[] }> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Web MIDI API is not supported in this browser. Please use a Chromium-based browser (Chrome, Edge, Brave, Opera).',
        devices: [],
      };
    }

    try {
      const nav = navigator as unknown as { requestMIDIAccess: (options?: { sysex: boolean }) => Promise<BrowserMIDIAccess> };
      this.midiAccess = await nav.requestMIDIAccess({ sysex: false });
      this.isConnected = true;

      // Handle hot-plugging / unplugging of MIDI devices
      this.midiAccess.onstatechange = (event: { port: BrowserMIDIPort }) => {
        if (event.port && event.port.type === 'input') {
          this.refreshListeners();
        }
      };

      this.refreshListeners();
      const devices = this.getAvailableDevices();

      return {
        success: true,
        devices,
      };
    } catch (err: unknown) {
      this.isConnected = false;
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'MIDI permission was denied or failed to initialize.';
      return {
        success: false,
        error: errorMsg,
        devices: [],
      };
    }
  }

  /**
   * Get list of currently connected MIDI input devices
   */
  public getAvailableDevices(): MidiDeviceOption[] {
    if (!this.midiAccess) return [];

    const devices: MidiDeviceOption[] = [];
    this.midiAccess.inputs.forEach((input: BrowserMIDIInput) => {
      devices.push({
        id: input.id,
        name: input.name || `MIDI Device ${input.id}`,
        manufacturer: input.manufacturer || 'Generic',
        state: input.state,
      });
    });

    return devices;
  }

  /**
   * Select a specific MIDI input device or 'all'
   */
  public selectDevice(deviceId: string | 'all') {
    this.selectedInputId = deviceId;
    this.refreshListeners();
  }

  public getSelectedDevice(): string | 'all' {
    return this.selectedInputId;
  }

  /**
   * Attach midimessage listeners to the chosen MIDI input(s)
   */
  private refreshListeners() {
    if (!this.midiAccess) return;

    // Detach old listeners
    this.activeInputs.forEach((input: BrowserMIDIInput) => {
      input.onmidimessage = null;
    });
    this.activeInputs.clear();

    // Attach to selected or all inputs
    this.midiAccess.inputs.forEach((input: BrowserMIDIInput) => {
      if (this.selectedInputId === 'all' || this.selectedInputId === input.id) {
        input.onmidimessage = (event: { data: Uint8Array }) => this.handleMidiMessage(event);
        this.activeInputs.set(input.id, input);
      }
    });
  }

  /**
   * Parse incoming raw MIDI bytes
   */
  private handleMidiMessage(event: { data: Uint8Array }) {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0] & 0xf0; // Status nibble (e.g., 0x90 = Note On, 0x80 = Note Off)
    const midiNote = data[1];
    const velocity = data[2];

    // Standard MIDI Note On
    if (status === 0x90 && velocity > 0) {
      this.noteOn(midiNote, velocity);
    }
    // Standard MIDI Note Off (or Note On with velocity 0)
    else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      this.noteOff(midiNote);
    }
  }

  /**
   * Trigger Note On
   */
  public noteOn(midiNote: number, velocity: number = 100, source: 'midi' | 'ui' = 'midi') {
    const noteInfo = createActiveNote(midiNote, source, {
      velocity,
      confidence: 1.0, // MIDI events are 100% reliable ground truth
      cents: 0,
      a4: this.a4Tuning,
      useFlats: this.useFlats,
    });

    this.heldNotes.set(midiNote, noteInfo);

    if (this.synthEnabled) {
      pianoSynth.noteOn(midiNote, velocity);
    }

    this.emitChange();
  }

  /**
   * Trigger Note Off
   */
  public noteOff(midiNote: number) {
    if (this.heldNotes.has(midiNote)) {
      this.heldNotes.delete(midiNote);

      if (this.synthEnabled) {
        pianoSynth.noteOff(midiNote);
      }

      this.emitChange();
    }
  }

  /**
   * Clear all active held notes (e.g. on Stop or Panic)
   */
  public clearAllNotes() {
    this.heldNotes.clear();
    pianoSynth.stopAll();
    this.emitChange();
  }

  public getActiveNotes(): ActiveNoteInfo[] {
    return Array.from(this.heldNotes.values()).sort((a, b) => a.midiNote - b.midiNote);
  }

  public subscribe(callback: MidiEventCallback): () => void {
    this.listeners.add(callback);
    // Send initial state immediately
    callback(this.getActiveNotes());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emitChange() {
    const notes = this.getActiveNotes();
    this.listeners.forEach((cb) => cb(notes));
  }

  public disconnect() {
    this.clearAllNotes();
    this.activeInputs.forEach((input: BrowserMIDIInput) => {
      input.onmidimessage = null;
    });
    this.activeInputs.clear();
    this.isConnected = false;
  }
}

export const midiManager = new MidiManager();
