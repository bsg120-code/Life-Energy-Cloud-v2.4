import React, { useEffect, useState } from 'react';
import { EnergySource } from '../types/energy';
import { formatDurationKorean, formatTimeClock } from '../utils/formatters';
import { DualTimerWaveforms } from './DualTimerWaveforms';

interface TimerViewProps {
  sources: EnergySource[];
  activeSource: EnergySource | null;
  selectedSourceId?: string;
  viewportMode: 'mockup' | 'fullscreen';
  onToggleSource: (id: string) => void;
  onStopSource: (id: string) => void;
  onEndContinuous: () => void;
  onSliderChange: (id: string, value: number) => void;
  onQuickAdjust: (id: string, deltaSeconds: number) => void;
  onSetCustomTime: (id: string, totalSeconds: number, customNote?: string) => void;
  onGlobalControl: (action: 'toggle' | 'stop' | 'reset') => void;
}

export const TimerView: React.FC<TimerViewProps> = ({
  sources,
  activeSource,
  viewportMode,
  onToggleSource,
  onStopSource,
  onEndContinuous,
  onSliderChange,
  onQuickAdjust,
  onSetCustomTime,
  onGlobalControl,
}) => {
  const customSource = sources.find((s) => s.isCustom);
  const [customHours, setCustomHours] = useState<string>('0');
  const [customMinutes, setCustomMinutes] = useState<string>('45');
  const [customSeconds, setCustomSeconds] = useState<string>('0');
  const [customNote, setCustomNote] = useState<string>('');

  // Keep H/M/S inputs synced when customSource remainingSeconds changes externally (reset/quick adjust) when idle
  useEffect(() => {
    if (!customSource || customSource.active) return;
    const total = Math.max(0, customSource.remainingSeconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    setCustomHours(String(h));
    setCustomMinutes(String(m));
    setCustomSeconds(String(s));
  }, [customSource?.remainingSeconds, customSource?.active]);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSource) return;
    const h = Math.max(0, Math.min(23, parseInt(customHours || '0', 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(customMinutes || '0', 10) || 0));
    const s = Math.max(0, Math.min(59, parseInt(customSeconds || '0', 10) || 0));
    const total = h * 3600 + m * 60 + s;
    onSetCustomTime(customSource.id, total > 0 ? total : 60, customNote);
  };

  return (
    <div className="space-y-3">
      {/* 1. Dual Realtime Receiving Waveforms */}
      <DualTimerWaveforms activeSource={activeSource} viewportMode={viewportMode} />

      {/* 2. Current Active Timer Spotlight Panel */}
      <div
        className={`rounded-2xl p-3 border transition ${
          activeSource
            ? 'glass-panel border-cyan-400/40 shadow-[0_0_18px_rgba(0,242,254,0.12)]'
            : 'bg-slate-900/50 border-white/10'
        }`}
      >
        {!activeSource ? (
          <div className="text-xs text-slate-400 text-center py-1">
            ⚪ 대기 모드 • 하단 공급원 타이머가 시작되면 실시간 수신 파형이 활성화됩니다
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-cyan-300">⚡ 현재 가동 타이머 (단독)</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-cyan-200 font-semibold">
                단독 가동 중
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/45 border border-white/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{
                    backgroundColor: `${activeSource.color}22`,
                    border: `1px solid ${activeSource.color}66`,
                  }}
                >
                  {activeSource.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{activeSource.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{activeSource.sub}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono-hud text-base font-bold text-cyan-300 tabular-nums">
                  {activeSource.isContinuous
                    ? formatTimeClock(activeSource.elapsedSeconds)
                    : formatTimeClock(activeSource.remainingSeconds)}
                </span>
                <button
                  type="button"
                  onClick={() => onStopSource(activeSource.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/45 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition cursor-pointer"
                >
                  정지
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Single Timer Control Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onGlobalControl('toggle')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
            activeSource
              ? 'bg-rose-500/15 border-rose-400/60 text-rose-200 hover:bg-rose-500/25'
              : 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/25'
          }`}
        >
          {activeSource ? '⏸ 일시정지' : '▶ 타이머 시작'}
        </button>

        <button
          type="button"
          onClick={() => onGlobalControl('stop')}
          className="py-2.5 px-2 rounded-xl text-xs font-bold bg-slate-800/80 border border-white/10 text-slate-200 hover:border-rose-400/50 hover:text-rose-200 transition cursor-pointer whitespace-nowrap"
        >
          ⏹ 타이머 정지
        </button>

        <button
          type="button"
          onClick={() => onGlobalControl('reset')}
          className="py-2.5 px-2 rounded-xl text-xs font-bold bg-slate-800/80 border border-white/10 text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200 transition cursor-pointer whitespace-nowrap"
        >
          ↺ 시간 리셋
        </button>
      </div>

      {/* 4. Energy Sources Header */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-bold tracking-wider text-slate-300">
          에너지 공급원 (ENERGY SOURCES)
        </span>
        <span className="text-[11px] font-semibold text-cyan-300">
          단일 독점 가동 모드 (1개 전용)
        </span>
      </div>

      {/* 5. Energy Source Cards */}
      <div>
        <div
          className={`grid gap-2.5 ${
            viewportMode === 'fullscreen' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
        {sources.map((src) => {
          const sliderVal =
            src.unit === 'hour'
              ? Math.max(src.min ?? 1, Math.round(src.remainingSeconds / 3600))
              : Math.min(
                  src.max ?? 120,
                  Math.max(src.min ?? 1, Math.round(src.remainingSeconds / 60))
                );

          return (
            <div
              key={src.id}
              className={`glass-panel source-card-accent rounded-2xl p-3.5 pl-4 transition ${
                src.active
                  ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(0,242,254,0.16)]'
                  : 'border-white/10'
              }`}
              style={
                {
                  '--card-accent': src.color,
                  '--card-glow': `${src.color}55`,
                  ...(src.active
                    ? { borderColor: `${src.color}99`, boxShadow: `0 0 18px ${src.color}30` }
                    : {}),
                } as React.CSSProperties
              }
            >
              {/* Top Row */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{
                      backgroundColor: `${src.color}22`,
                      border: `1px solid ${src.color}55`,
                    }}
                  >
                    {src.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-white truncate">{src.name}</h4>
                      {src.isContinuous && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[10px] font-bold">
                          ♾️ 연속 공급
                        </span>
                      )}
                      {src.isCustom && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/40 text-sky-300 text-[10px] font-bold">
                          🎛️ 맞춤 설정
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{src.sub}</p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  aria-label={`${src.name} 스위치`}
                  onClick={() => onToggleSource(src.id)}
                  className={`cyber-switch ${src.active ? 'on' : ''}`}
                >
                  <span className="cyber-switch-thumb" />
                </button>
              </div>

              {/* Controls Area */}
              {src.isContinuous ? (
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block">실시간 연속 경과</span>
                    <span
                      className="font-mono-hud text-lg font-bold tabular-nums"
                      style={{ color: src.active ? src.color : '#cbd5e1' }}
                    >
                      {formatTimeClock(src.elapsedSeconds)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onEndContinuous}
                    disabled={!src.active && src.elapsedSeconds === 0}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      src.active
                        ? 'bg-rose-500/20 border-rose-400/60 text-rose-200 hover:bg-rose-500/30'
                        : 'bg-slate-800/80 border-white/10 text-slate-400 disabled:opacity-50'
                    }`}
                  >
                    ⏹️ 충전 종료
                  </button>
                </div>
              ) : (
                <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      설정 시간: {formatDurationKorean(src.remainingSeconds)}
                    </span>
                    <span
                      className="font-mono-hud text-base font-bold tabular-nums"
                      style={{ color: src.active ? src.color : '#e2e8f0' }}
                    >
                      {formatTimeClock(src.remainingSeconds)}
                    </span>
                  </div>

                  {/* Direct H/M/S + Memo input for 고객설정 (Custom Timer) */}
                  {src.isCustom && (
                    <form
                      onSubmit={handleApplyCustom}
                      className="p-2.5 rounded-xl bg-black/40 border border-sky-400/25 space-y-2"
                    >
                      <div className="grid grid-cols-3 gap-1.5">
                        <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                          <span>시간 (시)</span>
                          <input
                            type="number"
                            min={0}
                            max={23}
                            value={customHours}
                            onChange={(e) => setCustomHours(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono-hud text-white text-center focus:outline-none focus:border-sky-400"
                          />
                        </label>
                        <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                          <span>분</span>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={customMinutes}
                            onChange={(e) => setCustomMinutes(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono-hud text-white text-center focus:outline-none focus:border-sky-400"
                          />
                        </label>
                        <label className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                          <span>초</span>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={customSeconds}
                            onChange={(e) => setCustomSeconds(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono-hud text-white text-center focus:outline-none focus:border-sky-400"
                          />
                        </label>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={customNote}
                          onChange={(e) => setCustomNote(e.target.value)}
                          placeholder="용도 메모 (예: 저온 조리, 명상)"
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-sky-500/25 border border-sky-400/50 text-sky-200 text-[11px] font-bold hover:bg-sky-500/35 transition cursor-pointer shrink-0"
                        >
                          적용
                        </button>
                      </div>
                    </form>
                  )}

                  <input
                    type="range"
                    min={src.min ?? 1}
                    max={src.max ?? 120}
                    step={src.step ?? 1}
                    value={sliderVal}
                    onChange={(e) => onSliderChange(src.id, parseInt(e.target.value, 10))}
                    className="cyber-slider w-full"
                  />

                  <div className="flex items-center gap-1.5">
                    {src.quickButtons.map((qb) => (
                      <button
                        key={qb.label}
                        type="button"
                        onClick={() => onQuickAdjust(src.id, qb.deltaSeconds)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 text-[11px] font-semibold text-slate-200 hover:border-cyan-400/50 hover:text-cyan-300 transition cursor-pointer"
                      >
                        {qb.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};
