import React from 'react';
import { Download } from 'lucide-react';
import { sounds } from '../engines/audioEngine';

interface PWAInstallButtonProps {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstall: () => Promise<boolean>;
  onOpenGuide: () => void;
  variant?: 'header' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  isInstallable,
  isInstalled,
  isIOS,
  onInstall,
  onOpenGuide,
  variant = 'header',
}) => {
  // Automatically suppress install UI when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    sounds.playTap();
    if (isInstallable) {
      const accepted = await onInstall();
      if (!accepted) {
        onOpenGuide();
      }
    } else {
      onOpenGuide();
    }
  };

  if (variant === 'banner') {
    return (
      <div className="mx-3 mt-2 mb-0.5 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-sky-500/15 to-violet-500/15 border border-cyan-400/40 px-3 py-2 flex items-center justify-between gap-2 shadow-[0_6px_18px_rgba(0,242,254,0.12)]">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={
              (typeof window !== 'undefined' &&
                (window as unknown as { __INLINE_ICON_192__?: string }).__INLINE_ICON_192__) ||
              `${import.meta.env.BASE_URL}pwa-192x192.png`
            }
            alt=""
            className="w-8 h-8 rounded-lg shrink-0 border border-cyan-400/35"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              Life Energy Cloud 앱 설치
            </div>
            <div className="text-[10px] text-cyan-200/85 truncate">
              {isInstallable
                ? '원터치 설치 · 설치 후 스마트모드 자동 실행'
                : isIOS
                  ? 'Safari 공유 → 홈 화면에 추가 시 스마트모드 실행'
                  : '홈 화면에 설치하면 스마트모드로 바로 실행됩니다'}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition shadow-[0_0_12px_rgba(0,242,254,0.4)]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>설치</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-[11px] font-bold flex items-center gap-1 hover:bg-cyan-500/30 active:scale-95 transition cursor-pointer shrink-0"
      title={isInstallable ? '앱 바로 설치' : '홈 화면 앱 설치 안내'}
    >
      <Download className="w-3.5 h-3.5" />
      <span>앱 설치</span>
    </button>
  );
};
