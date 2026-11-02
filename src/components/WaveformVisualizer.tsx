import React, { useEffect, useRef, useState } from 'react';
import { Activity, ZoomIn, ZoomOut } from 'lucide-react';

interface WaveformVisualizerProps {
  timeDomainData: Float32Array;
  rms: number;
  peakDb: number;
  isSilent: boolean;
  isListening: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  timeDomainData,
  rms,
  peakDb,
  isSilent,
  isListening,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const frozenBufferRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Dark oscilloscope background
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, width, height);

    // Draw Graticule Grid (classic studio oscilloscope lines)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const gridRows = 6;
    for (let r = 1; r < gridRows; r++) {
      const y = (height / gridRows) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical time division lines
    const gridCols = 8;
    for (let c = 1; c < gridCols; c++) {
      const x = (width / gridCols) * c;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Center zero-voltage line (subtle cyan tint)
    const centerY = height / 2;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Data buffer to draw
    const buffer = isFrozen && frozenBufferRef.current ? frozenBufferRef.current : timeDomainData;

    if (!isFrozen && timeDomainData && timeDomainData.length > 0) {
      frozenBufferRef.current = new Float32Array(timeDomainData);
    }

    if (!buffer || buffer.length === 0 || (!isListening && isSilent)) {
      // Idle / Resting flat trace
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      ctx.restore();
      return;
    }

    // Trigger alignment: find positive zero crossing in first quarter of buffer to stabilize waveform!
    let startIndex = 0;
    const searchLimit = Math.floor(buffer.length * 0.3);
    for (let i = 1; i < searchLimit; i++) {
      if (buffer[i - 1] < 0 && buffer[i] >= 0) {
        startIndex = i;
        break;
      }
    }

    // Number of samples to render across canvas width, modulated by zoom level
    const displaySamples = Math.floor(buffer.length / (2 * zoomLevel));
    const step = displaySamples / width;

    // Draw glowing phosphor waveform trace
    // Layer 1: Outer glow
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const sampleIdx = Math.min(buffer.length - 1, startIndex + Math.floor(x * step));
      const val = buffer[sampleIdx] || 0;
      const y = centerY - val * (height * 0.42);

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Layer 2: Sharp foreground neon line
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#06b6d4');
    gradient.addColorStop(0.5, '#38bdf8');
    gradient.addColorStop(1, '#10b981');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.8;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const sampleIdx = Math.min(buffer.length - 1, startIndex + Math.floor(x * step));
      const val = buffer[sampleIdx] || 0;
      const y = centerY - val * (height * 0.42);

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }, [timeDomainData, zoomLevel, isFrozen, isListening, isSilent]);

  return (
    <div className="studio-panel waveform-card" ref={containerRef} style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="studio-panel-header">
        <div className="studio-panel-title">
          <Activity size={18} />
          <span>Real-Time Waveform</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Signal Level Readout */}
          <div
            className="badge badge-cyan"
            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
            title="Root Mean Square / Peak Amplitude"
          >
            RMS: {(rms * 100).toFixed(1)}% | {peakDb > -90 ? `${peakDb.toFixed(0)} dB` : '-∞ dB'}
          </div>

          {/* Zoom In/Out Controls */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setZoomLevel((z) => Math.max(0.5, z / 1.5))}
            aria-label="Zoom out waveform timebase"
            title="Zoom Out"
            style={{ padding: '0.25rem 0.45rem' }}
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setZoomLevel((z) => Math.min(4, z * 1.5))}
            aria-label="Zoom in waveform timebase"
            title="Zoom In"
            style={{ padding: '0.25rem 0.45rem' }}
          >
            <ZoomIn size={14} />
          </button>

          {/* Freeze / Hold Display */}
          <button
            type="button"
            className={`btn btn-sm ${isFrozen ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsFrozen((f) => !f)}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            title="Freeze current waveform on screen"
          >
            {isFrozen ? 'Frozen' : 'Live'}
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '170px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          aria-label="Real-time audio waveform oscilloscope display"
          role="img"
        />

        {/* Oscilloscope Corner Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'rgba(255, 255, 255, 0.25)',
            pointerEvents: 'none',
          }}
        >
          OSC • {zoomLevel.toFixed(1)}x ZOOM
        </div>
      </div>
    </div>
  );
};
