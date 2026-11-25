import React from 'react';
import { DeviceNode } from '../types/energy';

interface NetworkViewProps {
  devices: DeviceNode[];
  onToggleDevice: (id: string) => void;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ devices, onToggleDevice }) => {
  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-slate-300">
          연동 디바이스 노드 (DEVICES)
        </span>
        <span className="text-xs font-bold text-emerald-400 tabular-nums">
          {onlineCount}대 온라인
        </span>
      </div>

      <div className="space-y-2.5">
        {devices.map((device) => (
          <div
            key={device.id}
            className={`glass-panel rounded-2xl p-3.5 transition ${
              device.isDesktop && device.online
                ? 'border-cyan-400/35 bg-slate-900/80'
                : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    device.isDesktop
                      ? 'bg-cyan-500/15 border border-cyan-400/40'
                      : 'bg-slate-800/80 border border-white/10'
                  }`}
                >
                  {device.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{device.name}</h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{device.sub}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleDevice(device.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shrink-0 whitespace-nowrap ${
                  device.online
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {device.online ? `연동 중 • ${device.syncPercent}%` : '연동 해제됨'}
              </button>
            </div>

            {device.specs && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-white/10">
                {device.specs.map((spec) => (
                  <span
                    key={spec.label}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono-hud border ${
                      spec.tone === 'green'
                        ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
                        : 'bg-cyan-500/10 border-cyan-400/30 text-cyan-300'
                    }`}
                  >
                    {spec.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
