import React, { useEffect, useRef, useState } from 'react';
import { Atom, Bolt, RefreshCw, Sparkles, Volume2, VolumeX, Hand } from 'lucide-react';
import { EnergySource, QUANTUM_MODES, QuantumModeId } from '../types/energy';
import { quantumHum, sounds } from '../engines/audioEngine';

interface QuantumReceivingViewProps {
  activeSource: EnergySource | null;
  receivingPackets: number;
  viewportMode: 'mockup' | 'fullscreen';
}

interface CoreParticle {
  t: number;
  speed: number;
  lane: number;
  offsetY: number;
  size: number;
  hueOffset: number;
}

interface QuantumRainbowSpark {
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
  origin: 'beam' | 'emitter' | 'receiver';
}

interface QuantumWhiteDust {
  t: number;
  speed: number;
  offsetY: number;
  driftY: number;
  size: number;
  alpha: number;
  twinklePhase: number;
}

export const QuantumReceivingView: React.FC<QuantumReceivingViewProps> = ({
  activeSource,
  receivingPackets,
  viewportMode,
}) => {
  const [mode, setMode] = useState<QuantumModeId>('superconducting');
  const [audioOn, setAudioOn] = useState(false);
  const [freq, setFreq] = useState(2.4);
  const [amp, setAmp] = useState(45);
  const [speed, setSpeed] = useState(1.25);
  const [harmonics, setHarmonics] = useState(3);

  const coreCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerCoreRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const pointerWaveRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const particlesRef = useRef<CoreParticle[]>([]);
  const rainbowSparksRef = useRef<QuantumRainbowSpark[]>([]);
  const whiteDustRef = useRef<QuantumWhiteDust[]>([]);
  const phaseRef = useRef(1.15);

  const isRunning = Boolean(activeSource);
  const modeInfo = QUANTUM_MODES[mode];

  const createQuantumSpark = (initial = false): QuantumRainbowSpark => {
    const roll = Math.random();
    const origin: 'beam' | 'emitter' | 'receiver' =
      roll < 0.6 ? 'beam' : roll < 0.8 ? 'emitter' : 'receiver';
    const angle =
      origin === 'beam'
        ? (Math.random() < 0.5 ? -1 : 1) * (Math.PI * 0.18 + Math.random() * Math.PI * 0.64)
        : Math.random() * Math.PI * 2;
    const mag = origin === 'beam' ? 0.34 + Math.random() * 0.86 : 0.38 + Math.random() * 0.94;
    return {
      xNorm: origin === 'beam' ? 0.04 + Math.random() * 0.92 : origin === 'emitter' ? 0 : 1,
      yOffset: origin === 'beam' ? (Math.random() - 0.5) * 42 : 0,
      vx: Math.cos(angle) * mag * 0.6,
      vy: Math.sin(angle) * mag,
      life: initial ? Math.random() : 0,
      decay: 0.007 + Math.random() * 0.012,
      size: 0.55 + Math.random() * 1.15,
      hue: Math.random() * 360,
      hueSpeed: (Math.random() - 0.5) * 1.6,
      maxAlpha: 0.2 + Math.random() * 0.4,
      origin,
    };
  };

  if (particlesRef.current.length === 0) {
    for (let i = 0; i < 200; i++) {
      particlesRef.current.push({
        t: Math.random(),
        speed: 0.0032 + Math.random() * 0.009,
        lane: (i % 5) - 2,
        offsetY: (Math.random() - 0.5) * 28,
        size: 0.78 + Math.random() * 1.4,
        hueOffset: (i * 17) % 360,
      });
    }
  }

  if (rainbowSparksRef.current.length === 0) {
    for (let i = 0; i < 160; i++) {
      rainbowSparksRef.current.push(createQuantumSpark(true));
    }
  }

  if (whiteDustRef.current.length === 0) {
    for (let i = 0; i < 115; i++) {
      whiteDustRef.current.push({
        t: Math.random(),
        speed: 0.0024 + Math.random() * 0.006,
        offsetY: (Math.random() - 0.5) * 76,
        driftY: (Math.random() - 0.5) * 0.4,
        size: 0.35 + Math.random() * 0.42,
        alpha: 0.22 + Math.random() * 0.38,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  useEffect(() => {
    if (audioOn) {
      quantumHum.updateParameters(freq, harmonics);
    }
  }, [freq, harmonics, audioOn]);

  useEffect(() => {
    return () => {
      quantumHum.stop();
    };
  }, []);

  const toggleAudioHum = () => {
    sounds.playTap();
    if (audioOn) {
      quantumHum.stop();
      setAudioOn(false);
    } else {
      quantumHum.start(freq, harmonics);
      setAudioOn(true);
    }
  };

  useEffect(() => {
    const coreCanvas = coreCanvasRef.current;
    const waveCanvas = waveCanvasRef.current;
    if (!coreCanvas || !waveCanvas) return;

    const resize = (canvas: HTMLCanvasElement) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(parent.clientWidth, 260);
      const h = Math.max(parent.clientHeight, 160);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };

    const handleResize = () => {
      resize(coreCanvas);
      resize(waveCanvas);
    };
    handleResize();

    let rafId = 0;

    const drawFrame = (advance: boolean) => {
      if (advance) {
        phaseRef.current += 0.03 * speed;
      }
      const t = phaseRef.current;

      // Upper Core Canvas
      const cCtx = coreCanvas.getContext('2d');
      if (cCtx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = coreCanvas.width / dpr;
        const h = coreCanvas.height / dpr;
        cCtx.save();
        cCtx.scale(dpr, dpr);
        cCtx.clearRect(0, 0, w, h);

        const cy = h / 2;
        const lx = Math.max(52, w * 0.14);
        const rx = Math.min(w - 52, w * 0.86);
        const span = rx - lx;

        // Subtle grid
        cCtx.strokeStyle = advance
          ? 'rgba(0, 245, 212, 0.05)'
          : 'rgba(148, 163, 184, 0.05)';
        cCtx.lineWidth = 1;
        for (let x = 0; x < w; x += 36) {
          cCtx.beginPath();
          cCtx.moveTo(x, 0);
          cCtx.lineTo(x, h);
          cCtx.stroke();
        }

        const ptr = pointerCoreRef.current;
        const modeFactor = mode === 'burst' ? 1.55 : mode === 'resonance' ? 0.85 : 1.15;

        // Additive light blending for vivid quantum core transmission beam (dimmed when paused)
        cCtx.save();
        cCtx.globalCompositeOperation = 'lighter';
        cCtx.globalAlpha = advance ? 1 : 0.54;

        const traceLanePath = (lane: number, ampScale = 1.08) => {
          cCtx.beginPath();
          for (let i = 0; i <= 80; i++) {
            const p = i / 80;
            const x = lx + span * p;
            const env = Math.sin(p * Math.PI);
            const baseLaneY = lane * 26 * env;
            const waveDelta =
              baseLaneY +
              Math.sin(p * Math.PI * (2 + Math.abs(lane)) - t * (1.8 + lane * 0.25)) *
                (amp * ampScale * modeFactor) *
                env;
            let y = cy + Math.max(-(cy - 16), Math.min(cy - 16, waveDelta));

            if (ptr.active) {
              const dx = x - ptr.x;
              const dy = y - ptr.y;
              const dist = Math.hypot(dx, dy);
              if (dist < 110) {
                const force = (1 - dist / 110) * 28;
                y += (dy >= 0 ? 1 : -1) * force;
              }
            }

            if (i === 0) cCtx.moveTo(x, y);
            else cCtx.lineTo(x, y);
          }
        };

        // 1. Volumetric spectral plasma beam aura (Left->Right, 1.5x wave amplitude)
        const shift = (t * 32) % 360;
        const beamAuraGrad = cCtx.createLinearGradient(lx, cy, rx, cy);
        beamAuraGrad.addColorStop(0, `hsla(${(172 + shift) % 360}, 95%, 60%, 0.16)`);
        beamAuraGrad.addColorStop(0.32, `hsla(${(200 + shift) % 360}, 95%, 62%, 0.22)`);
        beamAuraGrad.addColorStop(0.65, `hsla(${(275 + shift) % 360}, 92%, 65%, 0.2)`);
        beamAuraGrad.addColorStop(1, `hsla(${(330 + shift) % 360}, 95%, 62%, 0.16)`);

        traceLanePath(0, 0.66);
        cCtx.strokeStyle = beamAuraGrad;
        cCtx.lineWidth = 34;
        cCtx.lineCap = 'round';
        cCtx.stroke();

        traceLanePath(0, 0.78);
        cCtx.strokeStyle = beamAuraGrad;
        cCtx.lineWidth = 14;
        cCtx.stroke();

        // 2. 5-lane interwoven spectral harmonic filaments (Left->Right, 1.5x amplitude)
        const laneHues = [172, 198, 224, 282, 330];
        for (let lane = -2; lane <= 2; lane++) {
          traceLanePath(lane, 1.08);
          const baseHue = (laneHues[lane + 2] + t * 24) % 360;
          const laneGrad = cCtx.createLinearGradient(lx, cy, rx, cy);
          laneGrad.addColorStop(0, `hsla(${baseHue}, 95%, 65%, ${lane === 0 ? 0.85 : 0.5})`);
          laneGrad.addColorStop(0.5, `hsla(${(baseHue + 52) % 360}, 95%, 70%, ${lane === 0 ? 0.9 : 0.56})`);
          laneGrad.addColorStop(1, `hsla(${(baseHue + 104) % 360}, 95%, 65%, ${lane === 0 ? 0.85 : 0.5})`);
          cCtx.strokeStyle = laneGrad;
          cCtx.lineWidth = lane === 0 ? 2.6 : 1.5;
          cCtx.stroke();
        }

        // 3. White-hot inner core spine (Left->Right, 1.5x amplitude)
        traceLanePath(0, 0.66);
        cCtx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
        cCtx.lineWidth = 1.45;
        cCtx.stroke();

        // 4. Traveling photon pulse flares along the stream (Left->Right, 1.5x amplitude)
        const speedMult = mode === 'burst' ? 1.8 : mode === 'resonance' ? 1.1 : 1.4;
        for (let k = 0; k < 5; k++) {
          const p = (t * 0.22 * speedMult + k * 0.2) % 1;
          const px = lx + span * p;
          const env = Math.sin(p * Math.PI);
          const waveDelta = Math.sin(p * Math.PI * 2 - t * 1.8) * (amp * 0.66 * modeFactor) * env;
          let py = cy + Math.max(-(cy - 16), Math.min(cy - 16, waveDelta));
          if (ptr.active) {
            const dist = Math.hypot(px - ptr.x, py - ptr.y);
            if (dist < 110) py += (py >= ptr.y ? 1 : -1) * (1 - dist / 110) * 24;
          }
          const pHue = (170 + p * 190 + t * 38) % 360;
          const pGlow = cCtx.createRadialGradient(px, py, 0.4, px, py, 10);
          pGlow.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
          pGlow.addColorStop(0.35, `hsla(${pHue}, 95%, 66%, 0.62)`);
          pGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          cCtx.fillStyle = pGlow;
          cCtx.beginPath();
          cCtx.arc(px, py, 10, 0, Math.PI * 2);
          cCtx.fill();
        }

        // 5. Beam-flowing spectral particles (Left->Right, 1.5x amplitude)
        particlesRef.current.forEach((pt) => {
          if (advance) {
            pt.t += pt.speed * speed * speedMult;
            if (pt.t > 1) pt.t = 0;
          }
          const x = lx + span * pt.t;
          const env = Math.sin(pt.t * Math.PI);
          const rawOffset =
            pt.lane * 26 * env +
            Math.sin(pt.t * Math.PI * 3 - t * 2) * 42 * env +
            pt.offsetY * env * 1.25;
          let y = cy + Math.max(-(cy - 14), Math.min(cy - 14, rawOffset));

          if (ptr.active) {
            const dx = x - ptr.x;
            const dy = y - ptr.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 110) {
              y += (dy >= 0 ? 1 : -1) * (1 - dist / 110) * 24;
            }
          }

          const hue = (pt.hueOffset + pt.t * 175 + t * 30) % 360;
          const alpha = 0.25 + env * 0.58;

          cCtx.beginPath();
          cCtx.arc(x, y, pt.size * 1.65, 0, Math.PI * 2);
          cCtx.fillStyle = `hsla(${hue}, 94%, 64%, ${alpha * 0.22})`;
          cCtx.fill();

          cCtx.beginPath();
          cCtx.arc(x, y, pt.size * 0.72, 0, Math.PI * 2);
          cCtx.fillStyle = `hsla(${hue}, 96%, 68%, ${alpha})`;
          cCtx.fill();
        });

        // 6. Subtle Rainbow Radiating Energy Particles (미세 무지개 방사 파티클)
        for (let i = 0; i < rainbowSparksRef.current.length; i++) {
          const sp = rainbowSparksRef.current[i];
          if (advance) {
            sp.life += sp.decay * (0.85 + speed * 0.2);
            if (sp.life >= 1) {
              rainbowSparksRef.current[i] = createQuantumSpark(false);
              continue;
            }
            sp.hue = (sp.hue + sp.hueSpeed + 360) % 360;
          }

          const baseX =
            sp.origin === 'emitter'
              ? lx
              : sp.origin === 'receiver'
                ? rx
                : lx + span * sp.xNorm;
          const baseEnv = sp.origin === 'beam' ? Math.sin(sp.xNorm * Math.PI) : 1;
          const baseWave =
            sp.origin === 'beam'
              ? Math.sin(sp.xNorm * Math.PI * 2.5 - t * 1.8) * (amp * 0.72 * modeFactor) * baseEnv
              : 0;

          const ageFrames = sp.life / sp.decay;
          const px = baseX + sp.vx * ageFrames * 0.64;
          let py = cy + baseWave + sp.yOffset * baseEnv + sp.vy * ageFrames * 0.64;

          if (ptr.active) {
            const dist = Math.hypot(px - ptr.x, py - ptr.y);
            if (dist < 110) {
              py += (py >= ptr.y ? 1 : -1) * (1 - dist / 110) * 18;
            }
          }

          const fade = Math.sin(sp.life * Math.PI);
          const alpha = sp.maxAlpha * fade;
          if (alpha <= 0.015) continue;

          cCtx.beginPath();
          cCtx.arc(px, py, sp.size * 1.75, 0, Math.PI * 2);
          cCtx.fillStyle = `hsla(${sp.hue}, 94%, 64%, ${alpha * 0.24})`;
          cCtx.fill();

          cCtx.beginPath();
          cCtx.arc(px, py, sp.size * 0.85, 0, Math.PI * 2);
          cCtx.fillStyle = `hsla(${sp.hue}, 96%, 70%, ${alpha})`;
          cCtx.fill();
        }

        // 6b. Ultra-fine microscopic white stardust particles (미세 흰색 파티클)
        whiteDustRef.current.forEach((wd) => {
          if (advance) {
            wd.t += wd.speed * speed * speedMult;
            if (wd.t > 1) wd.t = 0;
          }
          const x = lx + span * wd.t;
          const env = Math.sin(wd.t * Math.PI);
          const waveY = Math.sin(wd.t * Math.PI * 2.6 - t * 1.9) * (amp * 0.66 * modeFactor) * env;
          let y =
            cy +
            waveY +
            wd.offsetY * env +
            Math.sin(t * 2.3 + wd.twinklePhase) * wd.driftY * 18;

          if (ptr.active) {
            const dist = Math.hypot(x - ptr.x, y - ptr.y);
            if (dist < 110) {
              y += (y >= ptr.y ? 1 : -1) * (1 - dist / 110) * 18;
            }
          }

          const twinkle = 0.45 + 0.55 * Math.sin(t * 4.5 + wd.twinklePhase);
          const alpha = wd.alpha * env * twinkle;
          if (alpha <= 0.02) return;

          cCtx.beginPath();
          cCtx.arc(x, y, wd.size, 0, Math.PI * 2);
          cCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          cCtx.fill();
        });

        // Interactive cyan-prismatic distortion ripple around pointer
        if (ptr.active) {
          for (let r = 1; r <= 3; r++) {
            const radius = ((t * 45 + r * 24) % 75) + 10;
            cCtx.beginPath();
            cCtx.arc(ptr.x, ptr.y, radius, 0, Math.PI * 2);
            cCtx.strokeStyle = `hsla(${(175 + r * 45 + t * 35) % 360}, 95%, 70%, ${1 - radius / 90})`;
            cCtx.lineWidth = 1.5;
            cCtx.stroke();
          }
        }

        // 7. Rotating EMITTER and RECEIVER orbs with multi-ring halos
        const drawCoreOrb = (
          x: number,
          color: string,
          hueBase: number,
          label: string,
          dir: number
        ) => {
          const glow = cCtx.createRadialGradient(x, cy, 4, x, cy, 44);
          glow.addColorStop(0, '#ffffff');
          glow.addColorStop(0.24, color);
          glow.addColorStop(0.58, `hsla(${(hueBase + t * 35) % 360}, 95%, 62%, 0.34)`);
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          cCtx.fillStyle = glow;
          cCtx.beginPath();
          cCtx.arc(x, cy, 44, 0, Math.PI * 2);
          cCtx.fill();

          cCtx.save();
          cCtx.translate(x, cy);
          cCtx.rotate(t * dir);
          cCtx.strokeStyle = `hsla(${(hueBase + t * 40) % 360}, 95%, 72%, 0.8)`;
          cCtx.lineWidth = 1.6;
          cCtx.setLineDash([8, 6]);
          cCtx.beginPath();
          cCtx.arc(0, 0, 26 + Math.sin(t * 2) * 1.4, 0, Math.PI * 2);
          cCtx.stroke();

          cCtx.rotate(-t * dir * 2.2);
          cCtx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
          cCtx.lineWidth = 1.1;
          cCtx.setLineDash([4, 5]);
          cCtx.beginPath();
          cCtx.arc(0, 0, 17, 0, Math.PI * 2);
          cCtx.stroke();
          cCtx.setLineDash([]);
          cCtx.restore();

          cCtx.save();
          cCtx.globalCompositeOperation = 'source-over';
          cCtx.fillStyle = '#e2e8f0';
          cCtx.font = '700 10px "JetBrains Mono", monospace';
          cCtx.textAlign = 'center';
          cCtx.fillText(label, x, cy + 44);
          cCtx.restore();
        };

        drawCoreOrb(lx, '#00f5d4', 175, advance ? 'EMITTER' : 'EMITTER (대기)', 1.4);
        drawCoreOrb(rx, '#f72585', 325, advance ? 'RECEIVER' : 'RECEIVER (대기)', -1.4);

        cCtx.restore();

        if (!advance) {
          cCtx.fillStyle = 'rgba(148, 163, 184, 0.88)';
          cCtx.font = '600 10.5px Pretendard, sans-serif';
          cCtx.textAlign = 'center';
          cCtx.fillText('⏸️ 파형 정지 • 타이머 실행 시 활성화됩니다', w / 2, h - 14);
        }

        cCtx.restore();
      }

      // Lower Oscilloscope Canvas
      const wCtx = waveCanvas.getContext('2d');
      if (wCtx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = waveCanvas.width / dpr;
        const h = waveCanvas.height / dpr;
        wCtx.save();
        wCtx.scale(dpr, dpr);
        wCtx.clearRect(0, 0, w, h);

        wCtx.strokeStyle = advance
          ? 'rgba(0, 187, 249, 0.08)'
          : 'rgba(148, 163, 184, 0.07)';
        wCtx.lineWidth = 1;
        for (let x = 0; x < w; x += 30) {
          wCtx.beginPath();
          wCtx.moveTo(x, 0);
          wCtx.lineTo(x, h);
          wCtx.stroke();
        }
        for (let y = 0; y < h; y += 30) {
          wCtx.beginPath();
          wCtx.moveTo(0, y);
          wCtx.lineTo(w, y);
          wCtx.stroke();
        }

        wCtx.save();
        wCtx.globalAlpha = advance ? 1 : 0.62;

        const cy = h / 2;
        const ampPx = Math.min(h * 0.45, (amp / 100) * (h * 0.76));
        const ptr = pointerWaveRef.current;
        const samples = 140;

        const sigmaPts: Array<{ x: number; y: number }> = [];
        const psi1Pts: Array<{ x: number; y: number }> = [];
        const psi2Pts: Array<{ x: number; y: number }> = [];

        for (let i = 0; i <= samples; i++) {
          const p = i / samples;
          const x = p * w;
          let ripple = 0;
          if (ptr.active) {
            const dist = Math.abs(x - ptr.x);
            if (dist < 95) {
              ripple = Math.sin(dist * 0.18 - t * 6) * (1 - dist / 95) * 18;
            }
          }

          const y1 = Math.sin(p * Math.PI * 2 * freq - t * 2) * ampPx + ripple;
          const y2 = Math.sin(p * Math.PI * 2 * freq * harmonics - t * 2.5) * (ampPx * 0.45);
          const ySum = (y1 + y2) * 0.72;

          psi1Pts.push({ x, y: cy + y1 });
          psi2Pts.push({ x, y: cy + y2 });
          sigmaPts.push({ x, y: cy + ySum });
        }

        const grad = wCtx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(0, 187, 249, 0.28)');
        grad.addColorStop(0.5, 'rgba(0, 187, 249, 0.04)');
        grad.addColorStop(1, 'rgba(0, 187, 249, 0.24)');

        wCtx.beginPath();
        wCtx.moveTo(0, cy);
        sigmaPts.forEach((pt) => wCtx.lineTo(pt.x, pt.y));
        wCtx.lineTo(w, cy);
        wCtx.closePath();
        wCtx.fillStyle = grad;
        wCtx.fill();

        const strokePath = (pts: Array<{ x: number; y: number }>, color: string, width: number) => {
          wCtx.beginPath();
          pts.forEach((pt, idx) => {
            if (idx === 0) wCtx.moveTo(pt.x, pt.y);
            else wCtx.lineTo(pt.x, pt.y);
          });
          wCtx.strokeStyle = color;
          wCtx.lineWidth = width;
          wCtx.stroke();
        };

        strokePath(psi1Pts, '#00f5d4', 1.7);
        strokePath(psi2Pts, '#f72585', 1.4);
        strokePath(sigmaPts, '#00bbf9', 2.2);

        wCtx.restore();

        if (!advance) {
          wCtx.fillStyle = 'rgba(148, 163, 184, 0.85)';
          wCtx.font = '600 10px "JetBrains Mono", monospace';
          wCtx.textAlign = 'right';
          wCtx.fillText('⏸️ 파형 정지 • 대기 중', w - 12, h - 12);
        }

        wCtx.restore();
      }

      if (advance) {
        rafId = requestAnimationFrame(() => drawFrame(true));
      }
    };

    const redrawOnResize = () => {
      handleResize();
      if (!isRunning) {
        drawFrame(false);
      }
    };

    const ro = new ResizeObserver(redrawOnResize);
    if (coreCanvas.parentElement) ro.observe(coreCanvas.parentElement);
    if (waveCanvas.parentElement) ro.observe(waveCanvas.parentElement);

    if (isRunning) {
      rafId = requestAnimationFrame(() => drawFrame(true));
    } else {
      drawFrame(false);
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [isRunning, mode, freq, amp, speed, harmonics, viewportMode]);

  const updatePointer = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    refObj: React.MutableRefObject<{ x: number; y: number; active: boolean }>
  ) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    refObj.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
      active: true,
    };
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-3.5 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-cyan-950 border border-cyan-400/50 glow-cyan">
            <Atom className={`w-5 h-5 text-cyan-300 ${isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <h2 className="font-tech text-sm font-bold tracking-wider text-white">
              QUANTUM <span className="text-cyan-300 text-glow-cyan">TRANSMISSION</span> FLUX
            </h2>
            <p className="font-mono-hud text-[10px] text-cyan-400/75 tracking-wider">
              Subatomic Energy Transfer &amp; Waveform Field
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono-hud ml-auto">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-slate-400 text-[9px]">FLUX TRANSFER RATE</span>
            <span className="text-cyan-300 font-bold">{modeInfo.rate}</span>
          </div>
          <div className="hidden md:flex flex-col text-right">
            <span className="text-slate-400 text-[9px]">ENTANGLEMENT</span>
            <span className="text-pink-400 font-bold">{modeInfo.entanglement}</span>
          </div>
          <button
            type="button"
            onClick={toggleAudioHum}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono-hud flex items-center gap-1.5 cursor-pointer transition ${
              audioOn
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50'
            }`}
          >
            {audioOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{audioOn ? 'AUDIO ON' : 'AUDIO OFF'}</span>
          </button>
        </div>
      </div>

      {/* 1. Core Energy Transmission Stream */}
      <div className="glass-panel rounded-2xl p-3.5 border border-cyan-500/20">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="font-tech text-xs sm:text-sm font-semibold text-white">
              01. CORE ENERGY TRANSMISSION STREAM
            </h3>
            <span className="text-[10px] font-mono-hud text-cyan-300/80">· INTERACTIVE VECTOR</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'superconducting', label: '초전도 방출', Icon: Bolt },
                { id: 'resonance', label: '공명 포집', Icon: RefreshCw },
                { id: 'burst', label: '양자 펄스', Icon: Sparkles },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setMode(id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono-hud border transition cursor-pointer flex items-center gap-1 ${
                    active
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative w-full h-[280px] sm:h-[360px] rounded-xl overflow-hidden bg-black/65 border border-cyan-500/20">
          <canvas
            ref={coreCanvasRef}
            onMouseMove={(e) => updatePointer(e, pointerCoreRef)}
            onMouseLeave={() => {
              pointerCoreRef.current.active = false;
            }}
            onTouchStart={(e) => updatePointer(e, pointerCoreRef)}
            onTouchMove={(e) => updatePointer(e, pointerCoreRef)}
            onTouchEnd={() => {
              pointerCoreRef.current.active = false;
            }}
            className="w-full h-full block cursor-crosshair touch-none"
          />

          <div className="hidden md:flex absolute bottom-2.5 left-3 pointer-events-none text-[10px] font-mono-hud text-cyan-300/80 bg-black/65 px-2 py-1 rounded border border-white/10 items-center gap-1">
            <Hand className="w-3 h-3 text-cyan-400" />
            <span>마우스/터치로 양자 에너지장 왜곡 및 방출 유도</span>
          </div>

          <div className="absolute top-2.5 right-3 pointer-events-none flex flex-col gap-1.5 text-right font-mono-hud">
            <div className="bg-black/75 px-2.5 py-1 rounded-lg border border-cyan-500/30">
              <span className="text-slate-400 text-[9px] block">PLASMA DENSITY</span>
              <span className="font-bold text-cyan-300 text-xs">{modeInfo.density}</span>
            </div>
            <div className="bg-black/75 px-2.5 py-1 rounded-lg border border-pink-500/30">
              <span className="text-slate-400 text-[9px] block">FLUX EFFICIENCY</span>
              <span className="font-bold text-pink-400 text-xs">{modeInfo.efficiency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quantum Wave Harmonics & Resonance */}
      <div className="glass-panel rounded-2xl p-3.5 border border-cyan-500/20">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <h3 className="font-tech text-xs sm:text-sm font-semibold text-white">
              02. QUANTUM WAVE HARMONICS &amp; RESONANCE
            </h3>
            <span className="text-[10px] font-mono-hud text-pink-300/80">· OSCILLOSCOPE</span>
          </div>
          <div className="text-[11px] font-mono-hud">
            <span className="text-slate-400 mr-1.5">STATE:</span>
            <span className="text-cyan-300 font-bold">{modeInfo.stateBadge}</span>
          </div>
        </div>

        <div className="relative w-full h-[196px] sm:h-[240px] rounded-xl overflow-hidden bg-black/65 border border-blue-500/20">
          <canvas
            ref={waveCanvasRef}
            onMouseMove={(e) => updatePointer(e, pointerWaveRef)}
            onMouseLeave={() => {
              pointerWaveRef.current.active = false;
            }}
            onTouchStart={(e) => updatePointer(e, pointerWaveRef)}
            onTouchMove={(e) => updatePointer(e, pointerWaveRef)}
            onTouchEnd={() => {
              pointerWaveRef.current.active = false;
            }}
            className="w-full h-full block cursor-ew-resize touch-none"
          />

          <div className="absolute top-2 left-2.5 pointer-events-none flex items-center gap-3 text-[10px] font-mono-hud bg-black/65 px-2.5 py-1 rounded border border-white/10">
            <span className="flex items-center gap-1 text-cyan-300">
              <span className="w-2.5 h-0.5 bg-cyan-300 inline-block" /> ψ₁ 기본파
            </span>
            <span className="flex items-center gap-1 text-pink-400">
              <span className="w-2.5 h-0.5 bg-pink-400 inline-block" /> ψ₂ 고주파
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> Σ 확률 밀도
            </span>
          </div>
        </div>

        {/* 4 Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 p-3 rounded-xl glass-panel-sub">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono-hud">
              <span className="text-slate-300">공명 주파수</span>
              <span className="text-cyan-300 font-bold">{freq.toFixed(2)} Hz</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={6.0}
              step={0.1}
              value={freq}
              onChange={(e) => setFreq(parseFloat(e.target.value))}
              className="cyber-slider w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono-hud">
              <span className="text-slate-300">에너지 진폭</span>
              <span className="text-sky-400 font-bold">{amp.toFixed(1)} %</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={1}
              value={amp}
              onChange={(e) => setAmp(parseFloat(e.target.value))}
              className="cyber-slider w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono-hud">
              <span className="text-slate-300">전달 속도</span>
              <span className="text-pink-400 font-bold">{speed.toFixed(2)} c</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.05}
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="cyber-slider w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono-hud">
              <span className="text-slate-300">고주파 간섭</span>
              <span className="text-purple-300 font-bold">{harmonics}차 양자 간섭</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={harmonics}
              onChange={(e) => setHarmonics(parseInt(e.target.value, 10))}
              className="cyber-slider w-full"
            />
          </div>
        </div>
      </div>

      {/* Bottom Packet Status Bar */}
      <div className="glass-panel rounded-xl px-3.5 py-3 flex items-center justify-between border border-cyan-500/20 text-xs font-mono-hud">
        <div className="flex items-center gap-2">
          <span className="health-dot" />
          <span className="text-slate-200">클라우드 허브 에너지 수신 정상</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">수신 패킷:</span>
          <span className="text-cyan-300 font-bold tabular-nums">
            {receivingPackets.toLocaleString()} pkts
          </span>
        </div>
      </div>
    </div>
  );
};
