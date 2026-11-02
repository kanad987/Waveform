import React, { useEffect, useRef, useState } from 'react';
import { Activity, ZoomIn, ZoomOut, Eye, Sparkles, Maximize2 } from 'lucide-react';

interface WaveformVisualizerProps {
  timeDomainData: Float32Array;
  rms: number;
  peakDb: number;
  isSilent: boolean;
  isListening: boolean;
  dominantFreq?: number | null;
  sampleRate?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  timeDomainData,
  rms,
  peakDb,
  isSilent,
  isListening,
  dominantFreq,
  sampleRate = 44100,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Oscilloscope controls
  const [cycleMode, setCycleMode] = useState<'2' | '4' | '8' | 'free'>('4');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [showPureSineGuide, setShowPureSineGuide] = useState<boolean>(true);
  const [autoScale, setAutoScale] = useState<boolean>(true);
  const frozenBufferRef = useRef<Float32Array | null>(null);

  // Smooth trackers
  const smoothedFreqRef = useRef<number>(440);
  const smoothedGainRef = useRef<number>(1.0);

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

    // Deep studio oscilloscope screen background
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#0f141d');
    bgGrad.addColorStop(1, '#07090d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw Oscilloscope Graticule Grid (8 horizontal rows x 10 vertical columns)
    const gridRows = 8;
    const gridCols = 10;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    for (let r = 1; r < gridRows; r++) {
      const y = (height / gridRows) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let c = 1; c < gridCols; c++) {
      const x = (width / gridCols) * c;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Center Zero-Crossing Horizontal Line with tick marks
    const centerY = height / 2;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Subdivisions along center line (classic oscilloscope ticks)
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    for (let i = 0; i < width; i += width / 50) {
      ctx.beginPath();
      ctx.moveTo(i, centerY - 3);
      ctx.lineTo(i, centerY + 3);
      ctx.stroke();
    }

    // Voltage scale indicators on left edge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = '9px monospace';
    ctx.fillText('+1.0', 6, 14);
    ctx.fillText('+0.5', 6, height * 0.25);
    ctx.fillText(' 0.0V', 6, centerY - 2);
    ctx.fillText('-0.5', 6, height * 0.75);
    ctx.fillText('-1.0', 6, height - 6);

    // Buffer selection
    const buffer = isFrozen && frozenBufferRef.current ? frozenBufferRef.current : timeDomainData;

    if (!isFrozen && timeDomainData && timeDomainData.length > 0) {
      frozenBufferRef.current = new Float32Array(timeDomainData);
    }

    if (!buffer || buffer.length === 0 || (!isListening && isSilent)) {
      // Idle / Resting flat beam
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      ctx.restore();
      return;
    }

    // Smooth frequency tracking for sinusoidal timebase
    if (dominantFreq && dominantFreq >= 40 && dominantFreq <= 3500) {
      smoothedFreqRef.current = smoothedFreqRef.current * 0.75 + dominantFreq * 0.25;
    }
    const currentFreq = smoothedFreqRef.current || 440;
    const periodSamples = sampleRate / currentFreq;

    // Calculate number of samples to display across canvas width:
    // To make the waveform clearly sinusoidal, we display a controlled number of cycles!
    let targetCycles = 4;
    if (cycleMode === '2') targetCycles = 2;
    if (cycleMode === '8') targetCycles = 8;

    let displaySamples: number;
    if (cycleMode === 'free') {
      displaySamples = Math.floor(buffer.length / (2 * zoomLevel));
    } else {
      // Sinusoidal Lock: adapt display samples to exact cycle count!
      displaySamples = Math.round(targetCycles * periodSamples * (1 / zoomLevel));
      // Bound within buffer limits
      displaySamples = Math.max(80, Math.min(buffer.length - 120, displaySamples));
    }

    // Rock-Solid Trigger Alignment:
    // Search for positive zero-crossing with hysteresis to prevent noise jitter
    let startIndex = 0;
    const searchLimit = Math.min(Math.floor(buffer.length * 0.4), Math.floor(periodSamples * 2.5));
    const noiseThreshold = 0.012; // Hysteresis band

    for (let i = 2; i < searchLimit; i++) {
      if (buffer[i - 1] < -noiseThreshold && buffer[i] >= 0) {
        // Sub-sample linear interpolation for ultra-stable phase lock
        const y0 = buffer[i - 1];
        const y1 = buffer[i];
        const frac = -y0 / (y1 - y0 + 1e-9);
        startIndex = i - 1 + frac;
        break;
      }
    }

    // Measure raw peak amplitude in the display window
    let rawMaxAmp = 0;
    const step = displaySamples / width;
    for (let x = 0; x < width; x += 4) {
      const idx = Math.floor(startIndex + x * step);
      if (idx >= 0 && idx < buffer.length) {
        const val = Math.abs(buffer[idx]);
        if (val > rawMaxAmp) rawMaxAmp = val;
      }
    }

    // Auto-Gain: expand gentle piano notes to a full, clear sinusoidal wave
    let targetGain = 1.0;
    if (autoScale && rawMaxAmp > 0.005) {
      targetGain = Math.min(12.0, Math.max(1.0, 0.72 / rawMaxAmp));
    }
    // Smooth gain transition
    smoothedGainRef.current = smoothedGainRef.current * 0.8 + targetGain * 0.2;
    const effectiveGain = smoothedGainRef.current;

    // Precalculate wave points with cubic/linear interpolation and auto-gain
    const points: Array<{ x: number; y: number }> = new Array(Math.floor(width));

    for (let x = 0; x < width; x++) {
      const samplePos = startIndex + x * step;
      const idx = Math.floor(samplePos);
      const frac = samplePos - idx;

      let val = 0;
      if (idx >= 0 && idx < buffer.length - 1) {
        // Linear interpolation between adjacent samples
        val = buffer[idx] * (1 - frac) + buffer[idx + 1] * frac;
      } else if (idx < buffer.length) {
        val = buffer[idx];
      }

      // Apply effective gain & clamp smoothly
      const scaledVal = Math.max(-1.1, Math.min(1.1, val * effectiveGain));

      // Scale to height (headroom factor 0.42)
      const y = centerY - scaledVal * (height * 0.42);
      points[x] = { x, y };
    }

    // Optional: Draw Ideal Pitch Sinusoid Reference Guide
    if (showPureSineGuide && dominantFreq && rawMaxAmp > 0.01) {
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();

      const radPerSample = (2 * Math.PI * currentFreq) / sampleRate;
      const guideAmp = Math.min(1.0, rawMaxAmp * effectiveGain);

      for (let x = 0; x < width; x++) {
        const samplePos = x * step;
        const sineVal = Math.sin(samplePos * radPerSample) * guideAmp;
        const y = centerY - sineVal * (height * 0.42);

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Layer 1: Phosphor Outer Glow
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let x = 0; x < points.length; x++) {
      if (x === 0) ctx.moveTo(points[x].x, points[x].y);
      else ctx.lineTo(points[x].x, points[x].y);
    }
    ctx.stroke();

    // Layer 2: Middle Vibrant Waveform
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x < points.length; x++) {
      if (x === 0) ctx.moveTo(points[x].x, points[x].y);
      else ctx.lineTo(points[x].x, points[x].y);
    }
    ctx.stroke();

    // Layer 3: High-Intensity Sharp Beam Core
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#38bdf8');
    gradient.addColorStop(0.5, '#67e8f9');
    gradient.addColorStop(1, '#34d399');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let x = 0; x < points.length; x++) {
      if (x === 0) ctx.moveTo(points[x].x, points[x].y);
      else ctx.lineTo(points[x].x, points[x].y);
    }
    ctx.stroke();

    // Overlay Timebase & Frequency Legend (bottom right)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    const periodMs = (periodSamples / sampleRate) * 1000;
    const timePerDivMs = ((displaySamples / 10) / sampleRate) * 1000;
    ctx.fillText(
      `${timePerDivMs.toFixed(2)} ms/div • T=${periodMs.toFixed(2)}ms • f=${currentFreq.toFixed(1)}Hz${effectiveGain > 1.2 ? ` • Gain: ${effectiveGain.toFixed(1)}x` : ''}`,
      width - 12,
      height - 10
    );

    ctx.restore();
  }, [
    timeDomainData,
    cycleMode,
    zoomLevel,
    isFrozen,
    isListening,
    isSilent,
    dominantFreq,
    sampleRate,
    showPureSineGuide,
    autoScale,
  ]);

  return (
    <div
      className="studio-panel hero-waveform-card"
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: 'linear-gradient(180deg, #121620 0%, #0a0d13 100%)',
        border: '1px solid rgba(6, 182, 212, 0.35)',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 25px rgba(6, 182, 212, 0.12)',
      }}
    >
      {/* Studio Header Bar */}
      <div className="studio-panel-header" style={{ height: '36px', marginBottom: '0.6rem' }}>
        <div className="studio-panel-title">
          <Activity size={20} style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '1rem', fontWeight: '800', letterSpacing: '0.04em' }}>
            Acoustic Waveform Oscilloscope
          </span>
          <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
            HERO SINE DISPLAY
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Signal Level Readout with FIXED width to prevent button shifting */}
          <div
            className="badge badge-cyan"
            style={{
              fontSize: '0.72rem',
              padding: '0.2rem 0.55rem',
              minWidth: '135px',
              justifyContent: 'center',
            }}
            title="Root Mean Square / Peak Amplitude"
          >
            RMS: {(rms * 100).toFixed(1)}% | {peakDb > -90 ? `${peakDb.toFixed(0)} dB` : '-∞ dB'}
          </div>

          {/* Sinusoidal Wave Cycle Presets */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${cycleMode === '2' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCycleMode('2')}
              style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', border: 'none' }}
              title="Show 2 expanded sinusoidal wave cycles"
            >
              2 Sine Cycles
            </button>
            <button
              type="button"
              className={`btn btn-sm ${cycleMode === '4' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCycleMode('4')}
              style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', border: 'none' }}
              title="Show 4 clean sinusoidal wave cycles (Default)"
            >
              4 Sine Cycles
            </button>
            <button
              type="button"
              className={`btn btn-sm ${cycleMode === '8' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCycleMode('8')}
              style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', border: 'none' }}
              title="Show 8 wave cycles"
            >
              8 Cycles
            </button>
            <button
              type="button"
              className={`btn btn-sm ${cycleMode === 'free' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCycleMode('free')}
              style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', border: 'none' }}
              title="Continuous free-run oscilloscope timebase"
            >
              Free Run
            </button>
          </div>

          {/* Auto-Scale Toggle */}
          <button
            type="button"
            className={`btn btn-sm ${autoScale ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoScale((a) => !a)}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
            title="Automatically scale vertical height to showcase the full sinusoidal wave"
          >
            <Maximize2 size={12} style={{ marginRight: '3px' }} />
            Auto-Scale: {autoScale ? 'ON' : 'OFF'}
          </button>

          {/* Toggle Pure Sine Reference Guide */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPureSineGuide((s) => !s)}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.72rem',
              color: showPureSineGuide ? '#fbbf24' : 'var(--text-muted)',
              borderColor: showPureSineGuide ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-subtle)',
            }}
            title="Overlay the pure mathematical sine wave of the fundamental piano note"
          >
            <Sparkles size={12} style={{ marginRight: '3px' }} />
            Sine Guide: {showPureSineGuide ? 'ON' : 'OFF'}
          </button>

          {/* Zoom In/Out */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setZoomLevel((z) => Math.max(0.5, z / 1.4))}
            aria-label="Zoom out waveform timebase"
            title="Zoom Out Timebase"
            style={{ padding: '0.2rem 0.4rem' }}
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setZoomLevel((z) => Math.min(4, z * 1.4))}
            aria-label="Zoom in waveform timebase"
            title="Zoom In Timebase"
            style={{ padding: '0.2rem 0.4rem' }}
          >
            <ZoomIn size={13} />
          </button>

          {/* Live / Frozen button */}
          <button
            type="button"
            className={`btn btn-sm ${isFrozen ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsFrozen((f) => !f)}
            style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem' }}
            title="Freeze oscilloscope frame on screen"
          >
            <Eye size={12} style={{ marginRight: '3px' }} />
            {isFrozen ? 'Frozen' : 'Live'}
          </button>
        </div>
      </div>

      {/* Hero Canvas Container: 340px tall prominence */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '340px',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          aria-label="High-resolution laboratory oscilloscope waveform display visualizing sinusoidal piano acoustics"
          role="img"
        />

        {/* Oscilloscope Hardware Badge in Corner */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'rgba(6, 182, 212, 0.5)',
            pointerEvents: 'none',
            letterSpacing: '0.08em',
          }}
        >
          WAVEY DSO-4000 • SINE-LOCK ACTIVE
        </div>
      </div>
    </div>
  );
};
