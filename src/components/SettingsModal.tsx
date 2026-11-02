import React from 'react';
import { X, Sliders, Volume2, Mic, Music, Gauge } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  a4Tuning: number;
  onA4Change: (val: number) => void;
  sensitivity: number;
  onSensitivityChange: (val: number) => void;
  noiseGateDb: number;
  onNoiseGateChange: (val: number) => void;
  useFlats: boolean;
  onUseFlatsChange: (val: boolean) => void;
  synthVolume: number;
  onSynthVolumeChange: (val: number) => void;
  synthEnabled: boolean;
  onSynthEnabledChange: (val: boolean) => void;
  fftSize: number;
  onFftSizeChange: (val: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  a4Tuning,
  onA4Change,
  sensitivity,
  onSensitivityChange,
  noiseGateDb,
  onNoiseGateChange,
  useFlats,
  onUseFlatsChange,
  synthVolume,
  onSynthVolumeChange,
  synthEnabled,
  onSynthEnabledChange,
  fftSize,
  onFftSizeChange,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="studio-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#12161f',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="studio-panel-header">
          <div className="studio-panel-title" id="settings-dialog-title">
            <Sliders size={20} />
            <span>Studio Analysis Settings</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Close settings"
            style={{ padding: '0.3rem' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
          {/* A4 Reference Tuning */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Music size={15} style={{ color: 'var(--accent-cyan)' }} />
                A4 Tuning Reference
              </label>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                {a4Tuning} Hz
              </span>
            </div>
            <input
              type="range"
              min="415"
              max="466"
              step="1"
              value={a4Tuning}
              onChange={(e) => onA4Change(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onA4Change(415)}
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
              >
                415 Hz (Baroque)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onA4Change(432)}
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
              >
                432 Hz (Verdi)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onA4Change(440)}
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
              >
                440 Hz (Concert Standard)
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onA4Change(442)}
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
              >
                442 Hz (European)
              </button>
            </div>
          </div>

          {/* Audio Input Sensitivity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mic size={15} style={{ color: 'var(--accent-emerald)' }} />
                Microphone Pitch Sensitivity
              </label>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--accent-emerald)' }}>
                {(sensitivity * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.0"
              step="0.05"
              value={sensitivity}
              onChange={(e) => onSensitivityChange(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-emerald)' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Controls threshold for piano harmonics vs fundamental note extraction.
            </div>
          </div>

          {/* Silence Gate / Noise Floor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Gauge size={15} style={{ color: 'var(--accent-amber)' }} />
                Silence Gate Threshold
              </label>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--accent-amber)' }}>
                {noiseGateDb} dB
              </span>
            </div>
            <input
              type="range"
              min="-75"
              max="-40"
              step="1"
              value={noiseGateDb}
              onChange={(e) => onNoiseGateChange(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-amber)' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Prevents background room hum or air noise from triggering false notes.
            </div>
          </div>

          {/* Notation Accidental Preference (Sharps vs Flats) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Accidental Display
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Choose sharp (♯) or flat (♭) note spelling preference
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${!useFlats ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onUseFlatsChange(false)}
                style={{ padding: '0.25rem 0.6rem' }}
              >
                Sharps (♯)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${useFlats ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onUseFlatsChange(true)}
                style={{ padding: '0.25rem 0.6rem' }}
              >
                Flats (♭)
              </button>
            </div>
          </div>

          {/* Built-in Piano Synthesizer Audio */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Volume2 size={15} style={{ color: 'var(--accent-cyan)' }} />
                Synthesizer Sound Output (for MIDI & On-Screen Keys)
              </label>
              <input
                type="checkbox"
                checked={synthEnabled}
                onChange={(e) => onSynthEnabledChange(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-cyan)' }}
              />
            </div>
            {synthEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={synthVolume}
                  onChange={(e) => onSynthVolumeChange(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', minWidth: '40px' }}>
                  {Math.round(synthVolume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* FFT Window Resolution */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                FFT Window Size
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Higher values yield finer pitch resolution for bass notes
              </div>
            </div>
            <select
              value={fftSize}
              onChange={(e) => onFftSizeChange(Number(e.target.value))}
              style={{
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.35rem 0.6rem',
                fontSize: '0.8rem',
              }}
            >
              <option value={2048}>2048 (Low Latency)</option>
              <option value={4096}>4096 (Recommended)</option>
              <option value={8192}>8192 (Ultra High Res)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
