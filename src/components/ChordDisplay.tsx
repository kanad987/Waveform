import React from 'react';
import { Music, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import type { ChordDetectionResult } from '../utils/chordDetector';

interface ChordDisplayProps {
  chordResult: ChordDetectionResult;
  inputSource: 'midi' | 'mic' | 'synth';
  isListening: boolean;
  onSelectAlternative?: (altChordName: string) => void;
}

export const ChordDisplay: React.FC<ChordDisplayProps> = ({
  chordResult,
  inputSource,
  isListening,
}) => {
  const { status, primaryChord, alternatives, activeNotes, bassNote, description } = chordResult;

  // Confidence calculations
  const getConfidenceBadge = () => {
    if (inputSource === 'midi') {
      return (
        <span className="badge badge-emerald" title="Direct hardware MIDI key events provide 100% ground-truth accuracy">
          <CheckCircle2 size={12} />
          100% (MIDI Direct)
        </span>
      );
    }

    if (!primaryChord) {
      return (
        <span className="badge badge-muted">
          <HelpCircle size={12} />
          {isListening ? 'Listening' : 'Ready'}
        </span>
      );
    }

    const confPct = Math.round(primaryChord.confidence * 100);
    if (confPct >= 80) {
      return (
        <span className="badge badge-emerald" title="Strong harmonic alignment and fundamental frequency match">
          <CheckCircle2 size={12} />
          {confPct}% High Confidence
        </span>
      );
    } else if (confPct >= 50) {
      return (
        <span className="badge badge-amber" title="Moderate confidence. Piano overtones may affect estimation">
          <AlertCircle size={12} />
          {confPct}% Estimated
        </span>
      );
    } else {
      return (
        <span className="badge badge-rose" title="Low confidence. Acoustic resonance or partial notes detected">
          <AlertCircle size={12} />
          {confPct}% Uncertain
        </span>
      );
    }
  };

  return (
    <div
      className="studio-panel chord-hero-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        background: 'linear-gradient(135deg, #131822 0%, #0d1017 100%)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(6, 182, 212, 0.08)',
        minHeight: '200px', // Prevent layout shifts
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Top Banner: Status & Confidence */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Music size={18} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Harmonic & Chord Detection
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {getConfidenceBadge()}

          {primaryChord?.isSlashChord && (
            <span className="badge badge-cyan" title="Lowest sounding note is not the root">
              Bass: {primaryChord.bassNoteName} ({primaryChord.inversion} Inv.)
            </span>
          )}
        </div>
      </div>

      {/* Main Chord Headline Row (Fixed Height to eliminate layout shifts) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(1.8rem, 3.8vw, 2.8rem)',
              fontWeight: '800',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: primaryChord ? '#38bdf8' : '#94a3b8',
              textShadow: primaryChord ? '0 0 25px rgba(56, 189, 248, 0.4)' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {primaryChord
              ? primaryChord.symbolName
              : status === 'single-note'
              ? description
              : isListening
              ? 'Listening for keys...'
              : 'Analyzer Paused'}
          </div>

          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              fontWeight: '500',
              marginTop: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              height: '18px',
            }}
          >
            {primaryChord
              ? primaryChord.fullName
              : !isListening
              ? 'Press Start or play a note to begin'
              : description}
          </div>
        </div>

        {/* Bass / Root note chip */}
        {bassNote && (
          <div
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Root / Bass
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: '700', color: '#38bdf8' }}>
              {bassNote.noteName} ({bassNote.frequency.toFixed(1)} Hz)
            </span>
          </div>
        )}
      </div>

      {/* Individual Sounding Notes (Stable Height Container) */}
      <div
        style={{
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '0.4rem',
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: '700',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginRight: '0.25rem',
          }}
        >
          Notes ({activeNotes.length}):
        </span>

        {activeNotes.length === 0 ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No keys currently sounding. Strike a key on your piano keyboard or microphone.
          </span>
        ) : (
          activeNotes.map((note) => (
            <div
              key={`${note.midiNote}-${note.noteName}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.35)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: '800', color: '#ffffff' }}>
                {note.noteName}
              </span>

              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#94a3b8' }}>
                {note.frequency.toFixed(1)} Hz
              </span>

              {note.cents !== undefined && Math.abs(note.cents) > 0 && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    color: Math.abs(note.cents) < 15 ? '#10b981' : '#f59e0b',
                  }}
                >
                  {note.cents > 0 ? `+${note.cents}¢` : `${note.cents}¢`}
                </span>
              )}

              <span
                style={{
                  fontSize: '0.58rem',
                  padding: '1px 3px',
                  borderRadius: '3px',
                  background: note.source === 'midi' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: note.source === 'midi' ? '#34d399' : '#fbbf24',
                  fontWeight: '700',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {note.source.toUpperCase()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Alternative Chord Possibilities (Reserved Slot: No page bounce) */}
      <div
        style={{
          minHeight: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
        }}
      >
        {alternatives.length > 0 ? (
          <>
            <span style={{ fontWeight: '600' }}>Possible Alternatives:</span>
            {alternatives.map((alt) => (
              <span
                key={alt.symbolName}
                className="badge"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.72rem',
                  textTransform: 'none',
                  padding: '0.15rem 0.45rem',
                }}
                title={`Confidence: ${(alt.confidence * 100).toFixed(0)}%. Notes: ${alt.notesInChord.join(', ')}`}
              >
                <strong style={{ color: '#e2e8f0', marginRight: '3px' }}>{alt.symbolName}</strong>
                <span>({(alt.confidence * 100).toFixed(0)}%)</span>
              </span>
            ))}
          </>
        ) : (
          <span style={{ opacity: 0.5 }}>Single interpretation confirmed</span>
        )}
      </div>
    </div>
  );
};
