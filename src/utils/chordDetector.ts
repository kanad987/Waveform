/**
 * Advanced Chord Detection Engine for Wavey
 * Identifies roots, chord qualities, inversions, intervals, and alternative interpretations.
 */

import type { ActiveNoteInfo } from './musicTheory';
import { NOTE_NAMES_FLAT, NOTE_NAMES_SHARP } from './musicTheory';

export interface ChordFormula {
  name: string;
  symbol: string;
  intervals: number[]; // semitone intervals from root
  essential: number[]; // intervals that must be present
  category: 'triad' | 'seventh' | 'sixth' | 'extended' | 'suspended' | 'interval';
}

export const CHORD_FORMULAS: ChordFormula[] = [
  // Triads
  { name: 'Major', symbol: '', intervals: [0, 4, 7], essential: [0, 4], category: 'triad' },
  { name: 'Minor', symbol: 'm', intervals: [0, 3, 7], essential: [0, 3], category: 'triad' },
  { name: 'Diminished', symbol: 'dim', intervals: [0, 3, 6], essential: [0, 3, 6], category: 'triad' },
  { name: 'Augmented', symbol: 'aug', intervals: [0, 4, 8], essential: [0, 4, 8], category: 'triad' },
  { name: 'Suspended 2nd', symbol: 'sus2', intervals: [0, 2, 7], essential: [0, 2, 7], category: 'suspended' },
  { name: 'Suspended 4th', symbol: 'sus4', intervals: [0, 5, 7], essential: [0, 5, 7], category: 'suspended' },

  // Seventh Chords
  { name: 'Dominant 7th', symbol: '7', intervals: [0, 4, 7, 10], essential: [0, 4, 10], category: 'seventh' },
  { name: 'Major 7th', symbol: 'maj7', intervals: [0, 4, 7, 11], essential: [0, 4, 11], category: 'seventh' },
  { name: 'Minor 7th', symbol: 'm7', intervals: [0, 3, 7, 10], essential: [0, 3, 10], category: 'seventh' },
  { name: 'Half-Diminished 7th', symbol: 'm7♭5', intervals: [0, 3, 6, 10], essential: [0, 3, 6, 10], category: 'seventh' },
  { name: 'Diminished 7th', symbol: '°7', intervals: [0, 3, 6, 9], essential: [0, 3, 6, 9], category: 'seventh' },
  { name: 'Minor-Major 7th', symbol: 'm(maj7)', intervals: [0, 3, 7, 11], essential: [0, 3, 11], category: 'seventh' },
  { name: 'Augmented 7th', symbol: 'aug7', intervals: [0, 4, 8, 10], essential: [0, 4, 8, 10], category: 'seventh' },
  { name: '7th Suspended 4th', symbol: '7sus4', intervals: [0, 5, 7, 10], essential: [0, 5, 10], category: 'suspended' },

  // Sixth Chords
  { name: 'Major 6th', symbol: '6', intervals: [0, 4, 7, 9], essential: [0, 4, 9], category: 'sixth' },
  { name: 'Minor 6th', symbol: 'm6', intervals: [0, 3, 7, 9], essential: [0, 3, 9], category: 'sixth' },

  // Added & Extended Chords
  { name: 'Add 9', symbol: 'add9', intervals: [0, 4, 7, 2], essential: [0, 4, 2], category: 'extended' },
  { name: 'Minor Add 9', symbol: 'm(add9)', intervals: [0, 3, 7, 2], essential: [0, 3, 2], category: 'extended' },
  { name: 'Dominant 9th', symbol: '9', intervals: [0, 4, 7, 10, 2], essential: [0, 4, 10, 2], category: 'extended' },
  { name: 'Major 9th', symbol: 'maj9', intervals: [0, 4, 7, 11, 2], essential: [0, 4, 11, 2], category: 'extended' },
  { name: 'Minor 9th', symbol: 'm9', intervals: [0, 3, 7, 10, 2], essential: [0, 3, 10, 2], category: 'extended' },

  // Intervals (Dyads / 2-note combinations)
  { name: 'Power Chord (5th)', symbol: '5', intervals: [0, 7], essential: [0, 7], category: 'interval' },
  { name: 'Major 3rd', symbol: '(no5, maj3)', intervals: [0, 4], essential: [0, 4], category: 'interval' },
  { name: 'Minor 3rd', symbol: '(no5, min3)', intervals: [0, 3], essential: [0, 3], category: 'interval' },
  { name: 'Major 7th Interval', symbol: '(no3/5, maj7)', intervals: [0, 11], essential: [0, 11], category: 'interval' },
  { name: 'Minor 7th Interval', symbol: '(no3/5, 7)', intervals: [0, 10], essential: [0, 10], category: 'interval' },
  { name: 'Tritone', symbol: '(tritone)', intervals: [0, 6], essential: [0, 6], category: 'interval' },
  { name: 'Octave', symbol: 'octave', intervals: [0], essential: [0], category: 'interval' },
];

export interface ChordCandidate {
  rootPitchClass: number;
  rootName: string;
  formula: ChordFormula;
  fullName: string;
  symbolName: string;
  confidence: number; // 0 to 1
  bassPitchClass: number;
  bassNoteName: string;
  inversion: 'root' | '1st' | '2nd' | '3rd' | 'bass';
  isSlashChord: boolean;
  notesInChord: string[];
  missingNotes: string[];
  extraNotes: string[];
}

export interface ChordDetectionResult {
  status: 'empty' | 'single-note' | 'chord-detected' | 'uncertain';
  primaryChord: ChordCandidate | null;
  alternatives: ChordCandidate[];
  activeNotes: ActiveNoteInfo[];
  bassNote: ActiveNoteInfo | null;
  description: string;
}

/**
 * Determine inversion name based on which chord tone is in the bass.
 */
function getInversion(bassPitchClass: number, rootPitchClass: number): {
  inversion: 'root' | '1st' | '2nd' | '3rd' | 'bass';
  isSlashChord: boolean;
} {
  const bassInterval = ((bassPitchClass - rootPitchClass) % 12 + 12) % 12;

  if (bassInterval === 0) {
    return { inversion: 'root', isSlashChord: false };
  }

  // 1st inversion: 3rd in bass (either minor 3rd = 3 or major 3rd = 4)
  if (bassInterval === 3 || bassInterval === 4) {
    return { inversion: '1st', isSlashChord: true };
  }

  // 2nd inversion: 5th in bass (dim 5 = 6, perf 5 = 7, aug 5 = 8)
  if (bassInterval === 6 || bassInterval === 7 || bassInterval === 8) {
    return { inversion: '2nd', isSlashChord: true };
  }

  // 3rd inversion: 7th in bass (dim 7 = 9, min 7 = 10, maj 7 = 11)
  if (bassInterval === 9 || bassInterval === 10 || bassInterval === 11) {
    return { inversion: '3rd', isSlashChord: true };
  }

  // Any other bass note
  return { inversion: 'bass', isSlashChord: true };
}

/**
 * Detect chords from a list of active notes.
 */
export function detectChord(
  notes: ActiveNoteInfo[],
  options: { useFlats?: boolean } = {}
): ChordDetectionResult {
  const { useFlats = false } = options;
  const noteNames = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;

  if (!notes || notes.length === 0) {
    return {
      status: 'empty',
      primaryChord: null,
      alternatives: [],
      activeNotes: [],
      bassNote: null,
      description: 'Listening for piano notes...',
    };
  }

  // Sort notes from lowest MIDI number to highest
  const sortedNotes = [...notes].sort((a, b) => a.midiNote - b.midiNote);
  const bassNote = sortedNotes[0];
  const bassPitchClass = bassNote.pitchClass;

  // Extract unique pitch classes
  const pitchClassSet = new Set<number>();
  const pitchClassWeights = new Map<number, number>();

  for (const n of sortedNotes) {
    pitchClassSet.add(n.pitchClass);
    const existing = pitchClassWeights.get(n.pitchClass) || 0;
    // Weight by note confidence (1 for MIDI, up to 1 for audio)
    pitchClassWeights.set(n.pitchClass, Math.max(existing, n.confidence ?? 1));
  }

  const pitchClasses = Array.from(pitchClassSet);

  // Single note or pure octave duplicates
  if (pitchClasses.length === 1) {
    const pc = pitchClasses[0];
    const name = noteNames[pc];
    const octaves = sortedNotes.map(n => n.octave).join(', ');
    return {
      status: 'single-note',
      primaryChord: null,
      alternatives: [],
      activeNotes: sortedNotes,
      bassNote,
      description: sortedNotes.length > 1
        ? `${name} across octaves (${octaves})`
        : `Single Note: ${sortedNotes[0].noteName}`,
    };
  }

  // Evaluate candidate roots and chord formulas
  const candidates: ChordCandidate[] = [];

  // Try each pitch class (0 to 11) as potential root
  for (let root = 0; root < 12; root++) {
    const rootName = noteNames[root];

    for (const formula of CHORD_FORMULAS) {
      // Check essential notes
      let missingEssential = false;
      for (const ess of formula.essential) {
        const targetPitch = (root + ess) % 12;
        if (!pitchClassSet.has(targetPitch)) {
          missingEssential = true;
          break;
        }
      }

      if (missingEssential) {
        continue;
      }

      // Calculate how many chord formula tones are present in input
      let matchedCount = 0;
      let matchedWeight = 0;
      const formulaPitches = formula.intervals.map(iv => (root + iv) % 12);
      const formulaPitchSet = new Set(formulaPitches);

      for (const p of formulaPitches) {
        if (pitchClassSet.has(p)) {
          matchedCount++;
          matchedWeight += pitchClassWeights.get(p) || 1;
        }
      }

      // Count notes in input that do NOT belong to this formula (extra/foreign notes)
      let foreignNotesCount = 0;
      for (const p of pitchClasses) {
        if (!formulaPitchSet.has(p)) {
          foreignNotesCount++;
        }
      }

      // Check if root itself is present in the input
      const rootPresent = pitchClassSet.has(root);
      if (!rootPresent && formula.category !== 'seventh') {
        // Roots can sometimes be omitted in jazz 7ths, but for triads it's usually required
        continue;
      }

      // Base precision and recall
      const precision = matchedCount / (matchedCount + foreignNotesCount);
      const recall = matchedCount / formula.intervals.length;

      // Inversion handling
      const { inversion, isSlashChord } = getInversion(bassPitchClass, root);

      // Scoring
      let score = (precision * 0.6) + (recall * 0.4);

      // Average input confidence factor
      const avgConfidence = matchedWeight / Math.max(1, matchedCount);
      score *= avgConfidence;

      // Bonus if root is in the bass
      if (inversion === 'root') {
        score += 0.08;
      } else {
        // Slight penalty for unusual inversions unless it's a known slash chord
        score -= 0.02;
      }

      // Penalty for dyad/interval over full triad/seventh when 3+ notes played
      if (formula.category === 'interval' && pitchClasses.length >= 3) {
        score -= 0.3;
      }

      // Strong penalty if too many foreign notes
      if (foreignNotesCount > 1) {
        score -= foreignNotesCount * 0.2;
      }

      if (score < 0.25) continue;

      const bassName = noteNames[bassPitchClass];
      const symbolName = `${rootName}${formula.symbol}${isSlashChord ? `/${bassName}` : ''}`;
      const fullName = `${rootName} ${formula.name}${isSlashChord ? ` (${inversion} Inv., /${bassName})` : ''}`;

      const notesInChord = formulaPitches
        .filter(p => pitchClassSet.has(p))
        .map(p => noteNames[p]);

      const missingNotes = formulaPitches
        .filter(p => !pitchClassSet.has(p))
        .map(p => noteNames[p]);

      const extraNotes = pitchClasses
        .filter(p => !formulaPitchSet.has(p))
        .map(p => noteNames[p]);

      candidates.push({
        rootPitchClass: root,
        rootName,
        formula,
        fullName,
        symbolName,
        confidence: Math.min(1, Math.max(0.01, score)),
        bassPitchClass,
        bassNoteName: bassName,
        inversion,
        isSlashChord,
        notesInChord,
        missingNotes,
        extraNotes,
      });
    }
  }

  // Sort candidates by highest confidence
  candidates.sort((a, b) => b.confidence - a.confidence);

  // Deduplicate redundant chord symbols (keep highest confidence)
  const uniqueCandidates: ChordCandidate[] = [];
  const seenSymbols = new Set<string>();
  for (const c of candidates) {
    if (!seenSymbols.has(c.symbolName)) {
      seenSymbols.add(c.symbolName);
      uniqueCandidates.push(c);
    }
  }

  if (uniqueCandidates.length === 0) {
    const noteListStr = sortedNotes.map(n => n.noteName).join(', ');
    return {
      status: 'uncertain',
      primaryChord: null,
      alternatives: [],
      activeNotes: sortedNotes,
      bassNote,
      description: `Analyzing: ${noteListStr}`,
    };
  }

  const primaryChord = uniqueCandidates[0];
  const alternatives = uniqueCandidates.slice(1, 4);

  return {
    status: 'chord-detected',
    primaryChord,
    alternatives,
    activeNotes: sortedNotes,
    bassNote,
    description: primaryChord.fullName,
  };
}
