/**
 * Piano Academy Curriculum Data
 * Structured progressive lessons teaching:
 * Chapter 1: Piano ABCDs (Musical Alphabet & Finding Notes)
 * Chapter 2: First Chords (Major & Minor Triads for A through G)
 * Chapter 3: The Magic of 7ths (Complete 7th Chords: Dom7, Maj7, Min7, m7b5, dim7)
 */

export interface AcademyLesson {
  id: string;
  chapterId: 1 | 2 | 3;
  title: string;
  subtitle: string;
  targetMidiNotes: number[]; // Exact default MIDI keys (e.g. [60, 64, 67] for C4-E4-G4)
  targetPitchClasses: number[]; // Pitch classes (0-11) for octave-agnostic matching
  targetSymbol?: string;
  noteNames: string[]; // e.g. ['C', 'E', 'G']
  formulaText: string;
  soundMood: string;
  waveformInsight: string;
  fingerGuide?: string;
  hintExplanation: string;
}

export interface AcademyChapter {
  id: 1 | 2 | 3;
  number: number;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  lessons: AcademyLesson[];
}

export const ACADEMY_CHAPTERS: AcademyChapter[] = [
  // CHAPTER 1: PIANO ABCDs
  {
    id: 1,
    number: 1,
    title: 'The Piano ABCDs',
    subtitle: 'The Musical Alphabet & Finding Keys',
    badge: 'Beginner',
    description:
      'Learn the 7 white keys of the musical alphabet (A, B, C, D, E, F, G) and observe how pitch changes your sine wave.',
    lessons: [
      {
        id: 'c1-c',
        chapterId: 1,
        title: 'Middle C (The Home Key)',
        subtitle: 'The starting anchor of all piano music',
        targetMidiNotes: [60],
        targetPitchClasses: [0],
        noteNames: ['C'],
        formulaText: 'Single Note • 261.6 Hz',
        soundMood: 'Calm, grounded, pure',
        waveformInsight: 'Look at the oscilloscope! Middle C creates a perfectly smooth fundamental sine wave.',
        fingerGuide: 'Right Hand Thumb (Finger 1)',
        hintExplanation: 'Find the group of 2 black keys. C is the white key directly to their left.',
      },
      {
        id: 'c1-d',
        chapterId: 1,
        title: 'Note D (In the Doghouse)',
        subtitle: 'Right between the two black keys',
        targetMidiNotes: [62],
        targetPitchClasses: [2],
        noteNames: ['D'],
        formulaText: 'Single Note • 293.7 Hz',
        soundMood: 'Expectant, stepping upward',
        waveformInsight: 'Notice how the wave cycles get slightly tighter (higher frequency) than C!',
        fingerGuide: 'Right Hand Index (Finger 2)',
        hintExplanation: 'D is nestled right in the middle between the 2 black keys.',
      },
      {
        id: 'c1-e',
        chapterId: 1,
        title: 'Note E (Elephant Step)',
        subtitle: 'Right of the two black keys',
        targetMidiNotes: [64],
        targetPitchClasses: [4],
        noteNames: ['E'],
        formulaText: 'Single Note • 329.6 Hz',
        soundMood: 'Bright, warm, singing',
        waveformInsight: 'At 330 Hz, each vibration cycle is faster, showing narrower sine waves.',
        fingerGuide: 'Right Hand Middle (Finger 3)',
        hintExplanation: 'E is the white key just to the right of the 2 black keys.',
      },
      {
        id: 'c1-f',
        chapterId: 1,
        title: 'Note F (Front of Three)',
        subtitle: 'Left of the 3 black keys',
        targetMidiNotes: [65],
        targetPitchClasses: [5],
        noteNames: ['F'],
        formulaText: 'Single Note • 349.2 Hz',
        soundMood: 'Open, foundational',
        waveformInsight: 'Only a half-step above E! Notice how close their frequencies are.',
        fingerGuide: 'Right Hand Thumb (Finger 1)',
        hintExplanation: 'Find the group of 3 black keys. F is the white key directly to their left.',
      },
      {
        id: 'c1-g',
        chapterId: 1,
        title: 'Note G (Grand Note)',
        subtitle: 'Inside the three black keys',
        targetMidiNotes: [67],
        targetPitchClasses: [7],
        noteNames: ['G'],
        formulaText: 'Single Note • 392.0 Hz',
        soundMood: 'Strong, resolute, resonant',
        waveformInsight: 'G is the perfect 5th above C. In music, C and G are harmonic best friends!',
        fingerGuide: 'Right Hand Middle (Finger 3) or Pinky (Finger 5)',
        hintExplanation: 'G sits between the first two black keys of the 3-black-key group.',
      },
      {
        id: 'c1-a',
        chapterId: 1,
        title: 'Note A (The Concert Pitch)',
        subtitle: 'Universal tuning benchmark at 440 Hz',
        targetMidiNotes: [69],
        targetPitchClasses: [9],
        noteNames: ['A'],
        formulaText: 'Single Note • 440.0 Hz (A4 Standard)',
        soundMood: 'Crisp, brilliant, legendary',
        waveformInsight: 'A4 vibrates exactly 440 times per second! Compare your wave to the Sine Guide.',
        fingerGuide: 'Right Hand Ring (Finger 4)',
        hintExplanation: 'A sits between the second and third black keys of the 3-black-key group.',
      },
      {
        id: 'c1-b',
        chapterId: 1,
        title: 'Note B (The Leading Edge)',
        subtitle: 'Right of the three black keys, leads into next C',
        targetMidiNotes: [71],
        targetPitchClasses: [11],
        noteNames: ['B'],
        formulaText: 'Single Note • 493.9 Hz',
        soundMood: 'Tense, pulling urgently upward to C',
        waveformInsight: 'Fast vibrations near 500 Hz! You are at the top of the octave alphabet.',
        fingerGuide: 'Right Hand Pinky (Finger 5)',
        hintExplanation: 'B is the white key to the right of the 3 black keys, right before the next C.',
      },
    ],
  },

  // CHAPTER 2: FIRST CHORDS (TRIADS)
  {
    id: 2,
    number: 2,
    title: 'First Chords — Major & Minor',
    subtitle: 'Building 3-Note Harmonies Across A to G',
    badge: 'Intermediate',
    description:
      'Stack 3 notes (Root, 3rd, 5th) to create chords. Discover the emotional contrast between Happy Major and Reflective Minor.',
    lessons: [
      {
        id: 'c2-c-maj',
        chapterId: 2,
        title: 'C Major Triad',
        subtitle: 'The universal foundational chord',
        targetMidiNotes: [60, 64, 67], // C4, E4, G4
        targetPitchClasses: [0, 4, 7],
        targetSymbol: 'C',
        noteNames: ['C', 'E', 'G'],
        formulaText: 'Root + Major 3rd + 5th (Skip a key shape)',
        soundMood: 'Joyful, sunny, triumphant',
        waveformInsight: 'Watch the 3 sine waves combine into a rich, undulating acoustic waveform!',
        fingerGuide: 'Thumb (C4) • Middle (E4) • Pinky (G4)',
        hintExplanation: 'Press white keys C, E, and G together. Notice you skip every other white key!',
      },
      {
        id: 'c2-a-min',
        chapterId: 2,
        title: 'A Minor Triad',
        subtitle: 'The emotional relative of C Major',
        targetMidiNotes: [57, 60, 64], // A3, C4, E4
        targetPitchClasses: [9, 0, 4],
        targetSymbol: 'Am',
        noteNames: ['A', 'C', 'E'],
        formulaText: 'Root + Minor 3rd + 5th',
        soundMood: 'Mysterious, soulful, storytelling',
        waveformInsight: 'The minor 3rd interval alters the wave symmetry, creating a warm darker texture.',
        fingerGuide: 'Thumb (A3) • Middle (C4) • Pinky (E4)',
        hintExplanation: 'Find A, then skip a key to C, then skip a key to E. All white keys!',
      },
      {
        id: 'c2-g-maj',
        chapterId: 2,
        title: 'G Major Triad',
        subtitle: 'Bright, bold energy',
        targetMidiNotes: [55, 59, 62], // G3, B3, D4
        targetPitchClasses: [7, 11, 2],
        targetSymbol: 'G',
        noteNames: ['G', 'B', 'D'],
        formulaText: 'Root + Major 3rd + 5th',
        soundMood: 'Heroic, proud, celebratory',
        waveformInsight: 'Strong harmonic reinforcement produces clear regular peaks in the oscilloscope.',
        fingerGuide: 'Thumb (G) • Middle (B) • Pinky (D)',
        hintExplanation: 'Press white keys G, B, and D together.',
      },
      {
        id: 'c2-f-maj',
        chapterId: 2,
        title: 'F Major Triad',
        subtitle: 'Gentle, floating, peaceful',
        targetMidiNotes: [53, 57, 60], // F3, A3, C4
        targetPitchClasses: [5, 9, 0],
        targetSymbol: 'F',
        noteNames: ['F', 'A', 'C'],
        formulaText: 'Root + Major 3rd + 5th',
        soundMood: 'Warm, comforting, pastoral',
        waveformInsight: 'The F-A-C harmonic superposition creates a calm, soothing wave curve.',
        fingerGuide: 'Thumb (F) • Middle (A) • Pinky (C)',
        hintExplanation: 'Press white keys F, A, and C together.',
      },
      {
        id: 'c2-d-min',
        chapterId: 2,
        title: 'D Minor Triad',
        subtitle: 'The brooding, adventurous chord',
        targetMidiNotes: [62, 65, 69], // D4, F4, A4
        targetPitchClasses: [2, 5, 9],
        targetSymbol: 'Dm',
        noteNames: ['D', 'F', 'A'],
        formulaText: 'Root + Minor 3rd + 5th',
        soundMood: 'Dramatic, cinematic, solemn',
        waveformInsight: 'Notice how cleanly D-F-A blends in the frequency spectrum.',
        fingerGuide: 'Thumb (D4) • Middle (F4) • Pinky (A4)',
        hintExplanation: 'Press white keys D, F, and A together.',
      },
      {
        id: 'c2-e-min',
        chapterId: 2,
        title: 'E Minor Triad',
        subtitle: 'Quiet contemplation',
        targetMidiNotes: [64, 67, 71], // E4, G4, B4
        targetPitchClasses: [4, 7, 11],
        targetSymbol: 'Em',
        noteNames: ['E', 'G', 'B'],
        formulaText: 'Root + Minor 3rd + 5th',
        soundMood: 'Introspective, gentle, twilight',
        waveformInsight: 'High minor triad produces fine rhythmic oscillations in the wave trace.',
        fingerGuide: 'Thumb (E) • Middle (G) • Pinky (B)',
        hintExplanation: 'Press white keys E, G, and B together.',
      },
      {
        id: 'c2-d-maj',
        chapterId: 2,
        title: 'D Major Triad (First Black Key!)',
        subtitle: 'Welcome to the black keys: F♯',
        targetMidiNotes: [62, 66, 69], // D4, F#4, A4
        targetPitchClasses: [2, 6, 9],
        targetSymbol: 'D',
        noteNames: ['D', 'F♯', 'A'],
        formulaText: 'Root (D) + Major 3rd (F♯) + 5th (A)',
        soundMood: 'Vibrant, brilliant, royal',
        waveformInsight: 'The sharp note raises the middle wave frequency to create that radiant major spark!',
        fingerGuide: 'Thumb (D4) • Middle on Black Key (F♯4) • Pinky (A4)',
        hintExplanation: 'Press D, the black key F♯ (first of the 3 black keys), and A.',
      },
    ],
  },

  // CHAPTER 3: THE MAGIC OF 7THS
  {
    id: 3,
    number: 3,
    title: 'The Magic of 7ths',
    subtitle: 'Complete 7th Chords: Dom7, Maj7, Min7, m7♭5 & °7',
    badge: 'Advanced & Jazz',
    description:
      'Add the 4th note (the 7th) to unlock lush, bluesy, and dramatic harmonies across all notes A through G.',
    lessons: [
      {
        id: 'c3-c7',
        chapterId: 3,
        title: 'C Dominant 7th (C7)',
        subtitle: 'The essential blues & rock 7th chord',
        targetMidiNotes: [60, 64, 67, 70], // C4, E4, G4, Bb4
        targetPitchClasses: [0, 4, 7, 10],
        targetSymbol: 'C7',
        noteNames: ['C', 'E', 'G', 'B♭'],
        formulaText: 'C Major Triad + Flat 7th (B♭)',
        soundMood: 'Bluesy, energetic, urging resolution to F',
        waveformInsight:
          'The tritone between E and B♭ creates a rich, energetic acoustic beat wave in the oscilloscope!',
        fingerGuide: 'Thumb (C) • Index (E) • Middle (G) • Pinky on Black Key (B♭)',
        hintExplanation: 'Play C major (C-E-G) and add the black key B♭ (the 3rd black key of the group of 3).',
      },
      {
        id: 'c3-g7',
        chapterId: 3,
        title: 'G Dominant 7th (G7)',
        subtitle: 'The most famous 7th chord in classical and pop',
        targetMidiNotes: [55, 59, 62, 65], // G3, B3, D4, F4
        targetPitchClasses: [7, 11, 2, 5],
        targetSymbol: 'G7',
        noteNames: ['G', 'B', 'D', 'F'],
        formulaText: 'G Major Triad + Minor 7th (F) • All White Keys!',
        soundMood: 'Tense, playful, longing to return home to C',
        waveformInsight: 'Four acoustic sinusoids produce a classic rhythmic envelope interference pattern.',
        fingerGuide: 'Thumb (G) • Index (B) • Ring (D) • Pinky (F)',
        hintExplanation: 'All white keys! Press G, B, D, and F all together.',
      },
      {
        id: 'c3-cmaj7',
        chapterId: 3,
        title: 'C Major 7th (Cmaj7)',
        subtitle: 'The lush, dreamy, romantic jazz chord',
        targetMidiNotes: [60, 64, 67, 71], // C4, E4, G4, B4
        targetPitchClasses: [0, 4, 7, 11],
        targetSymbol: 'Cmaj7',
        noteNames: ['C', 'E', 'G', 'B'],
        formulaText: 'C Major Triad + Natural Major 7th (B)',
        soundMood: 'Dreamy, peaceful, sophisticated, warm sunset',
        waveformInsight:
          'The half-step clash between high B and C creates subtle acoustic shimmering waves.',
        fingerGuide: 'Thumb (C4) • Index (E4) • Middle (G4) • Pinky (B4)',
        hintExplanation: 'Play white keys C, E, G, and B. Notice all 4 notes are consecutive white skips!',
      },
      {
        id: 'c3-fmaj7',
        chapterId: 3,
        title: 'F Major 7th (Fmaj7)',
        subtitle: 'Floating through the clouds',
        targetMidiNotes: [53, 57, 60, 64], // F3, A3, C4, E4
        targetPitchClasses: [5, 9, 0, 4],
        targetSymbol: 'Fmaj7',
        noteNames: ['F', 'A', 'C', 'E'],
        formulaText: 'F Major Triad + Major 7th (E)',
        soundMood: 'Nostalgic, gentle, luminous',
        waveformInsight: 'Harmonically stable waveform with rich resonant bass.',
        fingerGuide: 'Thumb (F) • Index (A) • Middle (C) • Pinky (E)',
        hintExplanation: 'All white keys: F, A, C, and E held simultaneously.',
      },
      {
        id: 'c3-amin7',
        chapterId: 3,
        title: 'A Minor 7th (Am7)',
        subtitle: 'Smooth, soulful, cafe jazz staple',
        targetMidiNotes: [57, 60, 64, 67], // A3, C4, E4, G4
        targetPitchClasses: [9, 0, 4, 7],
        targetSymbol: 'Am7',
        noteNames: ['A', 'C', 'E', 'G'],
        formulaText: 'A Minor Triad + Minor 7th (G)',
        soundMood: 'Melancholy yet comforting, effortless groove',
        waveformInsight: 'Shares all 4 notes with C6! Notice how the chord detector shows C6 as an alternative.',
        fingerGuide: 'Thumb (A) • Index (C) • Middle (E) • Pinky (G)',
        hintExplanation: 'All white keys: A, C, E, and G held together.',
      },
      {
        id: 'c3-dmin7',
        chapterId: 3,
        title: 'D Minor 7th (Dm7)',
        subtitle: 'The classic ii chord in jazz progressions',
        targetMidiNotes: [50, 53, 57, 60], // D3, F3, A3, C4
        targetPitchClasses: [2, 5, 9, 0],
        targetSymbol: 'Dm7',
        noteNames: ['D', 'F', 'A', 'C'],
        formulaText: 'D Minor Triad + Minor 7th (C)',
        soundMood: 'Cool, nighttime city vibe, elegant tension',
        waveformInsight: 'Balanced minor 7th harmonics with smooth, symmetrical oscilloscope cycles.',
        fingerGuide: 'Thumb (D) • Index (F) • Ring (A) • Pinky (C)',
        hintExplanation: 'All white keys: D, F, A, and C.',
      },
      {
        id: 'c3-bm7b5',
        chapterId: 3,
        title: 'B Half-Diminished 7th (Bm7♭5)',
        subtitle: 'The mysterious film-noir chord (Minor 7 Flat 5)',
        targetMidiNotes: [59, 62, 65, 69], // B3, D4, F4, A4
        targetPitchClasses: [11, 2, 5, 9],
        targetSymbol: 'Bm7♭5',
        noteNames: ['B', 'D', 'F', 'A'],
        formulaText: 'Diminished Triad (B-D-F) + Minor 7th (A)',
        soundMood: 'Mysterious, suspenseful, yearning',
        waveformInsight: 'The diminished 5th (tritone) produces intriguing jagged acoustic harmonics.',
        fingerGuide: 'Thumb (B) • Index (D) • Middle (F) • Pinky (A)',
        hintExplanation: 'All white keys: B, D, F, and A held together.',
      },
      {
        id: 'c3-cdim7',
        chapterId: 3,
        title: 'C Diminished 7th (C°7)',
        subtitle: 'Maximum drama & suspense (Silent movie villain!)',
        targetMidiNotes: [60, 63, 66, 69], // C4, Eb4, F#4, A4
        targetPitchClasses: [0, 3, 6, 9],
        targetSymbol: 'C°7',
        noteNames: ['C', 'E♭', 'F♯', 'A'],
        formulaText: 'Stacked Minor 3rds: Root + m3 + dim5 + dim7',
        soundMood: 'Shocking, dramatic, breathless mystery',
        waveformInsight:
          'A perfectly symmetrical chord! Every note is 3 semitones apart, creating fascinating complex beating.',
        fingerGuide: 'Thumb (C) • Index (E♭) • Ring (F♯) • Pinky (A)',
        hintExplanation: 'Press white key C, black key E♭, black key F♯, and white key A.',
      },
    ],
  },
];
