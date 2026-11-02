/**
 * Audio Analysis & Pitch Estimation Engine for Wavey
 * Analyzes time-domain waveforms and frequency spectra from Web Audio API.
 * Uses autocorrelation for dominant pitch + spectral peak picking with harmonic cancellation
 * for polyphonic piano note estimation.
 */

import type { ActiveNoteInfo } from './musicTheory';
import { frequencyToMidi, createActiveNote, STANDARD_A4 } from './musicTheory';
import { pianoSynth } from './pianoSynth';

export interface AudioAnalyzerConfig {
  fftSize: number;
  a4Tuning: number;
  sensitivity: number; // 0.1 to 2.0 (default 1.0)
  noiseGateDb: number; // e.g. -65 dB
  useFlats: boolean;
}

export interface AudioAnalysisFrame {
  timeDomainData: Float32Array;
  frequencyData: Float32Array;
  byteTimeDomainData: Uint8Array;
  byteFrequencyData: Uint8Array;
  rms: number;
  peakDb: number;
  isSilent: boolean;
  detectedNotes: ActiveNoteInfo[];
  dominantFrequency: number | null;
}

interface NoteTrackerEntry {
  midiNote: number;
  confidence: number;
  frequency: number;
  cents: number;
  lastSeenMs: number;
  consecutiveDetections: number;
  amplitude: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private synthGainNode: GainNode | null = null;
  private isListening: boolean = false;
  private inputMode: 'mic' | 'midi' | 'synth' = 'mic';
  private config: AudioAnalyzerConfig = {
    fftSize: 4096,
    a4Tuning: STANDARD_A4,
    sensitivity: 1.0,
    noiseGateDb: -60,
    useFlats: false,
  };

  // Persistent tracking to avoid jitter/flicker
  private trackedNotes: Map<number, NoteTrackerEntry> = new Map();

  // Reusable typed arrays to prevent GC pauses during 60fps rendering
  private timeDomainBuffer: Float32Array | null = null;
  private freqDomainBuffer: Float32Array | null = null;
  private byteTimeDomainBuffer: Uint8Array | null = null;
  private byteFreqDomainBuffer: Uint8Array | null = null;

  constructor() {}

  public getConfig(): AudioAnalyzerConfig {
    return { ...this.config };
  }

  public setConfig(updates: Partial<AudioAnalyzerConfig>) {
    this.config = { ...this.config, ...updates };
    if (updates.fftSize && this.analyser) {
      this.analyser.fftSize = updates.fftSize;
      this.allocateBuffers();
    }
    if (updates.a4Tuning) {
      pianoSynth.setTuning(updates.a4Tuning);
    }
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getInputMode(): 'mic' | 'midi' | 'synth' {
    return this.inputMode;
  }

  /**
   * Initialize the AudioContext (must be called upon user interaction)
   */
  public async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = 0.65; // Responsive yet smooth

      // Route piano synth through analyzer node
      this.synthGainNode = this.ctx.createGain();
      this.synthGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.synthGainNode.connect(this.analyser);
      // Analyser connects to destination so user can hear the synth
      this.synthGainNode.connect(this.ctx.destination);

      pianoSynth.init(this.ctx, this.synthGainNode);
      this.allocateBuffers();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    return this.ctx;
  }

  private allocateBuffers() {
    if (!this.analyser) return;
    const binCount = this.analyser.frequencyBinCount;
    this.timeDomainBuffer = new Float32Array(this.analyser.fftSize);
    this.freqDomainBuffer = new Float32Array(binCount);
    this.byteTimeDomainBuffer = new Uint8Array(this.analyser.fftSize);
    this.byteFreqDomainBuffer = new Uint8Array(binCount);
  }

  /**
   * Request microphone stream and attach to analyser
   */
  public async startMicrophone(deviceId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureContext();
      this.stopMicrophone(); // Stop existing stream if any

      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!this.ctx || !this.analyser) {
        throw new Error('AudioContext initialization failed');
      }

      this.micSource = this.ctx.createMediaStreamSource(this.micStream);
      // Connect mic to analyser ONLY (do NOT connect to destination to avoid feedback squeal!)
      this.micSource.connect(this.analyser);

      this.isListening = true;
      this.inputMode = 'mic';
      this.trackedNotes.clear();
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.isListening = false;
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Stop microphone stream and free hardware tracks
   */
  public stopMicrophone() {
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {}
      this.micSource = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    this.isListening = false;
    this.trackedNotes.clear();
  }

  /**
   * Set mode to MIDI or Synth (leaves context running, routes notes to synth and analyser)
   */
  public async enableMidiOrSynthMode(mode: 'midi' | 'synth') {
    await this.ensureContext();
    this.stopMicrophone();
    this.inputMode = mode;
    this.isListening = true;
    this.trackedNotes.clear();
  }

  public clearNotes() {
    this.trackedNotes.clear();
  }

  /**
   * List available audio input devices
   */
  public async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  /**
   * Analyze the current audio frame from the analyser node.
   * Performs RMS calculation, autocorrelation for dominant pitch,
   * spectral peak extraction, and harmonic cancellation.
   */
  public analyzeFrame(): AudioAnalysisFrame {
    const emptyFrame: AudioAnalysisFrame = {
      timeDomainData: new Float32Array(0),
      frequencyData: new Float32Array(0),
      byteTimeDomainData: new Uint8Array(0),
      byteFrequencyData: new Uint8Array(0),
      rms: 0,
      peakDb: -100,
      isSilent: true,
      detectedNotes: [],
      dominantFrequency: null,
    };

    if (!this.analyser || !this.ctx || !this.timeDomainBuffer || !this.freqDomainBuffer) {
      return emptyFrame;
    }

    const now = performance.now();
    const sampleRate = this.ctx.sampleRate;
    const fftSize = this.analyser.fftSize;
    const binCount = this.analyser.frequencyBinCount;

    // Fetch audio buffers
    (this.analyser as unknown as { getFloatTimeDomainData: (b: Float32Array) => void }).getFloatTimeDomainData(this.timeDomainBuffer);
    (this.analyser as unknown as { getFloatFrequencyData: (b: Float32Array) => void }).getFloatFrequencyData(this.freqDomainBuffer);
    if (this.byteTimeDomainBuffer) {
      (this.analyser as unknown as { getByteTimeDomainData: (b: Uint8Array) => void }).getByteTimeDomainData(this.byteTimeDomainBuffer);
    }
    if (this.byteFreqDomainBuffer) {
      (this.analyser as unknown as { getByteFrequencyData: (b: Uint8Array) => void }).getByteFrequencyData(this.byteFreqDomainBuffer);
    }

    // Compute RMS and peak
    let sumSq = 0;
    for (let i = 0; i < fftSize; i++) {
      const val = this.timeDomainBuffer[i];
      sumSq += val * val;
    }
    const rms = Math.sqrt(sumSq / fftSize);

    let maxDb = -120;
    for (let i = 0; i < binCount; i++) {
      if (this.freqDomainBuffer[i] > maxDb) {
        maxDb = this.freqDomainBuffer[i];
      }
    }

    // Dynamic silence threshold scaled by sensitivity
    // Sensitivity: 0.5 (low sensitivity, high gate) to 2.0 (high sensitivity, low gate)
    const effectiveNoiseGate = this.config.noiseGateDb + (1 - this.config.sensitivity) * 15;
    const isSilent = maxDb < effectiveNoiseGate || rms < 0.003 / this.config.sensitivity;

    if (isSilent) {
      // Age out tracked notes when silent
      const timeoutMs = 180;
      for (const [midi, entry] of this.trackedNotes.entries()) {
        if (now - entry.lastSeenMs > timeoutMs) {
          this.trackedNotes.delete(midi);
        }
      }

      return {
        timeDomainData: this.timeDomainBuffer,
        frequencyData: this.freqDomainBuffer,
        byteTimeDomainData: this.byteTimeDomainBuffer || new Uint8Array(0),
        byteFrequencyData: this.byteFreqDomainBuffer || new Uint8Array(0),
        rms,
        peakDb: maxDb,
        isSilent: true,
        detectedNotes: Array.from(this.trackedNotes.values()).map((e) =>
          createActiveNote(e.midiNote, 'audio', {
            confidence: e.confidence * 0.7,
            cents: e.cents,
            a4: this.config.a4Tuning,
            useFlats: this.config.useFlats,
          })
        ),
        dominantFrequency: null,
      };
    }

    // 1. Estimate dominant pitch via Autocorrelation (YIN-like NSDF)
    const dominantFreq = this.detectDominantPitchAutoCorr(this.timeDomainBuffer, sampleRate);

    // 2. Polyphonic Peak Extraction with Harmonic Cancellation
    const candidateNotes = this.extractPolyphonicNotes(
      this.freqDomainBuffer,
      sampleRate,
      effectiveNoiseGate,
      dominantFreq
    );

    // 3. Temporal Tracking & Smoothing (Hysteresis)
    const activeNoteList: ActiveNoteInfo[] = [];
    const seenThisFrame = new Set<number>();

    for (const cand of candidateNotes) {
      seenThisFrame.add(cand.midi);
      const existing = this.trackedNotes.get(cand.midi);

      if (existing) {
        existing.lastSeenMs = now;
        existing.consecutiveDetections = Math.min(10, existing.consecutiveDetections + 1);
        // Exponential moving average for confidence & cents
        existing.confidence = existing.confidence * 0.4 + cand.confidence * 0.6;
        existing.cents = Math.round(existing.cents * 0.3 + cand.cents * 0.7);
        existing.amplitude = Math.max(existing.amplitude * 0.8, cand.amplitude);
      } else {
        this.trackedNotes.set(cand.midi, {
          midiNote: cand.midi,
          confidence: cand.confidence * 0.8, // Slightly lower on first frame
          frequency: cand.frequency,
          cents: cand.cents,
          lastSeenMs: now,
          consecutiveDetections: 1,
          amplitude: cand.amplitude,
        });
      }
    }

    // Decay notes that were not seen this frame
    const noteHoldTimeMs = 280; // Piano sustain persistence
    for (const [midi, entry] of this.trackedNotes.entries()) {
      if (!seenThisFrame.has(midi)) {
        const timeSince = now - entry.lastSeenMs;
        if (timeSince > noteHoldTimeMs) {
          this.trackedNotes.delete(midi);
        } else {
          // Fade confidence
          entry.confidence *= 0.88;
        }
      }
    }

    // Convert tracked notes into ActiveNoteInfo
    for (const entry of this.trackedNotes.values()) {
      // Require at least 2 consecutive frames or very high confidence
      if (entry.consecutiveDetections >= 2 || entry.confidence > 0.75) {
        activeNoteList.push(
          createActiveNote(entry.midiNote, 'audio', {
            confidence: Math.min(1, Math.max(0.1, entry.confidence)),
            cents: entry.cents,
            a4: this.config.a4Tuning,
            useFlats: this.config.useFlats,
          })
        );
      }
    }

    return {
      timeDomainData: this.timeDomainBuffer,
      frequencyData: this.freqDomainBuffer,
      byteTimeDomainData: this.byteTimeDomainBuffer || new Uint8Array(0),
      byteFrequencyData: this.byteFreqDomainBuffer || new Uint8Array(0),
      rms,
      peakDb: maxDb,
      isSilent: false,
      detectedNotes: activeNoteList,
      dominantFrequency: dominantFreq,
    };
  }

  /**
   * Autocorrelation Pitch Detection for clean monophonic or dominant bass estimation
   */
  private detectDominantPitchAutoCorr(buffer: Float32Array, sampleRate: number): number | null {
    const minFreq = 50;  // G1 (~49 Hz)
    const maxFreq = 1200; // D6 (~1174 Hz)
    const minPeriod = Math.floor(sampleRate / maxFreq);
    const maxPeriod = Math.floor(sampleRate / minFreq);

    const len = buffer.length;
    let maxCorrelation = 0;
    let bestPeriod = -1;

    // Fast Normalized Autocorrelation
    for (let period = minPeriod; period <= maxPeriod; period++) {
      let sum = 0;
      let sumSq1 = 0;
      let sumSq2 = 0;

      const step = 2; // Step 2 for high performance at 60fps
      for (let i = 0; i < len - period; i += step) {
        const v1 = buffer[i];
        const v2 = buffer[i + period];
        sum += v1 * v2;
        sumSq1 += v1 * v1;
        sumSq2 += v2 * v2;
      }

      const norm = Math.sqrt(sumSq1 * sumSq2);
      if (norm > 0.0001) {
        const corr = sum / norm;
        if (corr > maxCorrelation) {
          maxCorrelation = corr;
          bestPeriod = period;
        }
      }
    }

    if (bestPeriod > 0 && maxCorrelation > 0.6) {
      // Parabolic interpolation around bestPeriod
      return sampleRate / bestPeriod;
    }

    return null;
  }

  /**
   * Extract polyphonic piano notes from frequency spectrum with harmonic cancellation
   */
  private extractPolyphonicNotes(
    freqData: Float32Array,
    sampleRate: number,
    noiseFloorDb: number,
    dominantFreq: number | null
  ): Array<{ midi: number; frequency: number; cents: number; confidence: number; amplitude: number }> {
    const binCount = freqData.length;
    const binWidth = sampleRate / (binCount * 2);

    // Limit search to piano range: A0 (27.5 Hz) to C8 (4186 Hz)
    const minBin = Math.max(2, Math.floor(27.5 / binWidth));
    const maxBin = Math.min(binCount - 2, Math.ceil(4200 / binWidth));

    interface Peak {
      bin: number;
      frequency: number;
      db: number;
      linearAmp: number;
      isHarmonicOf?: number;
    }

    const peaks: Peak[] = [];

    // Find prominent local maxima
    for (let i = minBin; i <= maxBin; i++) {
      const val = freqData[i];
      if (val > noiseFloorDb && val > freqData[i - 1] && val > freqData[i + 1]) {
        // Parabolic peak interpolation
        const alpha = freqData[i - 1];
        const beta = val;
        const gamma = freqData[i + 1];
        const delta = (0.5 * (alpha - gamma)) / (alpha - 2 * beta + gamma + 1e-9);
        const interpBin = i + delta;
        const peakFreq = interpBin * binWidth;
        const linearAmp = Math.pow(10, val / 20);

        peaks.push({
          bin: interpBin,
          frequency: peakFreq,
          db: val,
          linearAmp,
        });
      }
    }

    // Sort peaks by amplitude descending
    peaks.sort((a, b) => b.db - a.db);

    // Harmonic Cancellation & Grouping:
    // For each fundamental candidate, check if higher peaks match 2f, 3f, 4f, 5f harmonics.
    // If so, mark them as harmonics so they aren't counted as separate notes!
    for (let i = 0; i < peaks.length; i++) {
      const f0 = peaks[i];
      if (f0.isHarmonicOf !== undefined) continue;

      for (let j = 0; j < peaks.length; j++) {
        if (i === j) continue;
        const candidate = peaks[j];
        if (candidate.isHarmonicOf !== undefined) continue;
        if (candidate.frequency <= f0.frequency) continue;

        // Check if candidate frequency is an integer multiple of f0
        const harmonicRatio = candidate.frequency / f0.frequency;
        const nearestHarmonic = Math.round(harmonicRatio);

        if (nearestHarmonic >= 2 && nearestHarmonic <= 6) {
          const expectedFreq = f0.frequency * nearestHarmonic;
          const relativeError = Math.abs(candidate.frequency - expectedFreq) / expectedFreq;

          // Within 3.5% frequency tolerance
          if (relativeError < 0.035) {
            // Check if the harmonic energy is reasonable for piano overtone
            // Real piano overtones are typically quieter than the fundamental
            if (candidate.db <= f0.db + 3) {
              candidate.isHarmonicOf = f0.frequency;
            }
          }
        }
      }
    }

    // Filter to true fundamental candidates (not harmonics of a louder lower note)
    const notesMap = new Map<number, { midi: number; frequency: number; cents: number; confidence: number; amplitude: number }>();

    for (const p of peaks) {
      if (p.isHarmonicOf !== undefined) continue;

      const { midi, cents } = frequencyToMidi(p.frequency, this.config.a4Tuning);

      // Must be in valid piano range: A0 (21) to C8 (108)
      if (midi < 21 || midi > 108) continue;

      // Base confidence on signal-to-noise ratio above noise gate
      const snr = Math.max(0, p.db - noiseFloorDb);
      let confidence = Math.min(1.0, snr / 35);

      // Bonus if this peak matches the dominant autocorrelation pitch
      if (dominantFreq) {
        const ratio = p.frequency / dominantFreq;
        if (Math.abs(ratio - 1.0) < 0.04 || Math.abs(ratio - 2.0) < 0.04) {
          confidence = Math.min(1.0, confidence + 0.25);
        }
      }

      // Check if we already have this MIDI note in this frame
      const existing = notesMap.get(midi);
      if (!existing || p.db > existing.amplitude) {
        notesMap.set(midi, {
          midi,
          frequency: p.frequency,
          cents,
          confidence,
          amplitude: p.db,
        });
      }
    }

    // Keep top candidates (piano chords rarely exceed 6 simultaneous notes)
    return Array.from(notesMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 6);
  }
}

export const audioEngine = new AudioEngine();
