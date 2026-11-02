/**
 * Music Theory utilities for Wavey
 * Provides conversions between frequencies, MIDI note numbers, and note names,
 * as well as key categorization and tuning reference adjustments.
 */

export const NOTE_NAMES_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;
export const NOTE_NAMES_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] as const;

export const STANDARD_A4 = 440;

/**
 * Convert MIDI note number to its fundamental frequency in Hertz.
 * Standard formula: f = A4 * 2^((midi - 69) / 12)
 */
export function midiToFrequency(midiNote: number, a4 = STANDARD_A4): number {
  return a4 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Convert a frequency in Hertz to the closest MIDI note number and cents deviation.
 */
export function frequencyToMidi(freq: number, a4 = STANDARD_A4): { midi: number; cents: number; exactMidi: number } {
  if (freq <= 0) return { midi: 0, cents: 0, exactMidi: 0 };
  const exactMidi = 69 + 12 * Math.log2(freq / a4);
  const midi = Math.round(exactMidi);
  const exactTargetFreq = midiToFrequency(midi, a4);
  const cents = Math.round(1200 * Math.log2(freq / exactTargetFreq));
  return { midi, cents, exactMidi };
}

/**
 * Format a MIDI note number into a human-readable note name (e.g., "C4", "F♯5").
 */
export function midiToNoteName(
  midiNote: number,
  options: { useFlats?: boolean; includeOctave?: boolean } = {}
): string {
  const { useFlats = false, includeOctave = true } = options;
  const pitchClass = ((midiNote % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  const name = useFlats ? NOTE_NAMES_FLAT[pitchClass] : NOTE_NAMES_SHARP[pitchClass];
  return includeOctave ? `${name}${octave}` : name;
}

/**
 * Check if a MIDI note corresponds to an accidental / black key on a piano.
 */
export function isBlackKey(midiNote: number): boolean {
  const pitchClass = ((midiNote % 12) + 12) % 12;
  // 1=C#, 3=D#, 6=F#, 8=G#, 10=A#
  return pitchClass === 1 || pitchClass === 3 || pitchClass === 6 || pitchClass === 8 || pitchClass === 10;
}

/**
 * Check if a pitch class number (0-11) is a black key.
 */
export function isPitchClassBlack(pitchClass: number): boolean {
  const pc = ((pitchClass % 12) + 12) % 12;
  return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
}

export interface ActiveNoteInfo {
  midiNote: number;
  noteName: string;
  octave: number;
  pitchClass: number;
  frequency: number;
  cents?: number;
  velocity?: number; // 0 to 127 for MIDI
  confidence?: number; // 0 to 1 for audio
  source: 'midi' | 'audio' | 'ui';
}

/**
 * Parse an active note into structured information
 */
export function createActiveNote(
  midiNote: number,
  source: 'midi' | 'audio' | 'ui',
  options: {
    velocity?: number;
    confidence?: number;
    cents?: number;
    a4?: number;
    useFlats?: boolean;
  } = {}
): ActiveNoteInfo {
  const { velocity = 100, confidence = 1, cents = 0, a4 = STANDARD_A4, useFlats = false } = options;
  const pitchClass = ((midiNote % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = midiToNoteName(midiNote, { useFlats, includeOctave: true });
  const frequency = midiToFrequency(midiNote, a4);

  return {
    midiNote,
    noteName,
    octave,
    pitchClass,
    frequency,
    cents,
    velocity,
    confidence,
    source,
  };
}
