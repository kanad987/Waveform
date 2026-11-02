import React from 'react';
import {
  Piano,
  Mic,
  SlidersHorizontal,
  Play,
  Square,
  RotateCcw,
  VolumeX,
  Volume2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import type { MidiDeviceOption } from '../utils/midiManager';

interface HeaderProps {
  inputMode: 'midi' | 'mic';
  onInputModeChange: (mode: 'midi' | 'mic') => void;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onClear: () => void;
  midiSupported: boolean;
  midiDevices: MidiDeviceOption[];
  selectedMidiId: string;
  onSelectMidiDevice: (id: string) => void;
  audioDevices: MediaDeviceInfo[];
  selectedAudioDeviceId: string;
  onSelectAudioDevice: (id: string) => void;
  onOpenSettings: () => void;
  errorMessage: string | null;
  onDismissError: () => void;
  synthEnabled: boolean;
  onToggleSynth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  inputMode,
  onInputModeChange,
  isListening,
  onStartListening,
  onStopListening,
  onClear,
  midiSupported,
  midiDevices,
  selectedMidiId,
  onSelectMidiDevice,
  audioDevices,
  selectedAudioDeviceId,
  onSelectAudioDevice,
  onOpenSettings,
  errorMessage,
  onDismissError,
  synthEnabled,
  onToggleSynth,
}) => {
  return (
    <header
      style={{
        background: 'rgba(15, 18, 24, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0.85rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* Main Row: Logo, Mode Selector, Master Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Logo & Listening Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h2l3-7 4 14 4-10 3 6 2-3h2" />
              </svg>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Wavey
                </h1>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                  v1.0 Studio
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span className={`status-dot ${isListening ? 'active' : ''}`} />
                <span>{isListening ? (inputMode === 'midi' ? 'Listening to MIDI keyboard' : 'Microphone audio active') : 'Analysis stopped'}</span>
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div
            role="tablist"
            aria-label="Audio and MIDI Input Selector"
            style={{
              display: 'flex',
              background: 'var(--bg-surface-elevated)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === 'midi'}
              className={`btn btn-sm ${inputMode === 'midi' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onInputModeChange('midi')}
              style={{ border: 'none' }}
            >
              <Piano size={15} />
              <span>MIDI Keyboard</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={inputMode === 'mic'}
              className={`btn btn-sm ${inputMode === 'mic' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onInputModeChange('mic')}
              style={{ border: 'none' }}
            >
              <Mic size={15} />
              <span>Microphone Audio</span>
            </button>
          </div>

          {/* Master Transport Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isListening ? (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onStopListening}
                title="Stop audio/MIDI analysis and turn off microphone tracks"
              >
                <Square size={15} />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onStartListening}
                title="Start audio or MIDI analysis"
              >
                <Play size={15} />
                <span>Start</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClear}
              title="Clear active held notes and detection history"
            >
              <RotateCcw size={15} />
              <span>Clear</span>
            </button>

            <button
              type="button"
              className={`btn ${synthEnabled ? 'btn-secondary' : 'btn-danger'}`}
              onClick={onToggleSynth}
              title={synthEnabled ? 'Mute internal piano audio' : 'Unmute internal piano audio'}
            >
              {synthEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onOpenSettings}
              title="Open tuning & sensitivity settings"
            >
              <SlidersHorizontal size={16} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Device Selection Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
              {inputMode === 'midi' ? 'MIDI Input Device:' : 'Microphone Source:'}
            </span>

            {inputMode === 'midi' ? (
              midiSupported ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <select
                    value={selectedMidiId}
                    onChange={(e) => onSelectMidiDevice(e.target.value)}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.3rem 1.8rem 0.3rem 0.65rem',
                      fontSize: '0.8rem',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="all">All Connected MIDI Devices</option>
                    {midiDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.manufacturer})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: 'var(--text-muted)',
                    }}
                  />
                </div>
              ) : (
                <span className="badge badge-rose">
                  Web MIDI not supported in this browser.
                </span>
              )
            ) : (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <select
                  value={selectedAudioDeviceId}
                  onChange={(e) => onSelectAudioDevice(e.target.value)}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.3rem 1.8rem 0.3rem 0.65rem',
                    fontSize: '0.8rem',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Default Audio Input</option>
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 6)}...`}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--text-muted)',
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {inputMode === 'midi'
              ? 'Plug in USB piano keyboard and play.'
              : 'All audio processed client-side in browser. No data leaves your machine.'}
          </div>
        </div>

        {/* Connection or Permission Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              color: '#fecdd3',
              fontSize: '0.825rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} style={{ color: '#fb7185', flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={onDismissError}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fecdd3',
                cursor: 'pointer',
                fontWeight: '700',
                padding: '0.2rem',
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
