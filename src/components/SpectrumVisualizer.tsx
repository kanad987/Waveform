import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Sliders } from 'lucide-react';
import type { ActiveNoteInfo } from '../utils/musicTheory';

interface SpectrumVisualizerProps {
  frequencyData: Float32Array;
  sampleRate: number;
  activeNotes: ActiveNoteInfo[];
  dominantFreq: number | null;
  isListening: boolean;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  frequencyData,
  sampleRate,
  activeNotes,
  isListening,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'bars' | 'curve'>('bars');
  const peakHoldRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    // Studio dark background
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, width, height);

    // Frequency boundaries (logarithmic 30 Hz to 8000 Hz)
    const minFreq = 30;
    const maxFreq = 8000;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);

    // Helper: frequency to X coordinate
    const freqToX = (f: number): number => {
      if (f <= minFreq) return 0;
      if (f >= maxFreq) return width;
      const logF = Math.log10(f);
      return ((logF - logMin) / (logMax - logMin)) * width;
    };

    // Draw horizontal dB grid lines (-80 dB to 0 dB)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const dbSteps = [-80, -60, -40, -20, 0];
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = '9px monospace';

    for (const db of dbSteps) {
      // Map dB (-90 to 0) to Y (height to 10)
      const y = height - ((db + 90) / 90) * (height - 18) - 14;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillText(`${db}dB`, 6, y - 2);
    }

    // Draw musical reference frequency ticks at bottom
    // Key piano octaves: C2 (65.4Hz), C3 (130.8Hz), C4 (261.6Hz), A4 (440Hz), C5 (523.3Hz), C6 (1046.5Hz), C7 (2093Hz)
    const musicalMarkers = [
      { label: 'C2', freq: 65.4 },
      { label: 'C3', freq: 130.8 },
      { label: 'C4', freq: 261.6 },
      { label: 'A4', freq: 440.0, highlight: true },
      { label: 'C5', freq: 523.3 },
      { label: 'C6', freq: 1046.5 },
      { label: 'C7', freq: 2093.0 },
      { label: '5k', freq: 5000.0 },
    ];

    for (const marker of musicalMarkers) {
      const x = freqToX(marker.freq);
      ctx.strokeStyle = marker.highlight ? 'rgba(6, 182, 212, 0.4)' : 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(x, height - 16);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = marker.highlight ? '#22d3ee' : 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.fillText(marker.label, x, height - 4);
    }

    if (!frequencyData || frequencyData.length === 0 || !isListening) {
      ctx.restore();
      return;
    }

    const binCount = frequencyData.length;
    const nyquist = (sampleRate || 44100) / 2;
    const binWidth = nyquist / binCount;

    // Number of display columns/bars across width
    const numBars = Math.min(100, Math.floor(width / 5));
    const barWidth = (width / numBars) * 0.85;

    // Allocate or update peak hold array
    if (!peakHoldRef.current || peakHoldRef.current.length !== numBars) {
      peakHoldRef.current = new Float32Array(numBars).fill(-120);
    }
    const peakHold = peakHoldRef.current;

    // Sample frequency data logarithmically across bars
    const barValues: number[] = new Array(numBars).fill(-100);

    for (let b = 0; b < numBars; b++) {
      const logFractionStart = b / numBars;
      const logFractionEnd = (b + 1) / numBars;

      const fStart = Math.pow(10, logMin + logFractionStart * (logMax - logMin));
      const fEnd = Math.pow(10, logMin + logFractionEnd * (logMax - logMin));

      const binStart = Math.max(1, Math.floor(fStart / binWidth));
      const binEnd = Math.min(binCount - 1, Math.ceil(fEnd / binWidth));

      let maxDbInBand = -120;
      for (let bin = binStart; bin <= binEnd; bin++) {
        if (frequencyData[bin] > maxDbInBand) {
          maxDbInBand = frequencyData[bin];
        }
      }
      barValues[b] = maxDbInBand;

      // Peak decay
      if (maxDbInBand > peakHold[b]) {
        peakHold[b] = maxDbInBand;
      } else {
        peakHold[b] = Math.max(-120, peakHold[b] - 0.7); // Gentle gravity fall
      }
    }

    // Render Bars or Smooth Curve
    if (viewMode === 'bars') {
      const gradient = ctx.createLinearGradient(0, height - 20, 0, 10);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      gradient.addColorStop(0.6, 'rgba(56, 189, 248, 0.85)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.95)');

      for (let b = 0; b < numBars; b++) {
        const x = b * (width / numBars) + (width / numBars - barWidth) / 2;
        const db = Math.max(-90, Math.min(0, barValues[b]));
        const barHeight = Math.max(2, ((db + 90) / 90) * (height - 30));
        const y = height - 16 - barHeight;

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Peak Hold Dot
        const peakDb = Math.max(-90, Math.min(0, peakHold[b]));
        if (peakDb > -80) {
          const peakY = height - 16 - ((peakDb + 90) / 90) * (height - 30);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(x, Math.max(10, peakY - 1), barWidth, 2);
        }
      }
    } else {
      // Curve Mode
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#06b6d4');
      gradient.addColorStop(0.5, '#38bdf8');
      gradient.addColorStop(1, '#10b981');

      ctx.beginPath();
      for (let b = 0; b < numBars; b++) {
        const x = (b + 0.5) * (width / numBars);
        const db = Math.max(-90, Math.min(0, barValues[b]));
        const y = height - 16 - Math.max(2, ((db + 90) / 90) * (height - 30));

        if (b === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Fill area under curve
      ctx.lineTo(width, height - 16);
      ctx.lineTo(0, height - 16);
      ctx.closePath();
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.fill();
    }

    // Highlight vertical beacons for currently active detected notes!
    if (activeNotes && activeNotes.length > 0) {
      for (const note of activeNotes) {
        const noteX = freqToX(note.frequency);
        if (noteX > 0 && noteX < width) {
          // Glow column
          const beamGrad = ctx.createLinearGradient(0, 10, 0, height - 16);
          beamGrad.addColorStop(0, 'rgba(245, 158, 11, 0.7)');
          beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

          ctx.fillStyle = beamGrad;
          ctx.fillRect(noteX - 4, 10, 8, height - 26);

          // Top label
          ctx.fillStyle = '#fde68a';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(note.noteName, noteX, 12);
        }
      }
    }

    ctx.restore();
  }, [frequencyData, sampleRate, activeNotes, viewMode, isListening]);

  return (
    <div className="studio-panel spectrum-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="studio-panel-header">
        <div className="studio-panel-title">
          <BarChart3 size={18} />
          <span>Frequency Spectrum</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="badge badge-emerald" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
            30 Hz – 8 kHz
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setViewMode((m) => (m === 'bars' ? 'curve' : 'bars'))}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            title="Toggle between FFT bar columns and smooth line curve"
          >
            <Sliders size={12} style={{ marginRight: '4px' }} />
            {viewMode === 'bars' ? 'Bars' : 'Curve'}
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '170px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          aria-label="Real-time frequency spectrum analyzer with logarithmic musical pitch ticks"
          role="img"
        />

        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'rgba(255, 255, 255, 0.25)',
            pointerEvents: 'none',
          }}
        >
          FFT • LOG 20Hz-8kHz
        </div>
      </div>
    </div>
  );
};
