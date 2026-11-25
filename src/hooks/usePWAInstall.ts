import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALLED_STORAGE_KEY = 'life_energy_pwa_installed';

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith('android-app://')
  );
}

function detectSmartphone(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const mobileUA =
    /android|iphone|ipod|blackberry|iemobile|opera mini|windows phone|mobile/.test(ua);
  const narrowViewport = window.matchMedia('(max-width: 767px)').matches;
  const coarseSmallScreen =
    window.matchMedia('(pointer: coarse)').matches &&
    Math.min(window.screen.width, window.screen.height) <= 900;
  return mobileUA || narrowViewport || coarseSmallScreen;
}

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function detectInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /kakaotalk|naver|instagram|fban|fbav|line\/|daumapps|everytimeapp/.test(ua);
}

function detectInstallQuery(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('install') === '1' || params.get('mode') === 'install';
  } catch {
    return false;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectStandalone());
  const [isSmartphone, setIsSmartphone] = useState<boolean>(() => detectSmartphone());
  const [isIOS] = useState<boolean>(() => detectIOS());
  const [isInAppBrowser] = useState<boolean>(() => detectInAppBrowser());
  const [openedFromInstallLink] = useState<boolean>(() => detectInstallQuery());

  // Smartphone always runs in Smart Mode, and once installed on a smartphone it is strictly locked to Smart Mode
  const isSmartMode = isSmartphone;

  useEffect(() => {
    const syncEnvironment = () => {
      const standalone = detectStandalone();
      const phone = detectSmartphone();
      setIsInstalled(standalone);
      setIsSmartphone(phone);

      if (standalone) {
        try {
          localStorage.setItem(INSTALLED_STORAGE_KEY, '1');
        } catch {
          // ignore storage error
        }
      }
    };

    syncEnvironment();

    const mqWidth = window.matchMedia('(max-width: 767px)');
    const mqStandalone = window.matchMedia('(display-mode: standalone)');
    const mqFullscreen = window.matchMedia('(display-mode: fullscreen)');

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(INSTALLED_STORAGE_KEY, '1');
      } catch {
        // ignore storage error
      }
    };

    mqWidth.addEventListener('change', syncEnvironment);
    mqStandalone.addEventListener('change', syncEnvironment);
    mqFullscreen.addEventListener('change', syncEnvironment);
    window.addEventListener('resize', syncEnvironment);
    window.addEventListener('orientationchange', syncEnvironment);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mqWidth.removeEventListener('change', syncEnvironment);
      mqStandalone.removeEventListener('change', syncEnvironment);
      mqFullscreen.removeEventListener('change', syncEnvironment);
      window.removeEventListener('resize', syncEnvironment);
      window.removeEventListener('orientationchange', syncEnvironment);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Sync CSS classes onto documentElement so Smart Mode applies unconditionally on smartphones & installed PWA
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('smart-mode', isSmartMode);
    root.classList.toggle('pwa-installed', isInstalled);
  }, [isSmartMode, isInstalled]);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(INSTALLED_STORAGE_KEY, '1');
      } catch {
        // ignore storage error
      }
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const getShareInstallUrl = useCallback((): string => {
    if (typeof window === 'undefined') return '';
    const shareOrigin = window.location.origin.replace(/^https:\/\/ais-dev-/, 'https://ais-pre-');
    const basePath = import.meta.env.BASE_URL || '/';
    return `${shareOrigin}${basePath}?install=1`;
  }, []);

  const shareInstallLink = useCallback(async (): Promise<'shared' | 'copied' | 'failed'> => {
    const url = getShareInstallUrl();
    const shareData = {
      title: 'Life Energy Cloud v2.4 앱 설치',
      text: '링크를 열어 Life Energy Cloud 앱을 스마트폰 홈 화면에 바로 설치하세요.',
      url,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return 'shared';
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return 'failed';
        }
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        return 'copied';
      }
    } catch {
      // fall through to textarea fallback
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok ? 'copied' : 'failed';
    } catch {
      return 'failed';
    }
  }, [getShareInstallUrl]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isSmartphone,
    isSmartMode,
    isIOS,
    isInAppBrowser,
    openedFromInstallLink,
    install,
    getShareInstallUrl,
    shareInstallLink,
  };
}
