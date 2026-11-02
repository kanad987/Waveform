import React from 'react';
import { History, Trash2, Play } from 'lucide-react';
import type { ChordCandidate } from '../utils/chordDetector';

export interface HistoryItem {
  id: string;
  timestamp: string;
  chordName: string;
  notes: string[];
  confidence: number;
  source: 'midi' | 'audio' | 'demo';
  candidate?: ChordCandidate | null;
}

interface ChordHistoryProps {
  history: HistoryItem[];
  onClear: () => void;
  onPlayItem?: (item: HistoryItem) => void;
}

export const ChordHistory: React.FC<ChordHistoryProps> = ({
  history,
  onClear,
  onPlayItem,
}) => {
  return (
    <div className="studio-panel history-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="studio-panel-header" style={{ marginBottom: 0, paddingBottom: '0.5rem' }}>
        <div className="studio-panel-title">
          <History size={18} />
          <span>Recent Progression History ({history.length})</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onClear}
          disabled={history.length === 0}
          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
          title="Clear detection history log"
        >
          <Trash2 size={13} style={{ marginRight: '4px' }} />
          Clear Log
        </button>
      </div>

      {history.length === 0 ? (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.75rem 0' }}>
          No detected chords logged yet. Play notes to build a progression timeline.
        </div>
      ) : (
        <div
          className="history-strip"
          style={{
            display: 'flex',
            gap: '0.65rem',
            overflowX: 'auto',
            paddingBottom: '6px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {history.map((item) => (
            <div
              key={item.id}
              style={{
                flex: '0 0 auto',
                minWidth: '130px',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {item.timestamp}
                </span>

                <span
                  style={{
                    fontSize: '0.6rem',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    background: item.source === 'midi' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: item.source === 'midi' ? '#34d399' : '#fbbf24',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: '700',
                  }}
                >
                  {item.source.toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff' }}>
                  {item.chordName}
                </div>

                {onPlayItem && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onPlayItem(item)}
                    style={{ padding: '0.2rem', width: '22px', height: '22px', borderRadius: '50%' }}
                    title="Play this chord"
                  >
                    <Play size={10} />
                  </button>
                )}
              </div>

              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.notes.join(' • ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
