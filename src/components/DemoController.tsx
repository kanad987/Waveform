import React from 'react';
import { Sparkles, Music2 } from 'lucide-react';

interface DemoControllerProps {
  onPlayDemoChord: (midiNotes: number[], name: string) => void;
  onPlayDemoProgression: () => void;
  isPlayingDemo: boolean;
  onStopDemo: () => void;
}

export const DemoController: React.FC<DemoControllerProps> = ({
  onPlayDemoChord,
  onPlayDemoProgression,
  isPlayingDemo,
  onStopDemo,
}) => {
  const chords = [
    { name: 'C Major', notes: [60, 64, 67] },                   // C4, E4, G4
    { name: 'C Maj 7', notes: [60, 64, 67, 71] },               // C4, E4, G4, B4
    { name: 'A Minor 7', notes: [57, 60, 64, 67] },             // A3, C4, E4, G4
    { name: 'F♯ Minor 9', notes: [54, 57, 61, 64, 68] },        // F#3, A3, C#4, E4, G#4
    { name: 'G 7 (Dominant)', notes: [55, 59, 62, 65] },        // G3, B3, D4, F4
    { name: 'D Min 7 / F', notes: [53, 57, 62, 65] },           // F3, A3, D4, F4 (1st inv Dm7)
    { name: 'B Half-Dim 7', notes: [59, 62, 65, 69] },          // B3, D4, F4, A4 (Bm7b5)
    { name: 'E 7 sus4', notes: [52, 57, 59, 62] },              // E3, A3, B3, D4
  ];

  return (
    <div
      className="studio-panel demo-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        background: 'rgba(24, 30, 44, 0.45)',
      }}
    >
      <div className="studio-panel-header" style={{ marginBottom: 0, paddingBottom: '0.5rem' }}>
        <div className="studio-panel-title">
          <Sparkles size={18} style={{ color: 'var(--accent-amber)' }} />
          <span>Quick Sound & Chord Audition (Built-in Audio)</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isPlayingDemo ? (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={onStopDemo}
              style={{ padding: '0.25rem 0.65rem' }}
            >
              Stop Demo Sequence
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onPlayDemoProgression}
              style={{ padding: '0.25rem 0.65rem' }}
            >
              <Music2 size={13} style={{ marginRight: '4px' }} />
              Play Jazz Progression (ii - V - I)
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {chords.map((c) => (
          <button
            key={c.name}
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onPlayDemoChord(c.notes, c.name)}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
};
