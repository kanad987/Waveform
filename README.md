# Wavey — Real-Time Piano & Audio Visualizer

**Wavey** is a modern music-studio web application that listens to an electronic piano keyboard (via Web MIDI) or microphone audio (via Web Audio API) in real time. It visualizes the sound waves and frequency spectrum while identifying played notes and suggesting chord names.

---

## Key Features

### 1. Dual Real-Time Input Modes
- **MIDI Keyboard (`Web MIDI API`)**:
  - Direct hardware connectivity to USB/Bluetooth MIDI keyboards and digital pianos.
  - 100% confidence note-on/note-off tracking.
  - Zero false positives, immediate polyphonic key release and sustain tracking.
  - Built-in polyphonic acoustic piano synthesizer so keyboards without onboard speakers can be heard and visualized immediately.
- **Microphone & Line-In Audio (`Web Audio API`)**:
  - Select any connected microphone or audio interface.
  - High-resolution real-time FFT analysis (`fftSize` 4096 / 8192).
  - Time-domain autocorrelation (NSDF/YIN) for low-latency dominant pitch tracking.
  - Multi-pitch peak extraction with **harmonic cancellation** (suppresses overtones at $2f, 3f, 4f$ to prevent harmonics from masquerading as played notes).
  - Temporal smoothing & hysteresis to eliminate flickering.
  - Adjustable sensitivity and dynamic silence threshold / noise gate.

### 2. Studio Visualizations
- **Oscilloscope Waveform Display**:
  - High-DPI canvas with positive zero-crossing trigger stabilization.
  - Phosphor glow trace with real-time RMS signal level and peak dB meter.
  - Zoom in/out timebase controls and Live/Freeze display toggle.
- **Logarithmic Frequency Spectrum Analyzer**:
  - 30 Hz to 8 kHz audio frequency display scaled logarithmically to match human hearing.
  - Musical octave reference ticks (C2, C3, C4, A4=440Hz, C5, C6, C7).
  - Vertical glowing beacon highlights over bins matching active notes.
  - Toggle between logarithmic bar columns and smooth curve mode.

### 3. Interactive Piano Keyboard
- **Responsive 61-Key & 88-Key Bed**:
  - Default 61-key electronic keyboard range (C2 to C7) with quick range view presets:
    - *Bass* (C2–B3)
    - *Mid* (C3–C6)
    - *Standard* (C2–C7, 61 keys)
    - *Grand* (A0–C8, 88 keys)
  - Realistic white and black keys with tactile depression animations.
  - Active keys glow with neon accents and display note names, octaves, and audio confidence metrics.
  - Fully interactive: playable via mouse, touch, or keyboard navigation.

### 4. Harmonic & Chord Detection Engine
- Detects single notes, dyad intervals, triads, 7th chords, 6th chords, and extended chords:
  - Major, Minor, Diminished, Augmented, Sus2, Sus4
  - Dominant 7th, Major 7th, Minor 7th, Half-Diminished (m7♭5), Diminished 7th, m(maj7), 7sus4
  - Major 6th, Minor 6th, Add9, Dominant 9th, Major 9th, Minor 9th
- Inversion detection (Root position, 1st inversion, 2nd inversion, slash chords like `C/E` or `G/B`).
- Alternative chord suggestions when ambiguous (e.g. `Am7` vs `C6`).
- Confidence ratings: High Confidence, Estimated, or Low/Uncertain.

### 5. Progression History Log
- Automatic logging of played chords held for >350ms with timestamps and individual note spellings.
- One-click replay of past chords from history.
- Clear log button.

### 6. Studio Settings & Customization
- **A4 Tuning Reference**: 415 Hz (Baroque), 432 Hz (Verdi), 440 Hz (Concert Standard), 442 Hz (European), adjustable from 415 Hz to 466 Hz.
- **Microphone Sensitivity**: 30% to 200%.
- **Silence Gate Threshold**: -75 dB to -40 dB.
- **Accidental Preference**: Sharp (♯) vs Flat (♭) notation.
- **Internal Synthesizer**: Audio volume control and mute toggle.
- **FFT Size**: 2048, 4096, 8192 bins.

### 7. Privacy & Security
- 100% in-browser processing. No audio is ever recorded, uploaded, or transmitted across the network.
- Hardware microphone tracks are immediately stopped when pausing or stopping analysis.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production
```bash
npm run build
```
The optimized bundle will be created in the `dist/` directory.

### Linting
```bash
npm run lint
```
