import React, { useRef } from 'react';
import type { ActiveNoteInfo } from '../utils/musicTheory';
import { isBlackKey, midiToNoteName } from '../utils/musicTheory';

interface PianoKeyboardProps {
  activeNotes: ActiveNoteInfo[];
  startMidi?: number; // default C2 (36)
  endMidi?: number;   // default C7 (96) - 61 keys
  useFlats?: boolean;
  onKeyPlay?: (midiNote: number) => void;
  onKeyRelease?: (midiNote: number) => void;
  labelMode?: 'all' | 'active' | 'c-only';
  onRangePreset?: (start: number, end: number) => void;
  hintMidiNotes?: number[];
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeNotes,
  startMidi = 36, // C2
  endMidi = 96,   // C7 (61 keys standard)
  useFlats = false,
  onKeyPlay,
  onKeyRelease,
  labelMode = 'active',
  onRangePreset,
  hintMidiNotes = [],
}) => {
  const keyboardScrollRef = useRef<HTMLDivElement | null>(null);

  // Map active notes by MIDI number for O(1) lookup
  const activeNoteMap = new Map<number, ActiveNoteInfo>();
  for (const n of activeNotes) {
    activeNoteMap.set(n.midiNote, n);
  }

  const hintSet = new Set(hintMidiNotes);

  // Generate white keys and black keys in order
  const keys: Array<{ midi: number; isBlack: boolean; whiteIndex: number }> = [];
  let whiteCount = 0;

  for (let m = startMidi; m <= endMidi; m++) {
    const black = isBlackKey(m);
    keys.push({
      midi: m,
      isBlack: black,
      whiteIndex: black ? whiteCount : whiteCount++,
    });
  }

  // Handle key interaction (mouse / touch)
  const handlePointerDown = (midi: number) => {
    onKeyPlay?.(midi);
  };

  const handlePointerUp = (midi: number) => {
    onKeyRelease?.(midi);
  };

  const handleKeyDown = (e: React.KeyboardEvent, midi: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onKeyPlay?.(midi);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent, midi: number) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onKeyRelease?.(midi);
    }
  };

  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);

  return (
    <div
      className="studio-panel piano-panel"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      role="region"
      aria-label="Interactive Piano Keyboard"
    >
      {/* Keyboard Header & Range Presets */}
      <div className="studio-panel-header" style={{ marginBottom: 0, paddingBottom: '0.5rem' }}>
        <div className="studio-panel-title">
          <span style={{ fontSize: '1.1rem' }}>🎹</span>
          <span>Piano Keyboard ({endMidi - startMidi + 1} Keys)</span>
          {hintMidiNotes.length > 0 && (
            <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
              Hints Visible ({hintMidiNotes.length} Target Keys)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>Range:</span>
          {onRangePreset && (
            <>
              <button
                type="button"
                className={`btn btn-sm ${startMidi === 36 && endMidi === 59 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onRangePreset(36, 59)}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
              >
                Bass (C2–B3)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${startMidi === 48 && endMidi === 84 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onRangePreset(48, 84)}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
              >
                Mid (C3–C6)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${startMidi === 36 && endMidi === 96 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onRangePreset(36, 96)}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
              >
                Standard (61 Keys)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${startMidi === 21 && endMidi === 108 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onRangePreset(21, 108)}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
              >
                Grand (88 Keys)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Keyboard Bed Container (scrollable on mobile) */}
      <div
        ref={keyboardScrollRef}
        className="piano-scroll-container"
        style={{
          position: 'relative',
          width: '100%',
          overflowX: 'auto',
          paddingBottom: '8px',
          WebkitOverflowScrolling: 'touch',
          userSelect: 'none',
        }}
      >
        <div
          className="piano-bed"
          style={{
            position: 'relative',
            display: 'flex',
            minWidth: `${whiteKeys.length * 38}px`,
            height: '175px',
            background: '#0d1117',
            padding: '8px 12px 14px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8), 0 2px 10px rgba(0,0,0,0.5)',
            borderTop: '6px solid #1a202c', // Wood/felt fallboard edge
          }}
        >
          {/* Render White Keys */}
          {whiteKeys.map((k) => {
            const activeInfo = activeNoteMap.get(k.midi);
            const isActive = !!activeInfo;
            const isHint = hintSet.has(k.midi);
            const noteNameWithOctave = midiToNoteName(k.midi, { useFlats, includeOctave: true });
            const isCKey = k.midi % 12 === 0;

            const shouldShowLabel =
              isActive ||
              isHint ||
              labelMode === 'all' ||
              (labelMode === 'c-only' && isCKey);

            return (
              <button
                key={k.midi}
                id={`piano-key-${k.midi}`}
                type="button"
                role="button"
                aria-label={`Piano key ${noteNameWithOctave}`}
                aria-pressed={isActive}
                tabIndex={0}
                onPointerDown={() => handlePointerDown(k.midi)}
                onPointerUp={() => handlePointerUp(k.midi)}
                onPointerLeave={() => handlePointerUp(k.midi)}
                onKeyDown={(e) => handleKeyDown(e, k.midi)}
                onKeyUp={(e) => handleKeyUp(e, k.midi)}
                style={{
                  position: 'relative',
                  flex: '1 0 36px',
                  maxWidth: '44px',
                  height: '150px',
                  background: isActive
                    ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'
                    : isHint
                    ? 'linear-gradient(180deg, #fef3c7 0%, #fde68a 85%, #fcd34d 100%)'
                    : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 85%, #cbd5e1 100%)',
                  border: isActive
                    ? '1px solid #38bdf8'
                    : isHint
                    ? '2px solid #f59e0b'
                    : '1px solid #475569',
                  borderTop: 'none',
                  borderRadius: '0 0 5px 5px',
                  boxShadow: isActive
                    ? '0 0 20px rgba(56, 189, 248, 0.7), inset 0 -2px 6px rgba(0,0,0,0.4)'
                    : isHint
                    ? '0 0 16px rgba(245, 158, 11, 0.65), inset 0 -4px 6px rgba(245, 158, 11, 0.3)'
                    : 'inset 0 -6px 6px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.3)',
                  transform: isActive ? 'translateY(3px)' : 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  paddingBottom: '8px',
                  zIndex: 1,
                  transition: 'background 0.08s ease, transform 0.06s ease, border-color 0.1s ease',
                }}
              >
                {/* Target badge when hint is active */}
                {isHint && !isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      fontSize: '0.55rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '800',
                      background: '#f59e0b',
                      color: '#000000',
                      padding: '1px 3px',
                      borderRadius: '3px',
                    }}
                  >
                    TARGET
                  </span>
                )}

                {shouldShowLabel && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: isCKey ? '0.78rem' : '0.72rem',
                        fontWeight: isCKey || isActive || isHint ? '800' : '600',
                        color: isActive
                          ? '#ffffff'
                          : isHint
                          ? '#78350f'
                          : isCKey
                          ? '#0284c7'
                          : '#334155',
                      }}
                    >
                      {noteNameWithOctave}
                    </span>

                    {/* Confidence percentage for audio detections */}
                    {isActive && activeInfo.confidence !== undefined && activeInfo.confidence < 0.99 && (
                      <span
                        style={{
                          fontSize: '0.6rem',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fde68a',
                          padding: '1px 3px',
                          borderRadius: '3px',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {Math.round(activeInfo.confidence * 100)}%
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}

          {/* Render Black Keys Overlay */}
          {blackKeys.map((k) => {
            const activeInfo = activeNoteMap.get(k.midi);
            const isActive = !!activeInfo;
            const isHint = hintSet.has(k.midi);
            const noteNameWithOctave = midiToNoteName(k.midi, { useFlats, includeOctave: true });

            // Calculate precise X coordinate relative to white keys
            const offsetLeft = (k.whiteIndex / whiteKeys.length) * 100;
            const shouldShowLabel = isActive || isHint || labelMode === 'all';

            return (
              <button
                key={k.midi}
                id={`piano-key-${k.midi}`}
                type="button"
                role="button"
                aria-label={`Piano sharp key ${noteNameWithOctave}`}
                aria-pressed={isActive}
                tabIndex={0}
                onPointerDown={() => handlePointerDown(k.midi)}
                onPointerUp={() => handlePointerUp(k.midi)}
                onPointerLeave={() => handlePointerUp(k.midi)}
                onKeyDown={(e) => handleKeyDown(e, k.midi)}
                onKeyUp={(e) => handleKeyUp(e, k.midi)}
                style={{
                  position: 'absolute',
                  left: `calc(${offsetLeft}% - 12px)`,
                  width: '24px',
                  height: '98px',
                  background: isActive
                    ? 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)'
                    : isHint
                    ? 'linear-gradient(180deg, #78350f 0%, #92400e 60%, #b45309 100%)'
                    : 'linear-gradient(180deg, #1e293b 0%, #0f172a 60%, #020617 100%)',
                  border: isActive
                    ? '1px solid #fde68a'
                    : isHint
                    ? '2px solid #fbbf24'
                    : '1px solid #334155',
                  borderTop: 'none',
                  borderRadius: '0 0 4px 4px',
                  boxShadow: isActive
                    ? '0 0 18px rgba(245, 158, 11, 0.8), inset 0 2px 4px rgba(255,255,255,0.3)'
                    : isHint
                    ? '0 0 16px rgba(251, 191, 36, 0.75), inset 0 1px 3px rgba(255,255,255,0.3)'
                    : '0 4px 8px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.15)',
                  transform: isActive ? 'translateY(2px)' : 'none',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  paddingBottom: '6px',
                  zIndex: 2,
                  transition: 'background 0.08s ease, transform 0.06s ease, border-color 0.1s ease',
                }}
              >
                {/* Hint target marker */}
                {isHint && !isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      fontSize: '0.5rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '800',
                      background: '#fbbf24',
                      color: '#000000',
                      padding: '1px 2px',
                      borderRadius: '2px',
                    }}
                  >
                    ★
                  </span>
                )}

                {shouldShowLabel && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.62rem',
                      fontWeight: '700',
                      color: isActive ? '#ffffff' : isHint ? '#fde68a' : '#94a3b8',
                      lineHeight: 1,
                    }}
                  >
                    {noteNameWithOctave}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
