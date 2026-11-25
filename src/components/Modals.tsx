import React from 'react';

interface PinSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const PinSettingsModal: React.FC<PinSettingsModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl p-5 w-full max-w-[350px] text-center border border-white/15 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">🔒 보안 비밀번호 안내</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="text-4xl my-3">🛡️</div>

        <div className="inline-block px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-bold mb-3">
          현재 고정 보안 PIN: 5098
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          현재 버전은 안전한 서비스 체험을 위해 관리자 고정 비밀번호(<strong>5098</strong>)로 운영 중입니다.
          <br />
          <br />
          <span className="text-amber-400 font-semibold">
            💡 사용자 개별 비밀번호 변경 기능은 향후 유료화 정식 서비스 전환 시 제공됩니다.
          </span>
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-sm cursor-pointer"
        >
          확인
        </button>
      </div>
    </div>
  );
};

interface InstallGuideModalProps {
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isInAppBrowser: boolean;
  shareUrl: string;
  onNativeInstall: () => Promise<boolean>;
  onShareLink: () => Promise<void>;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  open,
  onClose,
  onDownload,
  isInstallable,
  isInstalled,
  isIOS,
  isInAppBrowser,
  shareUrl,
  onNativeInstall,
  onShareLink,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl p-5 w-full max-w-[380px] max-h-[90dvh] overflow-y-auto border border-cyan-400/25 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm sm:text-base font-bold text-white">
            📲 앱 설치 및 링크 공유
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/10 mb-3">
          <img
            src={
              (typeof window !== 'undefined' &&
                (window as unknown as { __INLINE_ICON_192__?: string }).__INLINE_ICON_192__) ||
              `${import.meta.env.BASE_URL}pwa-192x192.png`
            }
            alt="Life Energy Cloud 아이콘"
            className="w-12 h-12 rounded-xl border border-cyan-400/40 shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">Life Energy Cloud v2.4</div>
            <div className="text-[11px] text-cyan-300 leading-snug mt-0.5">
              설치 후 스마트폰에서 실행하면 무조건 <strong>스마트모드</strong>(전용 전체화면 앱)로 실행됩니다.
            </div>
          </div>
        </div>

        {/* Native One-Tap PWA Install CTA */}
        {!isInstalled && isInstallable && (
          <button
            type="button"
            onClick={async () => {
              const accepted = await onNativeInstall();
              if (accepted) onClose();
            }}
            className="w-full py-3 mb-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-extrabold text-sm shadow-[0_0_20px_rgba(0,242,254,0.35)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
          >
            📲 지금 바로 앱 설치하기
          </button>
        )}

        {isInstalled && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 text-xs font-semibold text-center">
            ✅ 이미 앱이 설치되어 스마트모드로 실행 중입니다
          </div>
        )}

        {/* KakaoTalk / In-App Browser warning */}
        {isInAppBrowser && !isInstalled && (
          <div className="mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-[11px] text-amber-200 leading-relaxed">
            <strong>⚠️ 카카오톡·네이버 등 인앱 브라우저 감지됨</strong>
            <br />
            우측 하단 또는 상단 <strong>[⋮ / ⎋] → [다른 브라우저로 열기 (Chrome / Safari)]</strong>를 누르면 홈 화면 설치가 바로 가능합니다.
          </div>
        )}

        {/* Shareable Install Link Section */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-white/10 mb-3 space-y-2">
          <div className="text-[11px] font-bold text-cyan-300">
            🔗 설치 링크 공유하기
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            아래 링크를 카카오톡·문자 등으로 공유하면 받는 분도 스마트폰에 바로 설치할 수 있습니다.
          </p>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 px-2.5 py-2 rounded-lg bg-black/55 border border-white/10 text-[11px] font-mono-hud text-slate-200 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={onShareLink}
              className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-xs font-bold hover:bg-cyan-500/30 transition cursor-pointer shrink-0"
            >
              공유/복사
            </button>
          </div>
          <p className="text-[10px] text-slate-400/90 leading-snug">
            💡 공유 링크는 반드시 기본 브라우저(Chrome / Safari)로 열어 주세요. 카카오톡 인앱 브라우저에서는 로딩이 멈출 수 있습니다.
          </p>
        </div>

        {/* Manual Browser Install Steps */}
        {!isInstalled && (
          <div className="text-xs text-slate-300 leading-relaxed space-y-2.5 my-3">
            <div className={isIOS ? 'p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30' : ''}>
              <strong className="text-cyan-300 block mb-0.5">🍎 아이폰 / iPad (Safari):</strong>
              1. 화면 하단 중앙 <span className="text-white font-bold">[공유 ⎋]</span> 아이콘 터치
              <br />
              2. 메뉴에서 <span className="text-white font-bold">[홈 화면에 추가 ➕]</span> 선택
            </div>
            <div className={!isIOS ? 'p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/25' : ''}>
              <strong className="text-emerald-400 block mb-0.5">
                🤖 갤럭시 / 안드로이드 (Chrome / 삼성 인터넷):
              </strong>
              1. 상단 <span className="text-white font-bold">[지금 바로 앱 설치하기]</span> 또는 우측 상단{' '}
              <span className="text-white font-bold">[더보기 ⋮]</span> 터치
              <br />
              2. <span className="text-white font-bold">[앱 설치]</span> 또는{' '}
              <span className="text-white font-bold">[홈 화면에 추가]</span> 선택
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={onDownload}
            className="flex-1 py-2.5 rounded-xl bg-slate-800/90 border border-cyan-400/35 text-cyan-200 font-bold text-xs hover:border-cyan-400/60 cursor-pointer"
          >
            📥 GitHub 실행파일(index.html)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-slate-200 font-bold text-xs cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
