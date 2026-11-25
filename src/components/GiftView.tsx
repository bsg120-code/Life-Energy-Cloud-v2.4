import React, { useState } from 'react';
import { sounds } from '../engines/audioEngine';

interface GiftViewProps {
  onShowToast: (message: string, tone?: 'success' | 'warning' | 'info') => void;
}

const AMOUNTS = ['10', '25', '50', '100'] as const;

export const GiftView: React.FC<GiftViewProps> = ({ onShowToast }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('10');
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmedRecipient = recipient.trim();
    if (!trimmedRecipient) {
      sounds.playToggle(false);
      onShowToast('⚠️ 받는 분의 ID 또는 닉네임을 입력해 주세요.', 'warning');
      return;
    }

    const finalMsg = message.trim() || '오늘도 활력 가득한 하루 되세요!';
    sounds.playUnlock();
    onShowToast(
      `🎁 ${trimmedRecipient}님에게 ${amount} kWh 에너지 패킷 전송 완료! ("${finalMsg}")`,
      'success'
    );
    setRecipient('');
    setMessage('');
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-white">🎁 라이프 에너지 선물하기</h3>
        <p className="text-xs text-slate-400 mt-1">
          동료 또는 소중한 사람에게 긍정의 활력 에너지를 패킷으로 전송하세요.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-slate-300 font-medium block">
          받는 분 (ID 또는 닉네임)
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="예: user_life01 또는 친구 이름"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/75 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-slate-300 font-medium block">보낼 에너지 용량</label>
        <div className="grid grid-cols-4 gap-2">
          {AMOUNTS.map((val) => {
            const active = amount === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  sounds.playTap();
                  setAmount(val);
                }}
                className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  active
                    ? 'bg-purple-500/25 border-purple-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {val} kWh
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-slate-300 font-medium block">응원 메시지 (선택)</label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="오늘도 활력 가득한 하루 되세요!"
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/75 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
        />
      </div>

      <button
        type="button"
        onClick={handleSend}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-purple-500/35 transition cursor-pointer"
      >
        🚀 에너지 패킷 전송
      </button>
    </div>
  );
};
