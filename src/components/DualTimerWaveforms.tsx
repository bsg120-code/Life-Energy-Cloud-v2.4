import React, { useEffect, useRef } from 'react';
import { EnergySource } from '../types/energy';
import { formatTimeClock } from '../utils/formatters';

interface DualTimerWaveformsProps {
  activeSource: EnergySource | null;
  viewportMode: 'mockup' | 'fullscreen';
}

interface BeamParticle {
  t: number;
  speed: number;
  offsetY: number;
  size: number;
  hueOffset: number;
  phase: number;
}

interface RainbowRadiateParticle {
  xNorm: number;
  yOffset: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  hue: number;
  hueSpeed: number;
  maxAlpha: number;
  origin: 'beam' | 'left' | 'right';
}

interface WhiteMicroParticle {
  t: number;
  speed: number;
  offsetY: number;
  driftY: number;
  size: number;
  alpha: number;
  twinklePhase: number;
}

export const DualTimerWaveforms: React.FC<DualTimerWaveformsProps> = ({
  activeSource,
  viewportMode,
}) => {
  const coreCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<BeamParticle[]>([]);
  const rainbowParticlesRef = useRef<RainbowRadiateParticle[]>([]);
  const whiteDustRef = useRef<WhiteMicroParticle[]>([]);
  const phaseRef = useRef<number>(1.15);
  const isActive = Boolean(activeSource);

  const createRainbowParticle = (initial = false): RainbowRadiateParticle => {
    const roll = Math.random();
    const origin: 'beam' | 'left' | 'right' = roll < 0.62 ? 'beam' : roll < 0.81 ? 'left' : 'right';
    const angle =
      origin === 'beam'
        ? (Math.random() < 0.5 ? -1 : 1) * (Math.PI * 0.22 + Math.random() * Math.PI * 0.56)
        : Math.random() * Math.PI * 2;
    const speedMag = origin === 'beam' ? 0.28 + Math.random() * 0.72 : 0.32 + Math.random() * 0.8;
    return {
      xNorm: origin === 'beam' ? 0.04 + Math.random() * 0.92 : origin === 'left' ? 0 : 1,
      yOffset: origin === 'beam' ? (Math.random() - 0.5) * 18 : 0,
      vx: Math.cos(angle) * speedMag * 0.55,
      vy: Math.sin(angle) * speedMag,
      life: initial ? Math.random() : 0,
      decay: 0.008 + Math.random() * 0.013,
      size: 0.55 + Math.random() * 1.1,
      hue: Math.random() * 360,
      hueSpeed: (Math.random() - 0.5) * 1.4,
      maxAlpha: 0.22 + Math.random() * 0.38,
      origin,
    };
  };

  // Initialize stream + subtle rainbow radiating particles + ultra-fine white stardust once
  if (particlesRef.current.length === 0) {
    for (let i = 0; i < 180; i++) {
      particlesRef.current.push({
        t: Math.random(),
        speed: 0.0045 + Math.random() * 0.01,
        offsetY: (Math.random() - 0.5) * 34,
        size: 0.75 + Math.random() * 1.35,
        hueOffset: (i * 19) % 360,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  if (rainbowParticlesRef.current.length === 0) {
    for (let i = 0; i < 130; i++) {
      rainbowParticlesRef.current.push(createRainbowParticle(true));
    }
  }

  if (whiteDustRef.current.length === 0) {
    for (let i = 0; i < 95; i++) {
      whiteDustRef.current.push({
        t: Math.random(),
        speed: 0.0028 + Math.random() * 0.0065,
        offsetY: (Math.random() - 0.5) * 44,
        driftY: (Math.random() - 0.5) * 0.35,
        size: 0.35 + Math.random() * 0.42,
        alpha: 0.22 + Math.random() * 0.36,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  useEffect(() => {
    const coreCanvas = coreCanvasRef.current;
    const waveCanvas = waveCanvasRef.current;
    if (!coreCanvas || !waveCanvas) return;

    const resizeCanvas = (canvas: HTMLCanvasElement, heightPx: number) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(parent.clientWidth, 260);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(heightPx * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${heightPx}px`;
    };

    const handleResize = () => {
      const isCompactMobile = window.innerWidth < 768;
      resizeCanvas(coreCanvas, isCompactMobile ? 148 : 172);
      resizeCanvas(waveCanvas, isCompactMobile ? 120 : 144);
    };

    handleResize();

    let rafId = 0;

    const renderFrame = (advance: boolean) => {
      if (advance) {
        phaseRef.current += 0.045;
      }
      const t = phaseRef.current;

      // 1. Core Beam Canvas
      const coreCtx = coreCanvas.getContext('2d');
      if (coreCtx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = coreCanvas.width / dpr;
        const h = coreCanvas.height / dpr;
        coreCtx.save();
        coreCtx.scale(dpr, dpr);
        coreCtx.clearRect(0, 0, w, h);

        const cy = h / 2;
        const leftX = Math.max(42, w * 0.13);
        const rightX = Math.min(w - 42, w * 0.87);
        const span = rightX - leftX;

        // Subtle background energy grid
        coreCtx.strokeStyle = advance
          ? 'rgba(0, 242, 254, 0.055)'
          : 'rgba(148, 163, 184, 0.05)';
        coreCtx.lineWidth = 1;
        for (let x = 0; x < w; x += 28) {
          coreCtx.beginPath();
          coreCtx.moveTo(x, 0);
          coreCtx.lineTo(x, h);
          coreCtx.stroke();
        }

        // Additive light blending for luminous core transmission beam (dimmed when paused/standby)
        coreCtx.save();
        coreCtx.globalCompositeOperation = 'lighter';
        coreCtx.globalAlpha = advance ? 1 : 0.54;

        // 1. Volumetric Spectral Plasma Aura Ribbon
        const auraGrad = coreCtx.createLinearGradient(leftX, cy, rightX, cy);
        const shift = (t * 28) % 360;
        auraGrad.addColorStop(0, `hsla(${(185 + shift) % 360}, 95%, 60%, 0.14)`);
        auraGrad.addColorStop(0.28, `hsla(${(165 + shift) % 360}, 95%, 62%, 0.2)`);
        auraGrad.addColorStop(0.55, `hsla(${(265 + shift) % 360}, 90%, 66%, 0.18)`);
        auraGrad.addColorStop(0.82, `hsla(${(325 + shift) % 360}, 95%, 62%, 0.2)`);
        auraGrad.addColorStop(1, `hsla(${(340 + shift) % 360}, 95%, 60%, 0.14)`);

        const coreAmpRatio = Math.min(1, h / 172);

        const drawSpinePath = (ampScale: number, freqMult: number, speedMult: number) => {
          coreCtx.beginPath();
          for (let i = 0; i <= 72; i++) {
            const p = i / 72;
            const x = leftX + span * p;
            const env = Math.sin(p * Math.PI);
            const y = cy + Math.sin(p * Math.PI * freqMult - t * speedMult) * ampScale * coreAmpRatio * env;
            if (i === 0) coreCtx.moveTo(x, y);
            else coreCtx.lineTo(x, y);
          }
        };

        drawSpinePath(15, 2.0, 1.4);
        coreCtx.strokeStyle = auraGrad;
        coreCtx.lineWidth = 28;
        coreCtx.lineCap = 'round';
        coreCtx.stroke();

        drawSpinePath(12, 2.4, 1.8);
        coreCtx.strokeStyle = auraGrad;
        coreCtx.lineWidth = 12;
        coreCtx.stroke();

        // 2. Multi-strand interwoven harmonic plasma filaments (all Left->Right, 1.5x amplitude)
        const beamConfigs = [
          { amp: 45, freq: 3.1, speed: 1.5, hue: 185, width: 2.3, alpha: 0.72 },
          { amp: 33, freq: 4.8, speed: 1.9, hue: 205, width: 1.7, alpha: 0.56 },
          { amp: 51, freq: 2.2, speed: 2.3, hue: 325, width: 1.9, alpha: 0.62 },
          { amp: 27, freq: 6.2, speed: 2.7, hue: 162, width: 1.25, alpha: 0.48 },
          { amp: 39, freq: 3.8, speed: 2.4, hue: 278, width: 1.4, alpha: 0.5 },
        ];

        beamConfigs.forEach((b, idx) => {
          drawSpinePath(b.amp, b.freq, b.speed);
          const strandGrad = coreCtx.createLinearGradient(leftX, cy, rightX, cy);
          const h0 = (b.hue + t * 22 + idx * 18) % 360;
          const h1 = (h0 + 48) % 360;
          const h2 = (h0 + 96) % 360;
          strandGrad.addColorStop(0, `hsla(${h0}, 95%, 64%, ${b.alpha})`);
          strandGrad.addColorStop(0.5, `hsla(${h1}, 96%, 68%, ${b.alpha})`);
          strandGrad.addColorStop(1, `hsla(${h2}, 95%, 64%, ${b.alpha})`);
          coreCtx.strokeStyle = strandGrad;
          coreCtx.lineWidth = b.width;
          coreCtx.stroke();
        });

        // 3. White-hot inner core beam spine (Left->Right, 1.5x amplitude)
        drawSpinePath(10.8, 2.2, 1.9);
        coreCtx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
        coreCtx.lineWidth = 1.4;
        coreCtx.stroke();

        // 4. Traveling photon pulse packets gliding along the core (Left->Right, 1.5x amplitude)
        for (let k = 0; k < 4; k++) {
          const p = ((t * 0.24 + k * 0.25) % 1);
          const px = leftX + span * p;
          const env = Math.sin(p * Math.PI);
          const py = cy + Math.sin(p * Math.PI * 2.2 - t * 1.9) * 10.8 * env;
          const pulseHue = (180 + p * 180 + t * 35) % 360;
          const pGrad = coreCtx.createRadialGradient(px, py, 0.3, px, py, 8.5);
          pGrad.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
          pGrad.addColorStop(0.35, `hsla(${pulseHue}, 95%, 66%, 0.6)`);
          pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          coreCtx.fillStyle = pGrad;
          coreCtx.beginPath();
          coreCtx.arc(px, py, 8.5, 0, Math.PI * 2);
          coreCtx.fill();
        }

        // 5. Beam-flowing spectral micro-particles (Left->Right, 1.5x wave amplitude)
        particlesRef.current.forEach((pt) => {
          if (advance) {
            pt.t += pt.speed;
            if (pt.t > 1) pt.t = 0;
          }
          const x = leftX + span * pt.t;
          const env = Math.sin(pt.t * Math.PI);
          const waveY = Math.sin(pt.t * Math.PI * 3.4 - t * 2.1 + pt.phase * 0.15) * 33 * env;
          const y = cy + waveY + pt.offsetY * env * 1.0;
          const hue = (pt.hueOffset + pt.t * 170 + t * 32) % 360;
          const alpha = 0.24 + env * 0.56;

          // Soft chromatic rainbow halo
          coreCtx.beginPath();
          coreCtx.arc(x, y, pt.size * 1.65, 0, Math.PI * 2);
          coreCtx.fillStyle = `hsla(${hue}, 94%, 64%, ${alpha * 0.22})`;
          coreCtx.fill();

          // Crisp saturated center
          coreCtx.beginPath();
          coreCtx.arc(x, y, pt.size * 0.72, 0, Math.PI * 2);
          coreCtx.fillStyle = `hsla(${hue}, 96%, 68%, ${alpha})`;
          coreCtx.fill();
        });

        // 6. Subtle Rainbow Radiating Energy Particles (미세 무지개 방사 파티클)
        for (let i = 0; i < rainbowParticlesRef.current.length; i++) {
          const rp = rainbowParticlesRef.current[i];
          if (advance) {
            rp.life += rp.decay;
            if (rp.life >= 1) {
              rainbowParticlesRef.current[i] = createRainbowParticle(false);
              continue;
            }
            rp.hue = (rp.hue + rp.hueSpeed + 360) % 360;
          }

          const baseX =
            rp.origin === 'left'
              ? leftX
              : rp.origin === 'right'
                ? rightX
                : leftX + span * rp.xNorm;
          const baseEnv = rp.origin === 'beam' ? Math.sin(rp.xNorm * Math.PI) : 1;
          const baseWave =
            rp.origin === 'beam'
              ? Math.sin(rp.xNorm * Math.PI * 2.6 - t * 1.9) * 24 * baseEnv
              : 0;

          const ageFrames = rp.life / rp.decay;
          const px = baseX + rp.vx * ageFrames * 0.56;
          const py = cy + baseWave + rp.yOffset * baseEnv + rp.vy * ageFrames * 0.56;
          const fade = Math.sin(rp.life * Math.PI);
          const alpha = rp.maxAlpha * fade;

          if (alpha <= 0.015) continue;

          // Subtle soft prismatic aura
          coreCtx.beginPath();
          coreCtx.arc(px, py, rp.size * 1.75, 0, Math.PI * 2);
          coreCtx.fillStyle = `hsla(${rp.hue}, 94%, 64%, ${alpha * 0.24})`;
          coreCtx.fill();

          // Fine micro-spark core
          coreCtx.beginPath();
          coreCtx.arc(px, py, rp.size * 0.85, 0, Math.PI * 2);
          coreCtx.fillStyle = `hsla(${rp.hue}, 96%, 70%, ${alpha})`;
          coreCtx.fill();
        }

        // 6b. Ultra-fine microscopic white stardust particles (미세 흰색 파티클)
        whiteDustRef.current.forEach((wd) => {
          if (advance) {
            wd.t += wd.speed;
            if (wd.t > 1) wd.t = 0;
          }
          const x = leftX + span * wd.t;
          const env = Math.sin(wd.t * Math.PI);
          const waveY = Math.sin(wd.t * Math.PI * 2.8 - t * 2.0) * 27 * env;
          const y = cy + waveY + wd.offsetY * env + Math.sin(t * 2.4 + wd.twinklePhase) * wd.driftY * 14;
          const twinkle = 0.45 + 0.55 * Math.sin(t * 4.5 + wd.twinklePhase);
          const alpha = wd.alpha * env * twinkle;
          if (alpha <= 0.02) return;

          coreCtx.beginPath();
          coreCtx.arc(x, y, wd.size, 0, Math.PI * 2);
          coreCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          coreCtx.fill();
        });

        // 7. Radiant Emitter & Receiver Core Orbs with rotating harmonic rings
        const drawActiveOrb = (
          x: number,
          coreColor: string,
          secondaryHue: number,
          label: string,
          dir: number
        ) => {
          const outerGlow = coreCtx.createRadialGradient(x, cy, 2, x, cy, 34);
          outerGlow.addColorStop(0, '#ffffff');
          outerGlow.addColorStop(0.22, coreColor);
          outerGlow.addColorStop(0.55, `hsla(${(secondaryHue + t * 35) % 360}, 95%, 62%, 0.35)`);
          outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
          coreCtx.fillStyle = outerGlow;
          coreCtx.beginPath();
          coreCtx.arc(x, cy, 34, 0, Math.PI * 2);
          coreCtx.fill();

          // Outer counter-rotating dashed orbital ring
          coreCtx.save();
          coreCtx.translate(x, cy);
          coreCtx.rotate(t * 1.15 * dir);
          coreCtx.setLineDash([7, 5]);
          coreCtx.strokeStyle = `hsla(${(secondaryHue + t * 40) % 360}, 95%, 72%, 0.72)`;
          coreCtx.lineWidth = 1.4;
          coreCtx.beginPath();
          coreCtx.arc(0, 0, 19 + Math.sin(t * 2.4) * 1.2, 0, Math.PI * 2);
          coreCtx.stroke();

          // Inner crisp orbital ring
          coreCtx.rotate(-t * 2.4 * dir);
          coreCtx.setLineDash([4, 4]);
          coreCtx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          coreCtx.lineWidth = 1.1;
          coreCtx.beginPath();
          coreCtx.arc(0, 0, 12.5, 0, Math.PI * 2);
          coreCtx.stroke();
          coreCtx.setLineDash([]);
          coreCtx.restore();

          coreCtx.save();
          coreCtx.globalCompositeOperation = 'source-over';
          coreCtx.fillStyle = '#e2e8f0';
          coreCtx.font = '700 10px Pretendard, sans-serif';
          coreCtx.textAlign = 'center';
          coreCtx.fillText(label, x, cy + 34);
          coreCtx.restore();
        };

        drawActiveOrb(leftX, '#00f2fe', 185, advance ? '송신' : '송신 (정지)', 1);
        drawActiveOrb(rightX, '#f72585', 325, advance ? '수신' : '수신 (정지)', -1);

        coreCtx.restore();

        if (!advance) {
          coreCtx.fillStyle = 'rgba(148, 163, 184, 0.85)';
          coreCtx.font = '600 9.5px Pretendard, sans-serif';
          coreCtx.textAlign = 'right';
          coreCtx.fillText('⏸️ 파형 정지 • 타이머 실행 시 활성화', w - 10, h - 8);
        }

        coreCtx.restore();
      }

      // 2. Oscilloscope High-Freq Canvas
      const waveCtx = waveCanvas.getContext('2d');
      if (waveCtx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = waveCanvas.width / dpr;
        const h = waveCanvas.height / dpr;
        waveCtx.save();
        waveCtx.scale(dpr, dpr);
        waveCtx.clearRect(0, 0, w, h);

        // Grid
        waveCtx.strokeStyle = advance
          ? 'rgba(0, 187, 249, 0.08)'
          : 'rgba(148, 163, 184, 0.07)';
        waveCtx.lineWidth = 1;
        for (let x = 0; x < w; x += 26) {
          waveCtx.beginPath();
          waveCtx.moveTo(x, 0);
          waveCtx.lineTo(x, h);
          waveCtx.stroke();
        }
        for (let y = 0; y < h; y += 26) {
          waveCtx.beginPath();
          waveCtx.moveTo(0, y);
          waveCtx.lineTo(w, y);
          waveCtx.stroke();
        }

        waveCtx.save();
        waveCtx.globalAlpha = advance ? 1 : 0.62;

        const cy = h / 2;
        const samples = 110;
        const waveAmpRatio = Math.min(1, h / 144);

        // Sigma probability density fill + line (all Left->Right)
        const sigmaPoints: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= samples; i++) {
          const p = i / samples;
          const x = p * w;
          const psi1 = Math.sin(p * Math.PI * 4 - t * 1.7) * 44 * waveAmpRatio;
          const psi2 = Math.sin(p * Math.PI * 10 - t * 2.8) * 24 * waveAmpRatio;
          const sigmaY = cy + (psi1 + psi2) * 0.75;
          sigmaPoints.push({ x, y: sigmaY });
        }

        const fillGrad = waveCtx.createLinearGradient(0, 0, 0, h);
        fillGrad.addColorStop(0, 'rgba(0, 187, 249, 0.25)');
        fillGrad.addColorStop(0.5, 'rgba(0, 187, 249, 0.04)');
        fillGrad.addColorStop(1, 'rgba(0, 187, 249, 0.22)');

        waveCtx.beginPath();
        waveCtx.moveTo(0, cy);
        sigmaPoints.forEach((pt) => waveCtx.lineTo(pt.x, pt.y));
        waveCtx.lineTo(w, cy);
        waveCtx.closePath();
        waveCtx.fillStyle = fillGrad;
        waveCtx.fill();

        // psi1 (Cyan - Left->Right)
        waveCtx.beginPath();
        for (let i = 0; i <= samples; i++) {
          const p = i / samples;
          const x = p * w;
          const y = cy + Math.sin(p * Math.PI * 4 - t * 1.7) * 44 * waveAmpRatio;
          if (i === 0) waveCtx.moveTo(x, y);
          else waveCtx.lineTo(x, y);
        }
        waveCtx.strokeStyle = '#00f2fe';
        waveCtx.lineWidth = 1.6;
        waveCtx.stroke();

        // psi2 (Pink - Left->Right)
        waveCtx.beginPath();
        for (let i = 0; i <= samples; i++) {
          const p = i / samples;
          const x = p * w;
          const y = cy + Math.sin(p * Math.PI * 10 - t * 2.8) * 24 * waveAmpRatio;
          if (i === 0) waveCtx.moveTo(x, y);
          else waveCtx.lineTo(x, y);
        }
        waveCtx.strokeStyle = '#f72585';
        waveCtx.lineWidth = 1.3;
        waveCtx.stroke();

        // Sigma line (Blue)
        waveCtx.beginPath();
        sigmaPoints.forEach((pt, idx) => {
          if (idx === 0) waveCtx.moveTo(pt.x, pt.y);
          else waveCtx.lineTo(pt.x, pt.y);
        });
        waveCtx.strokeStyle = '#00bbf9';
        waveCtx.lineWidth = 2;
        waveCtx.stroke();

        waveCtx.restore();

        if (!advance) {
          waveCtx.fillStyle = 'rgba(148, 163, 184, 0.85)';
          waveCtx.font = '600 9.5px Pretendard, sans-serif';
          waveCtx.textAlign = 'right';
          waveCtx.fillText('⏸️ 파형 정지 • 타이머 실행 시 활성화', w - 10, h - 8);
        }

        waveCtx.restore();
      }

      if (advance) {
        rafId = requestAnimationFrame(() => renderFrame(true));
      }
    };

    const redrawOnResize = () => {
      handleResize();
      if (!isActive) {
        renderFrame(false);
      }
    };

    const resizeObs = new ResizeObserver(redrawOnResize);
    if (coreCanvas.parentElement) resizeObs.observe(coreCanvas.parentElement);
    if (waveCanvas.parentElement) resizeObs.observe(waveCanvas.parentElement);

    if (isActive) {
      rafId = requestAnimationFrame(() => renderFrame(true));
    } else {
      renderFrame(false);
    }

    return () => {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
    };
  }, [isActive, viewportMode]);

  const timeLabel = activeSource
    ? activeSource.isContinuous
      ? '연속 가동'
      : formatTimeClock(activeSource.remainingSeconds)
    : '00:00';

  return (
    <div className="glass-panel rounded-2xl p-3.5 mb-3 shadow-xl">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isActive ? 'bg-cyan-400 shadow-[0_0_8px_#00f2fe] animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="text-sm font-bold text-slate-100">⚡ 실시간 수신 파형</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
              isActive
                ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            {isActive ? '⚡ 수신 파형 활성' : '⏸️ 타이머 미연결 (멈춤)'}
          </span>
          <span className="font-mono-hud text-sm font-bold text-cyan-300 tabular-nums">
            {timeLabel}
          </span>
        </div>
      </div>

      {/* Waveform 1: Core Beam */}
      <div className="rounded-xl bg-black/55 border border-white/10 p-2 mb-2.5">
        <div className="flex items-center justify-between text-[11px] mb-1 px-1">
          <span className="font-semibold text-slate-200">01. 코어 전송 빔</span>
          <span className={`font-mono-hud ${isActive ? 'text-cyan-300' : 'text-slate-400'}`}>
            {isActive ? '⚡ 전송 펄스 활성' : '⏸️ 동작 정지 (대기)'}
          </span>
        </div>
        <div className="w-full h-[148px] md:h-[172px] overflow-hidden rounded-lg">
          <canvas ref={coreCanvasRef} className="block w-full h-full" />
        </div>
      </div>

      {/* Waveform 2: High-Frequency Interferometer */}
      <div className="rounded-xl bg-black/55 border border-white/10 p-2">
        <div className="flex items-center justify-between text-[11px] mb-1 px-1">
          <span className="font-semibold text-slate-200">02. 고주파 간섭계</span>
          <span className={`font-mono-hud ${isActive ? 'text-pink-400' : 'text-slate-400'}`}>
            {isActive ? '🌊 간섭 파형 동기화' : '⏸️ 파형 정지 (대기)'}
          </span>
        </div>
        <div className="w-full h-[120px] md:h-[144px] overflow-hidden rounded-lg">
          <canvas ref={waveCanvasRef} className="block w-full h-full" />
        </div>
      </div>
    </div>
  );
};
