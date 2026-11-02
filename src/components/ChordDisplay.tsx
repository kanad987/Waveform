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
          Evaluating
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
        gap: '1rem',
        background: 'linear-gradient(135deg, #131822 0%, #0d1017 100%)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(6, 182, 212, 0.08)',
      }}
    >
      {/* Top Banner: Status & Confidence */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Music size={20} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Harmonic Analysis
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

      {/* Main Chord Headline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.5rem 0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
              fontWeight: '800',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: primaryChord ? '#38bdf8' : '#94a3b8',
              textShadow: primaryChord ? '0 0 25px rgba(56, 189, 248, 0.4)' : 'none',
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

          <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            {primaryChord ? primaryChord.fullName : !isListening ? 'Press Start or play a note to begin' : description}
          </div>
        </div>

        {/* Bass note spotlight if present */}
        {bassNote && (
          <div
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Root / Bass Note
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: '700', color: '#38bdf8' }}>
              {bassNote.noteName} ({bassNote.frequency.toFixed(1)} Hz)
            </span>
          </div>
        )}
      </div>

      {/* Individual Detected Notes Chips */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Active Sounding Notes ({activeNotes.length})
        </div>

        {activeNotes.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.25rem 0' }}>
            No active notes sounding. Strike a key or chord on your keyboard or microphone.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {activeNotes.map((note) => (
              <div
                key={`${note.midiNote}-${note.noteName}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: '800', color: '#ffffff' }}>
                  {note.noteName}
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.1 }}>
                  <span>{note.frequency.toFixed(1)} Hz</span>
                  {note.cents !== undefined && Math.abs(note.cents) > 0 && (
                    <span style={{ color: Math.abs(note.cents) < 15 ? '#10b981' : '#f59e0b' }}>
                      {note.cents > 0 ? `+${note.cents}¢` : `${note.cents}¢`}
                    </span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '0.62rem',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    background: note.source === 'midi' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: note.source === 'midi' ? '#34d399' : '#fbbf24',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {note.source.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alternative Chord Possibilities */}
      {alternatives.length > 0 && (
        <div
          style={{
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
            Possible Alternatives:
          </span>
          {alternatives.map((alt) => (
            <div
              key={alt.symbolName}
              className="badge"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                textTransform: 'none',
              }}
              title={`Confidence: ${(alt.confidence * 100).toFixed(0)}%. Notes: ${alt.notesInChord.join(', ')}`}
            >
              <strong style={{ color: '#e2e8f0', marginRight: '4px' }}>{alt.symbolName}</strong>
              <span style={{ color: 'var(--text-muted)' }}>({(alt.confidence * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
