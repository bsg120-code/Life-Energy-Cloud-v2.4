import React, { useCallback, useEffect, useState } from 'react';
import { sounds } from '../engines/audioEngine';

interface PinLockOverlayProps {
  isLocked: boolean;
  onUnlock: () => void;
  isInstalled?: boolean;
  isInstallable?: boolean;
  openedFromInstallLink?: boolean;
  onTriggerInstall?: () => void;
}

const PIN_STORAGE_KEY = 'life_energy_pin';
const DEFAULT_PIN = '5098';

export const PinLockOverlay: React.FC<PinLockOverlayProps> = ({
  isLocked,
  onUnlock,
  isInstalled = false,
  isInstallable = false,
  openedFromInstallLink = false,
  onTriggerInstall,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [hintText, setHintText] = useState('🔒 허가된 4자리 보안 비밀번호를 입력하세요');
  const [isError, setIsError] = useState(false);
  const [shaking, setShaking] = useState(false);

  // Ensure fixed PIN 5098 is stored in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PIN_STORAGE_KEY, DEFAULT_PIN);
    } catch {
      // ignore storage errors
    }
  }, []);

  const verifyPin = useCallback(
    (pinToVerify: string) => {
      let storedPin = DEFAULT_PIN;
      try {
        storedPin = localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
      } catch {
        storedPin = DEFAULT_PIN;
      }

      if (pinToVerify === storedPin) {
        sounds.playUnlock();
        setIsError(false);
        setHintText('✅ 인증 성공');
        setEnteredPin('');
        onUnlock();
      } else {
        sounds.playToggle(false);
        setIsError(true);
        setHintText('❌ 비밀번호가 올바르지 않습니다');
        setShaking(true);
        window.setTimeout(() => {
          setShaking(false);
          setEnteredPin('');
        }, 420);
      }
    },
    [onUnlock]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      sounds.playTap();
      setIsError(false);
      setHintText('🔒 허가된 4자리 보안 비밀번호를 입력하세요');
      setEnteredPin((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) {
          window.setTimeout(() => verifyPin(next), 90);
        }
        return next;
      });
    },
    [verifyPin]
  );

  const handleBackspace = useCallback(() => {
    sounds.playTap();
    setEnteredPin((prev) => prev.slice(0, -1));
  }, []);

  const handleManualUnlock = useCallback(() => {
    if (enteredPin.length === 4) {
      verifyPin(enteredPin);
    } else {
      sounds.playToggle(false);
      setIsError(true);
      setHintText('❌ 4자리 숫자를 모두 입력해 주세요');
      setShaking(true);
      window.setTimeout(() => setShaking(false), 400);
    }
  }, [enteredPin, verifyPin]);

  // Physical desktop keyboard support while locked
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleManualUnlock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, handleDigit, handleBackspace, handleManualUnlock]);

  if (!isLocked) return null;

  return (
    <div
      className={`absolute inset-0 z-50 bg-[#050814]/95 backdrop-blur-xl flex flex-col items-center justify-center px-5 py-4 sm:py-8 overflow-y-auto ${
        shaking ? 'pin-shake' : ''
      }`}
    >
      <div className="w-[54px] h-[54px] sm:w-[60px] sm:h-[60px] rounded-full bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-2xl sm:text-3xl mb-3 sm:mb-4 shadow-[0_0_25px_rgba(245,158,11,0.35)]">
        🛡️
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-white">Life Energy Cloud</h2>
      <p className="text-xs text-slate-400 mt-1">앱 보호를 위해 4자리 PIN을 입력하세요</p>

      {/* 4 PIN Dots */}
      <div className="flex items-center gap-4 my-4 sm:my-6">
        {[0, 1, 2, 3].map((idx) => {
          const filled = idx < enteredPin.length;
          return (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                filled
                  ? 'bg-cyan-400 border-cyan-300 scale-110 shadow-[0_0_10px_#00f2fe]'
                  : 'bg-transparent border-white/25'
              }`}
            />
          );
        })}
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-[236px] sm:max-w-[260px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="aspect-square rounded-full bg-white/5 border border-white/10 text-xl font-semibold text-white hover:border-cyan-400 hover:bg-white/15 active:scale-95 transition cursor-pointer flex items-center justify-center"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={handleManualUnlock}
          className="aspect-square rounded-full bg-cyan-500/15 border border-cyan-400/35 text-sm font-bold text-cyan-300 hover:bg-cyan-500/25 active:scale-95 transition cursor-pointer flex items-center justify-center"
        >
          해제
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="aspect-square rounded-full bg-white/5 border border-white/10 text-xl font-semibold text-white hover:border-cyan-400 hover:bg-white/15 active:scale-95 transition cursor-pointer flex items-center justify-center"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          className="aspect-square rounded-full bg-white/5 border border-white/10 text-lg font-semibold text-slate-200 hover:border-rose-400 hover:bg-rose-500/15 active:scale-95 transition cursor-pointer flex items-center justify-center"
        >
          ⌫
        </button>
      </div>

      <p
        className={`text-xs font-medium mt-4 sm:mt-5 text-center ${
          isError ? 'text-rose-400' : 'text-slate-400'
        }`}
      >
        {hintText}
      </p>

      {!isInstalled && onTriggerInstall && (isInstallable || openedFromInstallLink) && (
        <button
          type="button"
          onClick={() => {
            sounds.playTap();
            onTriggerInstall();
          }}
          className="mt-4 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-xs font-bold hover:bg-cyan-500/30 active:scale-95 transition cursor-pointer shadow-[0_0_16px_rgba(0,242,254,0.25)]"
        >
          📲 스마트폰 홈 화면에 앱 바로 설치
        </button>
      )}
    </div>
  );
};
