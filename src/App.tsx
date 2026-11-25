import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DeviceNode,
  EnergySource,
  INITIAL_DEVICES,
  INITIAL_HOURLY_DATA,
  INITIAL_SOURCES,
  ScreenTab,
} from './types/energy';
import { energyCarrier, sounds } from './engines/audioEngine';
import { createPrecisionTimerWorker } from './engines/timerWorker';
import {
  downloadAppSnapshotHtml,
  formatDurationKorean,
  formatTimeClock,
} from './utils/formatters';
import { TimerView } from './components/TimerView';
import { QuantumReceivingView } from './components/QuantumReceivingView';
import { DashboardView } from './components/DashboardView';
import { NetworkView } from './components/NetworkView';
import { GiftView } from './components/GiftView';
import { PinLockOverlay } from './components/PinLockOverlay';
import { InstallGuideModal, PinSettingsModal } from './components/Modals';
import { GeminiAdvisorModal } from './components/GeminiAdvisorModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useOnlineStatus } from './hooks/useOnlineStatus';

interface ToastState {
  id: number;
  message: string;
  tone: 'success' | 'warning' | 'info';
}

function cloneInitialSources(): EnergySource[] {
  return INITIAL_SOURCES.map((s) => ({
    ...s,
    quickButtons: s.quickButtons.map((qb) => ({ ...qb })),
  }));
}

export default function App() {
  const {
    isInstallable,
    isInstalled,
    isSmartMode,
    isIOS,
    isInAppBrowser,
    openedFromInstallLink,
    install: triggerNativeInstall,
    getShareInstallUrl,
    shareInstallLink,
  } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const [viewportMode, setViewportMode] = useState<'mockup' | 'fullscreen'>(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(max-width: 767px)').matches ||
      /android|iphone|ipod|mobile/i.test(window.navigator.userAgent))
      ? 'fullscreen'
      : 'mockup'
  );
  const [activeTab, setActiveTab] = useState<ScreenTab>('timer');
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [showPinSettings, setShowPinSettings] = useState<boolean>(false);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  const [showAiAdvisor, setShowAiAdvisor] = useState<boolean>(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState<boolean>(false);

  // Once installed (or on smartphones), Smart Mode always forces fullscreen native-like layout
  const effectiveViewportMode: 'mockup' | 'fullscreen' = isSmartMode ? 'fullscreen' : viewportMode;

  const [sources, setSources] = useState<EnergySource[]>(() => cloneInitialSources());
  const [lastCandidateId, setLastCandidateId] = useState<string>('basic');
  const [hourlyData, setHourlyData] = useState<number[]>(() => [...INITIAL_HOURLY_DATA]);
  const [devices, setDevices] = useState<DeviceNode[]>(() =>
    INITIAL_DEVICES.map((d) => ({ ...d }))
  );
  const [receivingPackets, setReceivingPackets] = useState<number>(1420);
  const [clockTime, setClockTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [toast, setToast] = useState<ToastState | null>(null);

  const lastTickTimeRef = useRef<number>(Date.now());
  const sourcesRef = useRef<EnergySource[]>(sources);
  sourcesRef.current = sources;

  const activeSource = useMemo(
    () => sources.find((s) => s.active) ?? null,
    [sources]
  );

  const showToast = useCallback(
    (message: string, tone: 'success' | 'warning' | 'info' = 'info') => {
      const id = Date.now();
      setToast({ id, message, tone });
      window.setTimeout(() => {
        setToast((prev) => (prev && prev.id === id ? null : prev));
      }, 3600);
    },
    []
  );

  // Unconditionally enforce Smart Mode (fullscreen) on smartphones & installed smartphone PWAs
  useEffect(() => {
    if (isSmartMode) {
      setViewportMode('fullscreen');
    }
  }, [isSmartMode]);

  // If opened from a shared install link (?install=1) and not yet installed, prompt installation automatically
  useEffect(() => {
    if (openedFromInstallLink && !isInstalled) {
      setShowInstallGuide(true);
    }
  }, [openedFromInstallLink, isInstalled]);

  // Live clock every 1s
  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setClockTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
    };
    updateClock();
    const id = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Request browser Notification permission gently on first timer activation
  const ensureNotificationPermission = useCallback(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const notifyTimerCompleted = useCallback(
    (sourceName: string) => {
      sounds.playComplete();
      showToast(`⚡ ${sourceName} 타이머가 완료되었습니다!`, 'success');
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('Life Energy Cloud', {
            body: `[Life Energy Cloud] ${sourceName} 완료!`,
          });
        } catch {
          // ignore notification error in sandboxed iframe
        }
      }
    },
    [showToast]
  );

  // Apply elapsed seconds to active source
  const applyDeltaSeconds = useCallback(
    (deltaSec: number) => {
      if (deltaSec <= 0) return;

      let completedName: string | null = null;
      let hasActive = false;

      setSources((prev) =>
        prev.map((src) => {
          if (!src.active) return src;
          hasActive = true;

          if (src.isContinuous) {
            return {
              ...src,
              elapsedSeconds: src.elapsedSeconds + deltaSec,
              totalSupplied: src.totalSupplied + deltaSec,
            };
          }

          const nextRemaining = Math.max(0, src.remainingSeconds - deltaSec);
          const actualConsumed = src.remainingSeconds - nextRemaining;

          if (nextRemaining === 0) {
            completedName = src.name;
            return {
              ...src,
              remainingSeconds: 0,
              totalSupplied: src.totalSupplied + actualConsumed,
              active: false,
            };
          }

          return {
            ...src,
            remainingSeconds: nextRemaining,
            totalSupplied: src.totalSupplied + actualConsumed,
          };
        })
      );

      if (hasActive) {
        const packetInc = (1 + Math.floor(Math.random() * 3)) * Math.min(deltaSec, 5);
        setReceivingPackets((p) => p + packetInc);
      }

      if (completedName) {
        notifyTimerCompleted(completedName);
      }
    },
    [notifyTimerCompleted]
  );

  // Manage EnergyCarrierEngine lifecycle based on activeSource
  useEffect(() => {
    if (activeSource) {
      energyCarrier.start(activeSource.name);
    } else {
      energyCarrier.stop();
    }
  }, [activeSource?.id, Boolean(activeSource)]);

  // Cleanup carrier on unmount
  useEffect(() => {
    return () => {
      energyCarrier.destroy();
    };
  }, []);

  // Precision Timer Worker + VisibilityChange recovery
  useEffect(() => {
    if (!activeSource) return;

    lastTickTimeRef.current = Date.now();

    const workerHandle = createPrecisionTimerWorker((timestamp) => {
      const now = timestamp || Date.now();
      const deltaSec = Math.round((now - lastTickTimeRef.current) / 1000) || 1;
      lastTickTimeRef.current = now;
      applyDeltaSeconds(deltaSec);
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const deltaSec = Math.max(0, Math.round((now - lastTickTimeRef.current) / 1000));
        lastTickTimeRef.current = now;
        if (deltaSec > 0) {
          applyDeltaSeconds(deltaSec);
        }
        energyCarrier.resumeOnVisibility();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      workerHandle.stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [Boolean(activeSource), applyDeltaSeconds]);

  // Exclusive 1-active-only source toggle
  const handleToggleSource = useCallback(
    (id: string) => {
      const target = sourcesRef.current.find((s) => s.id === id);
      if (!target) return;

      const willTurnOn = !target.active;
      sounds.playToggle(willTurnOn);

      if (willTurnOn) {
        ensureNotificationPermission();
        setLastCandidateId(id);
        setSources((prev) =>
          prev.map((src) => {
            if (src.id === id) {
              // If countdown reached 0 previously, restore initialSeconds before starting
              const restoredRemaining =
                !src.isContinuous && src.remainingSeconds <= 0
                  ? src.initialSeconds
                  : src.remainingSeconds;
              return { ...src, active: true, remainingSeconds: restoredRemaining };
            }
            return { ...src, active: false };
          })
        );
      } else {
        setSources((prev) =>
          prev.map((src) => (src.id === id ? { ...src, active: false } : src))
        );
      }
    },
    [ensureNotificationPermission]
  );

  const handleStopSource = useCallback((id: string) => {
    sounds.playToggle(false);
    setSources((prev) =>
      prev.map((src) => (src.id === id ? { ...src, active: false } : src))
    );
  }, []);

  const handleEndContinuous = useCallback(() => {
    const bio = sourcesRef.current.find((s) => s.id === 'bio_continuous');
    if (!bio) return;
    const elapsed = bio.elapsedSeconds;
    sounds.playComplete();
    setSources((prev) =>
      prev.map((src) =>
        src.id === 'bio_continuous' ? { ...src, active: false, elapsedSeconds: 0 } : src
      )
    );
    showToast(
      `🧬 생체에너지충전 종료! 총 연속 충전 시간: ${formatDurationKorean(elapsed)} (${formatTimeClock(elapsed)})`,
      'success'
    );
  }, [showToast]);

  const handleSliderChange = useCallback((id: string, value: number) => {
    setLastCandidateId(id);
    setSources((prev) =>
      prev.map((src) => {
        if (src.id !== id || src.isContinuous) return src;
        const seconds = src.unit === 'hour' ? value * 3600 : value * 60;
        return { ...src, remainingSeconds: seconds };
      })
    );
  }, []);

  const handleQuickAdjust = useCallback((id: string, deltaSeconds: number) => {
    sounds.playTap();
    setLastCandidateId(id);
    setSources((prev) =>
      prev.map((src) => {
        if (src.id !== id || src.isContinuous) return src;
        const maxSec = src.isCustom
          ? 24 * 3600
          : (src.max ?? 120) * (src.unit === 'hour' ? 3600 : 60);
        const minSec = src.isCustom ? 10 : 60;
        const nextSec = Math.min(maxSec, Math.max(minSec, src.remainingSeconds + deltaSeconds));
        return { ...src, remainingSeconds: nextSec };
      })
    );
  }, []);

  const handleCustomTimeSet = useCallback(
    (id: string, totalSeconds: number, customNote?: string) => {
      const clamped = Math.min(24 * 3600, Math.max(1, Math.floor(totalSeconds)));
      sounds.playTap();
      setLastCandidateId(id);
      setSources((prev) =>
        prev.map((src) => {
          if (src.id !== id) return src;
          return {
            ...src,
            initialSeconds: clamped,
            remainingSeconds: clamped,
            sub: customNote?.trim()
              ? `${customNote.trim()} • ${formatDurationKorean(clamped)} 맞춤 설정`
              : `사용자 맞춤 설정 • ${formatDurationKorean(clamped)} (${formatTimeClock(clamped)})`,
          };
        })
      );
      showToast(
        `🎛️ 고객설정 타이머가 ${formatDurationKorean(clamped)} (${formatTimeClock(clamped)})로 적용되었습니다.`,
        'success'
      );
    },
    [showToast]
  );

  const handleGlobalControl = useCallback(
    (action: 'toggle' | 'stop' | 'reset') => {
      if (action === 'toggle') {
        if (activeSource) {
          sounds.playToggle(false);
          setLastCandidateId(activeSource.id);
          setSources((prev) => prev.map((s) => ({ ...s, active: false })));
        } else {
          const candidate =
            sourcesRef.current.find(
              (s) => s.id === lastCandidateId && (s.isContinuous || s.remainingSeconds > 0)
            ) ||
            sourcesRef.current.find((s) => !s.isContinuous && s.remainingSeconds > 0) ||
            sourcesRef.current[0];

          if (candidate) {
            sounds.playToggle(true);
            ensureNotificationPermission();
            setLastCandidateId(candidate.id);
            setSources((prev) =>
              prev.map((s) => ({ ...s, active: s.id === candidate.id }))
            );
          }
        }
      } else if (action === 'stop') {
        sounds.playToggle(false);
        setSources((prev) => prev.map((s) => ({ ...s, active: false })));
      } else if (action === 'reset') {
        sounds.playTap();
        setSources((prev) =>
          prev.map((s) => ({
            ...s,
            active: false,
            remainingSeconds: s.initialSeconds,
            elapsedSeconds: 0,
          }))
        );
        showToast('↺ 모든 타이머가 초기 설정 시간으로 리셋되었습니다.', 'info');
      }
    },
    [activeSource, lastCandidateId, ensureNotificationPermission, showToast]
  );

  // Connect Media Session action handlers to live timer controls
  useEffect(() => {
    energyCarrier.setCallbacks({
      onPlay: () => {
        if (!sourcesRef.current.some((s) => s.active)) {
          handleGlobalControl('toggle');
        }
      },
      onPause: () => {
        if (sourcesRef.current.some((s) => s.active)) {
          handleGlobalControl('stop');
        }
      },
      onStop: () => {
        handleGlobalControl('stop');
      },
    });
  }, [handleGlobalControl]);

  const handleResetDashboardData = useCallback(() => {
    sounds.playTap();
    setSources(
      cloneInitialSources().map((s) => ({
        ...s,
        active: false,
        remainingSeconds: s.initialSeconds,
        elapsedSeconds: 0,
        totalSupplied: 0,
      }))
    );
    setHourlyData(new Array(12).fill(0));
    setReceivingPackets(0);
    showToast('📊 모든 공급원 누적 통계 및 차트가 초기화되었습니다.', 'info');
  }, [showToast]);

  const handleToggleDevice = useCallback(
    (id: string) => {
      const target = devices.find((d) => d.id === id);
      if (!target) return;
      const nextOnline = !target.online;
      sounds.playToggle(nextOnline);

      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, online: nextOnline } : d))
      );

      if (target.isDesktop && nextOnline) {
        showToast(
          '🖥️ 에너지 디바이스 연결 PC 동기화 완료 (HW 직결 • COM3 • LAN 1Gbps 정상 가동)',
          'success'
        );
      } else {
        showToast(
          `${target.icon} ${target.name} ${nextOnline ? '연동 시작됨' : '연동 해제됨'}`,
          nextOnline ? 'success' : 'info'
        );
      }
    },
    [devices, showToast]
  );

  const handleDownloadHtml = useCallback(async () => {
    sounds.playTap();
    await downloadAppSnapshotHtml();
    showToast(
      '📥 GitHub 실행파일(index.html) 다운로드 완료! GitHub 저장소에 올리면 바로 실행됩니다.',
      'success'
    );
  }, [showToast]);

  const handleToggleViewport = () => {
    if (isSmartMode) {
      setViewportMode('fullscreen');
      return;
    }
    sounds.playTap();
    setViewportMode((m) => (m === 'mockup' ? 'fullscreen' : 'mockup'));
  };

  const handleShareInstallLink = useCallback(async () => {
    sounds.playTap();
    const result = await shareInstallLink();
    if (result === 'shared') {
      showToast('🔗 앱 설치 링크 공유를 완료했습니다.', 'success');
    } else if (result === 'copied') {
      showToast('🔗 설치 링크가 복사되었습니다! 공유하면 바로 앱을 설치할 수 있습니다.', 'success');
    } else {
      showToast('⚠️ 링크 공유가 취소되었거나 복사에 실패했습니다.', 'warning');
    }
  }, [shareInstallLink, showToast]);

  const handleNativeInstall = useCallback(async (): Promise<boolean> => {
    const accepted = await triggerNativeInstall();
    if (accepted) {
      showToast('✅ 앱 설치 완료! 스마트폰에서 실행 시 스마트모드로 자동 실행됩니다.', 'success');
    }
    return accepted;
  }, [triggerNativeInstall, showToast]);

  const handleQuickInstallAction = useCallback(async () => {
    if (isInstallable) {
      const accepted = await handleNativeInstall();
      if (!accepted) {
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  }, [isInstallable, handleNativeInstall]);

  return (
    <div
      className={`${
        isSmartMode
          ? 'h-dvh overflow-hidden'
          : 'h-dvh overflow-hidden md:h-auto md:min-h-screen md:overflow-visible'
      } flex flex-col`}
    >
      {/* DESKTOP TOP BAR (Always hidden in Smart Mode) */}
      {!isSmartMode && (
        <aside className="top-desktop-bar" aria-label="데스크톱 도구 모음">
          <div className="app-badge">
            <span className="pulse-dot" />
            <span>Life Energy Cloud v2.4</span>
          </div>

          <button type="button" className="mode-btn" onClick={handleToggleViewport}>
            <span>
              {effectiveViewportMode === 'mockup' ? '🖥️ 와이드 풀스크린 모드' : '📱 모바일 목업 모드'}
            </span>
          </button>

          <button
            type="button"
            className="mode-btn border-cyan-400/35 text-cyan-200"
            onClick={handleShareInstallLink}
          >
            <span>🔗 설치 링크 공유</span>
          </button>

          {!isInstalled && (
            <button
              type="button"
              className="mode-btn border-emerald-400/40 text-emerald-200"
              onClick={handleQuickInstallAction}
            >
              <span>📲 {isInstallable ? '앱 바로 설치' : '홈 화면에 설치'}</span>
            </button>
          )}

          <button
            type="button"
            className="mode-btn border-violet-400/40 text-violet-200"
            onClick={handleDownloadHtml}
          >
            <span>📥 GitHub 실행파일(index.html)</span>
          </button>

          <button
            type="button"
            className="mode-btn"
            onClick={() => {
              sounds.playTap();
              showToast('🔊 사운드 엔진 테스트 완료 (600Hz → 150Hz)', 'info');
            }}
          >
            <span>🔊 사운드 테스트</span>
          </button>

          <button
            type="button"
            className="mode-btn border-cyan-400/40 text-cyan-300"
            onClick={() => {
              sounds.playTap();
              setShowAiAdvisor(true);
            }}
          >
            <span>🤖 AI 에너지 코치</span>
          </button>
        </aside>
      )}

      {/* PHONE / FULLSCREEN CONTAINER */}
      <div
        className={`viewport-stage ${
          effectiveViewportMode === 'fullscreen' ? 'fullscreen-stage' : ''
        }`}
      >
        <main
          className={`phone-viewport-container ${
            effectiveViewportMode === 'mockup' ? 'mockup-mode' : 'fullscreen-mode'
          }`}
        >
          {/* Hardware Mockup Buttons */}
          <div className="phone-button-left-vol-up" aria-hidden="true" />
          <div className="phone-button-left-vol-down" aria-hidden="true" />
          <div className="phone-button-right-power" aria-hidden="true" />

          {/* APP SCREEN */}
          <div className="app-screen">
            {/* 1. Status & Dynamic Island (Desktop/Mockup only; real smartphones use native bar) */}
            <div className="status-notch-bar hidden md:flex">
              <span className="tabular-nums">{clockTime}</span>
              <div className={`dynamic-island ${activeSource ? 'active-pulse' : ''}`}>
                <div className="island-camera" />
                <div className="island-wave">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* 2. App Header */}
            <header className="app-header">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="logo-sphere">⚡</div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                    Life Energy Cloud
                  </h1>
                  <p className="text-[10px] font-mono-hud text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <span className="health-dot md:hidden" />
                    <span>ACTIVE PULSE • ONLINE</span>
                  </p>
                </div>
              </div>

              {/* Desktop / Mockup Top Icon Buttons (Hidden in Smart Mode) */}
              {!isSmartMode && (
                <div className="hidden md:flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    className="icon-btn text-cyan-300 border-cyan-500/35"
                    onClick={() => {
                      sounds.playTap();
                      setShowAiAdvisor(true);
                    }}
                    title="AI 에너지 코치 (웹 검색)"
                  >
                    🤖
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={handleShareInstallLink}
                    title="앱 설치 링크 공유"
                  >
                    🔗
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      sounds.playTap();
                      setShowInstallGuide(true);
                    }}
                    title="홈 화면 앱 설치"
                  >
                    📲
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      sounds.playTap();
                      setIsLocked(true);
                    }}
                    title="앱 잠금"
                  >
                    🔒
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      sounds.playTap();
                      setShowPinSettings(true);
                    }}
                    title="보안 설정"
                  >
                    ⚙️
                  </button>
                </div>
              )}

              {/* Smartphone / Smart Mode Header Controls */}
              <div className={`${isSmartMode ? 'flex' : 'flex md:hidden'} items-center gap-1.5 shrink-0`}>
                <PWAInstallButton
                  isInstallable={isInstallable}
                  isInstalled={isInstalled}
                  isIOS={isIOS}
                  onInstall={handleNativeInstall}
                  onOpenGuide={() => setShowInstallGuide(true)}
                  variant="header"
                />
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTap();
                    setShowMobileDrawer((prev) => !prev);
                  }}
                  aria-expanded={showMobileDrawer}
                  aria-label="도구 및 상태 정보 불러오기"
                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    showMobileDrawer
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{showMobileDrawer ? '닫기' : '메뉴'}</span>
                  <span className="text-[10px] opacity-80">{showMobileDrawer ? '▲' : '▾'}</span>
                </button>
              </div>
            </header>

            {/* 3. Health Strip (Desktop/Mockup always visible; on smartphone/Smart Mode summoned via drawer) */}
            {!isSmartMode && (
              <div className="health-strip hidden md:flex">
                <div className="flex items-center gap-1.5">
                  <span className="health-dot" />
                  <span>
                    {activeSource
                      ? '백그라운드 지속 수신: 가동 중 (타 앱 전환 시 100% 유지)'
                      : '백그라운드 지속 수신: 켜짐 (타 앱 전환 시 유지)'}
                  </span>
                </div>
                <div className="text-cyan-200/90 font-medium">
                  {activeSource ? '전 수신 장치 무음 전송 중' : '전 수신 장치 무음 연결됨'}
                </div>
              </div>
            )}

            {/* 3b. In-App Smart Install Banner (Only on shared link / installable mobile browser, automatically hidden once installed) */}
            {!isInstalled && (openedFromInstallLink || (isSmartMode && isInstallable)) && (
              <PWAInstallButton
                isInstallable={isInstallable}
                isInstalled={isInstalled}
                isIOS={isIOS}
                onInstall={handleNativeInstall}
                onOpenGuide={() => setShowInstallGuide(true)}
                variant="banner"
              />
            )}

            {/* 4. Main Content Area + Mobile On-Demand Drawer */}
            <div className="relative flex-1 min-h-0 flex flex-col">
              {showMobileDrawer && (
                <div className={`${isSmartMode ? 'flex' : 'md:hidden flex'} absolute inset-0 z-30 flex-col`}>
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowMobileDrawer(false)}
                  />
                  <div className="relative z-10 mx-3 mt-2 rounded-2xl glass-panel border border-cyan-400/30 p-3.5 shadow-2xl space-y-3">
                    {/* Status & Description Section */}
                    <div className="rounded-xl bg-black/45 border border-white/10 p-2.5 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-200 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="health-dot" />
                          <span>
                            {activeSource
                              ? '백그라운드 지속 수신: 가동 중 (100% 유지)'
                              : '백그라운드 지속 수신: 켜짐 (타 앱 전환 시 유지)'}
                          </span>
                        </span>
                        <span className="font-mono-hud text-slate-400 tabular-nums">{clockTime}</span>
                      </div>
                      <div className="flex items-center justify-between pl-3 gap-2">
                        <span className="text-cyan-300/90 font-medium truncate">
                          {activeSource
                            ? `전 수신 장치 무음 전송 중 • ${activeSource.name}`
                            : '전 수신 장치 무음 연결됨'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-[10px] font-bold text-cyan-200 shrink-0">
                          {isInstalled ? '📱 스마트모드 (설치됨)' : '📱 스마트모드'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playTap();
                          setShowMobileDrawer(false);
                          setShowAiAdvisor(true);
                        }}
                        className="py-2.5 px-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <span className="text-base">🤖</span>
                        <span>AI 코치</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMobileDrawer(false);
                          handleShareInstallLink();
                        }}
                        className="py-2.5 px-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <span className="text-base">🔗</span>
                        <span>링크 공유</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playTap();
                          setShowMobileDrawer(false);
                          setShowInstallGuide(true);
                        }}
                        className="py-2.5 px-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-[11px] font-semibold flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <span className="text-base">{isInstalled ? '✅' : '📲'}</span>
                        <span>{isInstalled ? '설치 완료' : '앱 설치'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playTap();
                          setShowMobileDrawer(false);
                          setIsLocked(true);
                        }}
                        className="py-2.5 px-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-[11px] font-semibold flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <span className="text-base">🔒</span>
                        <span>즉시 잠금</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playTap();
                          setShowMobileDrawer(false);
                          setShowPinSettings(true);
                        }}
                        className="py-2.5 px-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-[11px] font-semibold flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <span className="text-base">⚙️</span>
                        <span>보안 설정</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playTap();
                          setShowMobileDrawer(false);
                          showToast('🔊 사운드 엔진 테스트 완료 (600Hz → 150Hz)', 'info');
                        }}
                        className="py-2.5 px-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-[11px] font-semibold flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <span className="text-base">🔊</span>
                        <span>사운드 테스트</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileDrawer(false);
                        void handleDownloadHtml();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-violet-500/15 border border-violet-400/40 text-violet-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>📥</span>
                      <span>GitHub 바로 실행파일 (index.html) 다운로드</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="screens-viewport">
                {activeTab === 'timer' && (
                  <TimerView
                    sources={sources}
                    activeSource={activeSource}
                    selectedSourceId={lastCandidateId}
                    viewportMode={effectiveViewportMode}
                    onToggleSource={handleToggleSource}
                    onStopSource={handleStopSource}
                    onEndContinuous={handleEndContinuous}
                    onSliderChange={handleSliderChange}
                    onQuickAdjust={handleQuickAdjust}
                    onSetCustomTime={handleCustomTimeSet}
                    onGlobalControl={handleGlobalControl}
                  />
                )}

                {activeTab === 'receiving' && (
                  <QuantumReceivingView
                    activeSource={activeSource}
                    receivingPackets={receivingPackets}
                    viewportMode={effectiveViewportMode}
                  />
                )}

                {activeTab === 'dashboard' && (
                  <DashboardView
                    sources={sources}
                    hourlyData={hourlyData}
                    onResetAll={handleResetDashboardData}
                    viewportMode={effectiveViewportMode}
                  />
                )}

                {activeTab === 'network' && (
                  <NetworkView devices={devices} onToggleDevice={handleToggleDevice} />
                )}

                {activeTab === 'gift' && <GiftView onShowToast={showToast} />}
              </div>
            </div>

            {/* 5. Persistent Floating Energy Bar (only when active & not on timer tab) */}
            {activeSource && activeTab !== 'timer' && (
              <div
                className="persistent-energy-bar"
                onClick={() => {
                  sounds.playTap();
                  setActiveTab('timer');
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="bar-pulse-icon shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      1개 공급원 가동 중 ({activeSource.icon} {activeSource.name})
                    </div>
                    <div className="text-[10px] text-cyan-300/80">
                      탭하여 타이머 화면으로 복귀
                    </div>
                  </div>
                </div>
                <div className="font-mono-hud text-sm font-bold text-cyan-300 shrink-0 tabular-nums">
                  {activeSource.isContinuous
                    ? '연속 공급 중'
                    : formatTimeClock(activeSource.remainingSeconds)}
                </div>
              </div>
            )}

            {/* 6. Bottom Fixed Navigation */}
            <nav className="bottom-nav-bar" aria-label="하단 내비게이션">
              {(
                [
                  { id: 'timer', icon: '⏱️', label: '타이머' },
                  { id: 'receiving', icon: '📥', label: '수신' },
                  { id: 'dashboard', icon: '📊', label: '대시보드' },
                  { id: 'network', icon: '🌐', label: '네트워크' },
                  { id: 'gift', icon: '🎁', label: '선물' },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      sounds.playTap();
                      setActiveTab(tab.id);
                    }}
                    className={`nav-tab-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="text-base leading-none">{tab.icon}</span>
                    <span className="text-[11px] font-semibold mt-0.5">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* In-App Toast Banner */}
            {toast && (
              <div
                className={`absolute top-24 left-4 right-4 z-40 px-3.5 py-2.5 rounded-xl border text-xs font-semibold shadow-xl backdrop-blur-md transition-all ${
                  toast.tone === 'success'
                    ? 'bg-emerald-950/90 border-emerald-400/50 text-emerald-200'
                    : toast.tone === 'warning'
                    ? 'bg-amber-950/90 border-amber-400/50 text-amber-200'
                    : 'bg-slate-900/95 border-cyan-400/45 text-cyan-200'
                }`}
              >
                {toast.message}
              </div>
            )}

            {/* Offline Connectivity Indicator */}
            {!isOnline && (
              <div className="fixed bottom-[74px] left-3 z-40 flex items-center gap-2 rounded-lg bg-amber-500/95 px-3 py-1.5 text-[11px] font-bold text-slate-950 shadow-lg">
                <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse" />
                <span>오프라인 모드 — 로컬 기능 정상 작동 중</span>
              </div>
            )}

            {/* 7. PIN Lock Screen Overlay */}
            <PinLockOverlay
              isLocked={isLocked}
              onUnlock={() => setIsLocked(false)}
              isInstalled={isInstalled}
              isInstallable={isInstallable}
              openedFromInstallLink={openedFromInstallLink}
              onTriggerInstall={handleQuickInstallAction}
            />

            {/* 8. Security Policy Modal */}
            <PinSettingsModal
              open={showPinSettings}
              onClose={() => setShowPinSettings(false)}
            />

            {/* 9. Install Guide & Link Share Modal */}
            <InstallGuideModal
              open={showInstallGuide}
              onClose={() => setShowInstallGuide(false)}
              onDownload={handleDownloadHtml}
              isInstallable={isInstallable}
              isInstalled={isInstalled}
              isIOS={isIOS}
              isInAppBrowser={isInAppBrowser}
              shareUrl={getShareInstallUrl()}
              onNativeInstall={handleNativeInstall}
              onShareLink={handleShareInstallLink}
            />

            {/* 10. Gemini AI Advisor Multi-turn Chat with Google Search Grounding */}
            <GeminiAdvisorModal
              open={showAiAdvisor}
              onClose={() => setShowAiAdvisor(false)}
              activeSource={activeSource}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
