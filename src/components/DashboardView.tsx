import React, { useEffect, useRef } from 'react';
import { EnergySource } from '../types/energy';

interface DashboardViewProps {
  sources: EnergySource[];
  hourlyData: number[];
  onResetAll: () => void;
  viewportMode: 'mockup' | 'fullscreen';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sources,
  hourlyData,
  onResetAll,
  viewportMode,
}) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);

  const totalSeconds = sources.reduce((sum, s) => sum + s.totalSupplied, 0);
  const totalKwh = (totalSeconds * 0.00028).toFixed(3);
  const activeCount = sources.filter((s) => s.active).length;
  const efficiency = Math.min(99, 85 + activeCount * 2);

  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;

    const drawChart = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(parent.clientWidth, 240);
      const h = 170;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const padLeft = 26;
      const padRight = 14;
      const padTop = 18;
      const padBottom = 26;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      const maxVal = Math.max(120, ...hourlyData);
      const stepX = plotW / Math.max(hourlyData.length - 1, 1);

      // Horizontal guide lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let g = 0; g <= 3; g++) {
        const gy = padTop + (plotH * g) / 3;
        ctx.beginPath();
        ctx.moveTo(padLeft, gy);
        ctx.lineTo(w - padRight, gy);
        ctx.stroke();
      }

      const points = hourlyData.map((val, idx) => ({
        x: padLeft + idx * stepX,
        y: padTop + plotH - (val / maxVal) * plotH,
      }));

      // Gradient fill
      const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
      grad.addColorStop(0, 'rgba(0, 242, 254, 0.35)');
      grad.addColorStop(1, 'rgba(0, 242, 254, 0.0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, padTop + plotH);
      points.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.lineTo(points[points.length - 1].x, padTop + plotH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Points & Hour Labels
      points.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00f2fe';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        if (idx % 2 === 0 || idx === points.length - 1) {
          ctx.fillStyle = '#64748b';
          ctx.font = '500 9.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${idx + 1}h`, pt.x, h - 8);
        }
      });

      ctx.restore();
    };

    drawChart();
    const ro = new ResizeObserver(drawChart);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      ro.disconnect();
    };
  }, [hourlyData, viewportMode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
          누적 통계 및 대시보드
        </span>
        <button
          type="button"
          onClick={onResetAll}
          className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-xs font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-cyan-300 transition cursor-pointer"
        >
          초기화
        </button>
      </div>

      {/* 2x2 Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="glass-panel rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-400">총 충전 에너지</div>
          <div className="font-mono-hud text-lg sm:text-xl font-bold text-cyan-300 mt-1 tabular-nums">
            {totalKwh} kWh
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">▲ 전일 대비 +18.4%</div>
        </div>

        <div className="glass-panel rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-400">활성 스트림 수</div>
          <div className="font-mono-hud text-lg sm:text-xl font-bold text-white mt-1 tabular-nums">
            {activeCount} 개
          </div>
          <div className="text-[11px] text-slate-400 mt-1">안정적 분산 공급 중</div>
        </div>

        <div className="glass-panel rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-400">에너지 공급 효율</div>
          <div className="font-mono-hud text-lg sm:text-xl font-bold text-sky-400 mt-1 tabular-nums">
            {efficiency}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">최적 밸런스 유지</div>
        </div>

        <div className="glass-panel rounded-2xl p-3.5">
          <div className="text-[11px] text-slate-400">보안 상태</div>
          <div className="font-mono-hud text-lg sm:text-xl font-bold text-emerald-400 mt-1">
            SECURE
          </div>
          <div className="text-[11px] text-slate-400 mt-1">4-Digit PIN 보호됨</div>
        </div>
      </div>

      {/* Hourly Chart */}
      <div className="glass-panel rounded-2xl p-3.5">
        <div className="text-xs font-bold text-slate-200 mb-2">
          시간대별 에너지 충전 추이 (12H)
        </div>
        <div className="w-full h-[170px] overflow-hidden">
          <canvas ref={chartRef} className="block w-full h-full" />
        </div>
      </div>

      {/* Category Distribution */}
      <div>
        <div className="text-xs font-bold tracking-wider text-slate-300 mb-2.5">
          공급원별 누적 점유율
        </div>
        <div className="glass-panel rounded-2xl p-3.5 space-y-3">
          {sources.map((src) => {
            const pct = totalSeconds > 0 ? Math.round((src.totalSupplied / totalSeconds) * 100) : 0;
            const hrs = Math.floor(src.totalSupplied / 3600);
            const mins = Math.floor((src.totalSupplied % 3600) / 60);

            return (
              <div key={src.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{src.icon}</span>
                    <span className="text-slate-200 font-medium truncate">{src.name}</span>
                  </div>
                  <span className="font-mono-hud text-slate-300 shrink-0 tabular-nums">
                    {hrs}시간 {mins}분 ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct > 0 ? Math.max(pct, 2) : 0}%`,
                      backgroundColor: src.color,
                      boxShadow: pct > 0 ? `0 0 8px ${src.color}88` : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
