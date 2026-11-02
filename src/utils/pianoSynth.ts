/**
 * Polyphonic Piano Synthesizer for Wavey
 * Generates piano-like tones using additive synthesis, decay envelopes, and harmonic damping.
 * Connects into the audio processing graph so that MIDI and on-screen interactions
 * drive the waveform and spectrum analyzers in real time.
 */

import { midiToFrequency, STANDARD_A4 } from './musicTheory';

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  mainGain: GainNode;
  releaseTimer?: number;
}

export class PianoSynthesizer {
  private ctx: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private activeVoices: Map<number, ActiveVoice> = new Map();
  private a4Tuning: number = STANDARD_A4;
  private enabled: boolean = true;
  private volume: number = 0.6;

  constructor() {}

  public init(audioContext: AudioContext, destinationNode: AudioNode) {
    this.ctx = audioContext;
    this.outputNode = this.ctx.createGain();
    this.outputNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.outputNode.connect(destinationNode);
  }

  public setTuning(a4: number) {
    this.a4Tuning = a4;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.outputNode && this.ctx) {
      this.outputNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Note on event: trigger acoustic piano-like timbre
   */
  public noteOn(midiNote: number, velocity: number = 100) {
    if (!this.ctx || !this.outputNode || !this.enabled) return;

    // If already playing this note, stop it first
    if (this.activeVoices.has(midiNote)) {
      this.noteOff(midiNote);
    }

    const fundamentalFreq = midiToFrequency(midiNote, this.a4Tuning);
    const now = this.ctx.currentTime;
    const normVel = Math.max(0.1, Math.min(1, velocity / 127));

    // Piano voice with fundamental + harmonics + hammer strike impulse
    const voiceMainGain = this.ctx.createGain();
    voiceMainGain.gain.setValueAtTime(0.001, now);
    voiceMainGain.connect(this.outputNode);

    const oscillators: OscillatorNode[] = [];
    const gainNodes: GainNode[] = [];

    // Harmonics configuration: [freqMultiple, initialAmplitude, decayTimeFactor]
    const harmonics = [
      { mult: 1.0, amp: 1.0, decay: 1.0 },      // Fundamental
      { mult: 2.0, amp: 0.55, decay: 0.8 },     // 2nd harmonic
      { mult: 3.0, amp: 0.28, decay: 0.6 },     // 3rd harmonic
      { mult: 4.0, amp: 0.14, decay: 0.45 },    // 4th harmonic
      { mult: 5.0, amp: 0.08, decay: 0.35 },    // 5th harmonic
      { mult: 6.0, amp: 0.04, decay: 0.25 },    // 6th harmonic
    ];

    // High notes decay faster, bass notes sustain longer (natural concert grand decay)
    const baseDecay = Math.max(1.8, 5.5 * Math.pow(0.97, midiNote - 36));

    // Attack time: piano hammer strike is very fast (2-5ms)
    const attackTime = 0.004;

    for (const h of harmonics) {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = h.mult === 1.0 ? 'sine' : 'sine';
      // Slight detuning for acoustic warmth (chorus/dispersion effect in piano strings)
      const detune = (Math.random() - 0.5) * 4;
      osc.frequency.setValueAtTime(fundamentalFreq * h.mult, now);
      osc.detune.setValueAtTime(detune, now);

      const targetAmp = h.amp * normVel * 0.25;
      const decayDuration = baseDecay * h.decay;

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.exponentialRampToValueAtTime(targetAmp, now + attackTime);
      // Exponential decay to sustain level
      oscGain.gain.exponentialRampToValueAtTime(targetAmp * 0.2, now + attackTime + decayDuration * 0.3);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayDuration);

      osc.connect(oscGain);
      oscGain.connect(voiceMainGain);

      osc.start(now);
      oscillators.push(osc);
      gainNodes.push(oscGain);
    }

    // Voice level
    voiceMainGain.gain.exponentialRampToValueAtTime(1.0, now + attackTime);

    this.activeVoices.set(midiNote, {
      oscillators,
      gainNodes,
      mainGain: voiceMainGain,
    });
  }

  /**
   * Note off event: gentle damper release
   */
  public noteOff(midiNote: number) {
    const voice = this.activeVoices.get(midiNote);
    if (!voice || !this.ctx) return;

    const now = this.ctx.currentTime;
    const releaseTime = 0.18; // Damper dampens strings in ~180ms

    voice.mainGain.gain.cancelScheduledValues(now);
    voice.mainGain.gain.setValueAtTime(voice.mainGain.gain.value, now);
    voice.mainGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    // Stop oscillators after release
    setTimeout(() => {
      for (const osc of voice.oscillators) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore if already stopped
        }
      }
      for (const g of voice.gainNodes) {
        try {
          g.disconnect();
        } catch {}
      }
      try {
        voice.mainGain.disconnect();
      } catch {}
    }, releaseTime * 1000 + 50);

    this.activeVoices.delete(midiNote);
  }

  public stopAll() {
    for (const [midiNote] of this.activeVoices) {
      this.noteOff(midiNote);
    }
    this.activeVoices.clear();
  }
}

export const pianoSynth = new PianoSynthesizer();
