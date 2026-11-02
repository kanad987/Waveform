import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { SpectrumVisualizer } from './components/SpectrumVisualizer';
import { PianoKeyboard } from './components/PianoKeyboard';
import { ChordDisplay } from './components/ChordDisplay';
import type { HistoryItem } from './components/ChordHistory';
import { ChordHistory } from './components/ChordHistory';
import { DemoController } from './components/DemoController';
import { SettingsModal } from './components/SettingsModal';
import { audioEngine } from './utils/audioAnalyzer';
import type { AudioAnalysisFrame } from './utils/audioAnalyzer';
import { midiManager } from './utils/midiManager';
import type { MidiDeviceOption } from './utils/midiManager';
import { pianoSynth } from './utils/pianoSynth';
import { detectChord } from './utils/chordDetector';
import type { ChordDetectionResult } from './utils/chordDetector';
import type { ActiveNoteInfo } from './utils/musicTheory';
import { createActiveNote } from './utils/musicTheory';

export function App() {
  // Check MIDI support directly during initial state
  const [midiSupported] = useState<boolean>(() => midiManager.isSupported());

  // Input mode & transport state
  const [inputMode, setInputMode] = useState<'midi' | 'mic'>(() =>
    midiManager.isSupported() ? 'midi' : 'mic'
  );
  const [isListening, setIsListening] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Device options
  const [midiDevices, setMidiDevices] = useState<MidiDeviceOption[]>([]);
  const [selectedMidiId, setSelectedMidiId] = useState<string>('all');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [a4Tuning, setA4Tuning] = useState<number>(440);
  const [sensitivity, setSensitivity] = useState<number>(1.0);
  const [noiseGateDb, setNoiseGateDb] = useState<number>(-60);
  const [useFlats, setUseFlats] = useState<boolean>(false);
  const [synthVolume, setSynthVolume] = useState<number>(0.6);
  const [synthEnabled, setSynthEnabled] = useState<boolean>(true);
  const [fftSize, setFftSize] = useState<number>(4096);

  // Piano View Range (default 61 keys: C2=36 to C7=96)
  const [pianoRange, setPianoRange] = useState<{ start: number; end: number }>({
    start: 36,
    end: 96,
  });

  // Active sounding notes & chord results
  const [activeNotes, setActiveNotes] = useState<ActiveNoteInfo[]>([]);
  const [chordResult, setChordResult] = useState<ChordDetectionResult>(() =>
    detectChord([])
  );

  // Visualizer frames (updated at high-performance rate)
  const [visFrame, setVisFrame] = useState<{
    timeDomainData: Float32Array;
    frequencyData: Float32Array;
    rms: number;
    peakDb: number;
    isSilent: boolean;
    dominantFreq: number | null;
  }>({
    timeDomainData: new Float32Array(0),
    frequencyData: new Float32Array(0),
    rms: 0,
    peakDb: -100,
    isSilent: true,
    dominantFreq: null,
  });

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const lastChordRef = useRef<string>('');
  const lastChordTimeRef = useRef<number>(0);

  // Demo playback state
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);
  const demoTimerRef = useRef<number | null>(null);

  // Animation frame loop reference
  const animationFrameId = useRef<number | null>(null);

  // Helper to record significant chords into history
  const checkAndRecordHistory = useCallback(
    (result: ChordDetectionResult, source: 'midi' | 'audio' | 'demo') => {
      if (!result.primaryChord) return;

      const chordName = result.primaryChord.symbolName;
      const now = performance.now();

      // Only add to history if chord is held for at least 350ms or is different from previous
      if (chordName !== lastChordRef.current && now - lastChordTimeRef.current > 350) {
        lastChordRef.current = chordName;
        lastChordTimeRef.current = now;

        const timeStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const newItem: HistoryItem = {
          id: `${now}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: timeStr,
          chordName: result.primaryChord.symbolName,
          notes: result.activeNotes.map((n) => n.noteName),
          confidence: result.primaryChord.confidence,
          source,
          candidate: result.primaryChord,
        };

        setHistory((prev) => [newItem, ...prev.slice(0, 24)]);
      }
    },
    []
  );

  // Update audio analyzer and synth settings whenever state changes
  useEffect(() => {
    audioEngine.setConfig({
      a4Tuning,
      sensitivity,
      noiseGateDb,
      useFlats,
      fftSize,
    });
    midiManager.setA4Tuning(a4Tuning);
    midiManager.setUseFlats(useFlats);
    midiManager.setSynthEnabled(synthEnabled);
    pianoSynth.setVolume(synthVolume);
    pianoSynth.setEnabled(synthEnabled);
    pianoSynth.setTuning(a4Tuning);
  }, [a4Tuning, sensitivity, noiseGateDb, useFlats, fftSize, synthEnabled, synthVolume]);

  // Subscribe to MIDI manager notes
  useEffect(() => {
    if (inputMode === 'midi') {
      const unsubscribe = midiManager.subscribe((midiNotes) => {
        setActiveNotes(midiNotes);
        const result = detectChord(midiNotes, { useFlats });
        setChordResult(result);
        checkAndRecordHistory(result, 'midi');
      });
      return () => unsubscribe();
    }
  }, [inputMode, useFlats, checkAndRecordHistory]);

  // Real-time audio analysis loop
  useEffect(() => {
    if (!isListening) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }

    const runLoop = () => {
      const frame: AudioAnalysisFrame = audioEngine.analyzeFrame();

      setVisFrame({
        timeDomainData: frame.timeDomainData,
        frequencyData: frame.frequencyData,
        rms: frame.rms,
        peakDb: frame.peakDb,
        isSilent: frame.isSilent,
        dominantFreq: frame.dominantFrequency,
      });

      // In microphone mode, update detected notes and chord recognition from audio
      if (inputMode === 'mic') {
        setActiveNotes(frame.detectedNotes);
        const result = detectChord(frame.detectedNotes, { useFlats });
        setChordResult(result);

        if (!frame.isSilent && result.primaryChord) {
          checkAndRecordHistory(result, 'audio');
        }
      }

      animationFrameId.current = requestAnimationFrame(runLoop);
    };

    animationFrameId.current = requestAnimationFrame(runLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isListening, inputMode, useFlats, checkAndRecordHistory]);

  // Cleanup on unmount (ensure microphone track stops!)
  useEffect(() => {
    return () => {
      audioEngine.stopMicrophone();
      midiManager.disconnect();
      pianoSynth.stopAll();
      if (demoTimerRef.current) {
        clearTimeout(demoTimerRef.current);
      }
    };
  }, []);

  // Handle Start Analysis
  const handleStartListening = async () => {
    setErrorMessage(null);

    if (inputMode === 'mic') {
      const res = await audioEngine.startMicrophone(selectedAudioDeviceId || undefined);
      if (!res.success) {
        setErrorMessage(
          res.error ||
            'Could not access microphone. Please grant permission in your browser.'
        );
        setIsListening(false);
        return;
      }
      setIsListening(true);
    } else {
      // MIDI mode
      await audioEngine.enableMidiOrSynthMode('midi');
      const res = await midiManager.requestAccess();
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to connect to Web MIDI.');
        setIsListening(false);
        return;
      }
      setMidiDevices(res.devices);
      setIsListening(true);
    }
  };

  // Handle Stop Analysis (stops mic tracks and clears held notes)
  const handleStopListening = () => {
    if (inputMode === 'mic') {
      audioEngine.stopMicrophone();
    }
    midiManager.clearAllNotes();
    pianoSynth.stopAll();
    setIsListening(false);
  };

  // Handle Input Mode Switch
  const handleInputModeChange = async (newMode: 'midi' | 'mic') => {
    if (newMode === inputMode) return;
    setErrorMessage(null);

    // Stop current source
    if (isListening) {
      if (inputMode === 'mic') {
        audioEngine.stopMicrophone();
      }
      midiManager.clearAllNotes();
      pianoSynth.stopAll();
    }

    setInputMode(newMode);

    if (newMode === 'mic') {
      const devices = await audioEngine.getAudioInputDevices();
      setAudioDevices(devices);
      if (isListening) {
        const res = await audioEngine.startMicrophone(selectedAudioDeviceId || undefined);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to start microphone.');
          setIsListening(false);
        }
      }
    } else {
      // MIDI Mode
      await audioEngine.enableMidiOrSynthMode('midi');
      if (midiSupported) {
        const res = await midiManager.requestAccess();
        if (res.success) {
          setMidiDevices(res.devices);
        } else if (isListening) {
          setErrorMessage(res.error || 'Could not connect to MIDI.');
        }
      }
    }
  };

  // Handle Clear
  const handleClear = () => {
    midiManager.clearAllNotes();
    audioEngine.clearNotes();
    pianoSynth.stopAll();
    setActiveNotes([]);
    setChordResult(detectChord([]));
    lastChordRef.current = '';
  };

  // Handle interactive on-screen key click
  const handleKeyPlay = async (midiNote: number) => {
    await audioEngine.ensureContext();
    midiManager.noteOn(midiNote, 100, 'ui');
    if (!isListening) {
      setIsListening(true);
    }
  };

  const handleKeyRelease = (midiNote: number) => {
    midiManager.noteOff(midiNote);
  };

  // Play a demo chord
  const handlePlayDemoChord = async (midiNotes: number[], _name?: string) => {
    await audioEngine.ensureContext();
    if (!isListening) {
      setIsListening(true);
    }

    // Stop existing notes
    midiManager.clearAllNotes();

    // Trigger each note in chord
    midiNotes.forEach((m) => {
      midiManager.noteOn(m, 105, 'ui');
    });

    const notesInfo = midiNotes.map((m) =>
      createActiveNote(m, 'ui', { a4: a4Tuning, useFlats })
    );
    const result = detectChord(notesInfo, { useFlats });
    setChordResult(result);
    checkAndRecordHistory(result, 'demo');

    // Auto-release after 1.8 seconds
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    demoTimerRef.current = window.setTimeout(() => {
      midiManager.clearAllNotes();
    }, 1800);
  };

  // Play a full jazz progression demo (ii - V - I - vi)
  const handlePlayDemoProgression = async () => {
    await audioEngine.ensureContext();
    if (!isListening) setIsListening(true);
    setIsPlayingDemo(true);

    const progression = [
      { name: 'D Minor 7', notes: [50, 57, 60, 62, 65] }, // Dm7
      { name: 'G Dominant 7', notes: [55, 59, 62, 65] },    // G7
      { name: 'C Major 7', notes: [48, 55, 60, 64, 67, 71] }, // Cmaj7
      { name: 'A Minor 7', notes: [45, 57, 60, 64, 67] }, // Am7
    ];

    let step = 0;
    const playStep = () => {
      if (step >= progression.length) {
        midiManager.clearAllNotes();
        setIsPlayingDemo(false);
        return;
      }

      const item = progression[step];
      midiManager.clearAllNotes();
      item.notes.forEach((m) => midiManager.noteOn(m, 100, 'ui'));

      const notesInfo = item.notes.map((m) =>
        createActiveNote(m, 'ui', { a4: a4Tuning, useFlats })
      );
      const result = detectChord(notesInfo, { useFlats });
      setChordResult(result);
      checkAndRecordHistory(result, 'demo');

      step++;
      demoTimerRef.current = window.setTimeout(playStep, 1500);
    };

    playStep();
  };

  const handleStopDemo = () => {
    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
    midiManager.clearAllNotes();
    setIsPlayingDemo(false);
  };

  return (
    <div className="app-container">
      {/* Studio Header & Transport Controls */}
      <Header
        inputMode={inputMode}
        onInputModeChange={handleInputModeChange}
        isListening={isListening}
        onStartListening={handleStartListening}
        onStopListening={handleStopListening}
        onClear={handleClear}
        midiSupported={midiSupported}
        midiDevices={midiDevices}
        selectedMidiId={selectedMidiId}
        onSelectMidiDevice={(id) => {
          setSelectedMidiId(id);
          midiManager.selectDevice(id);
        }}
        audioDevices={audioDevices}
        selectedAudioDeviceId={selectedAudioDeviceId}
        onSelectAudioDevice={setSelectedAudioDeviceId}
        onOpenSettings={() => setIsSettingsOpen(true)}
        errorMessage={errorMessage}
        onDismissError={() => setErrorMessage(null)}
        synthEnabled={synthEnabled}
        onToggleSynth={() => setSynthEnabled((prev) => !prev)}
      />

      {/* Main Studio Viewport */}
      <main className="main-content">
        {/* Prominent Harmonic Analysis & Hero Chord Display */}
        <ChordDisplay
          chordResult={chordResult}
          inputSource={inputMode}
          isListening={isListening}
        />

        {/* Real-Time Visualizers: Waveform & Spectrum Grids */}
        <div className="visualizers-grid">
          <WaveformVisualizer
            timeDomainData={visFrame.timeDomainData}
            rms={visFrame.rms}
            peakDb={visFrame.peakDb}
            isSilent={visFrame.isSilent}
            isListening={isListening}
          />

          <SpectrumVisualizer
            frequencyData={visFrame.frequencyData}
            sampleRate={audioEngine.getContext()?.sampleRate || 44100}
            activeNotes={activeNotes}
            dominantFreq={visFrame.dominantFreq}
            isListening={isListening}
          />
        </div>

        {/* Interactive Piano Keyboard Bed */}
        <PianoKeyboard
          activeNotes={activeNotes}
          startMidi={pianoRange.start}
          endMidi={pianoRange.end}
          useFlats={useFlats}
          onKeyPlay={handleKeyPlay}
          onKeyRelease={handleKeyRelease}
          labelMode="active"
          onRangePreset={(start, end) => setPianoRange({ start, end })}
        />

        {/* Quick Audition & Chord Progression Tester */}
        <DemoController
          onPlayDemoChord={handlePlayDemoChord}
          onPlayDemoProgression={handlePlayDemoProgression}
          isPlayingDemo={isPlayingDemo}
          onStopDemo={handleStopDemo}
        />

        {/* Progression & Chord Detection History Strip */}
        <ChordHistory
          history={history}
          onClear={() => setHistory([])}
          onPlayItem={(item) => {
            if (item.candidate) {
              const notes = item.candidate.formula.intervals.map(
                (iv) => item.candidate!.rootPitchClass + iv + 60
              );
              handlePlayDemoChord(notes, item.chordName);
            }
          }}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        a4Tuning={a4Tuning}
        onA4Change={setA4Tuning}
        sensitivity={sensitivity}
        onSensitivityChange={setSensitivity}
        noiseGateDb={noiseGateDb}
        onNoiseGateChange={setNoiseGateDb}
        useFlats={useFlats}
        onUseFlatsChange={setUseFlats}
        synthVolume={synthVolume}
        onSynthVolumeChange={setSynthVolume}
        synthEnabled={synthEnabled}
        onSynthEnabledChange={setSynthEnabled}
        fftSize={fftSize}
        onFftSizeChange={setFftSize}
      />
    </div>
  );
}

export default App;
