import React, { useEffect, useRef, useState } from 'react';
import { Bot, ExternalLink, Globe, Send, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { ChatMessage, EnergySource } from '../types/energy';
import { sounds } from '../engines/audioEngine';

interface GeminiAdvisorModalProps {
  open: boolean;
  onClose: () => void;
  activeSource: EnergySource | null;
}

const INITIAL_ASSISTANT_MSG: ChatMessage = {
  id: 'welcome-msg',
  role: 'model',
  text: '안녕하세요! Life Energy Cloud v2.4 AI 어드바이저입니다. 현재 가동 중인 에너지 공급원, 22분 돼지고기·41분 소고기 정밀 조리, 15분 파워 냅 회복, 슈만 공명(7.83Hz) 및 최신 웰니스 정보까지 실시간 웹 검색 기반으로 안내해 드립니다.',
  timestamp: '안내',
  modelUsed: 'gemini-4-hydrogen',
};

const QUICK_PROMPTS = [
  '15분 파워 냅이 생체 리듬 회복에 왜 효과적인가요?',
  '돼지고기·소고기 저온 정밀 조리 시 심부 온도 기준 알려줘',
  '슈만 공명 7.83Hz와 528Hz 주파수에 관한 최신 연구는?',
  '장시간 작업 시 집중력을 높이는 최적 에너지 타이머 루틴 추천해 줘',
];

export const GeminiAdvisorModal: React.FC<GeminiAdvisorModalProps> = ({
  open,
  onClose,
  activeSource,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MSG]);
  const [input, setInput] = useState('');
  const [useSearch, setUseSearch] = useState(true);
  const [fastMode, setFastMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, open]);

  if (!open) return null;

  const sendMessage = async (promptText?: string) => {
    const textToSend = (promptText ?? input).trim();
    if (!textToSend || loading) return;

    sounds.playTap();
    setErrorMsg(null);

    const nowStr = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: nowStr,
    };

    const historyToSend = messages
      .filter((m) => m.id !== 'welcome-msg')
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInput('');
    setLoading(true);

    try {
      const activeSourceContext = activeSource
        ? `현재 가동 공급원: ${activeSource.name} (${activeSource.sub})`
        : '현재 가동 중인 공급원 없음 (대기 모드)';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyToSend,
          useSearch,
          fastMode,
          activeSourceContext,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          'GitHub Pages 정적 웹 환경에서는 서버 AI API가 지원되지 않습니다. 타이머·파형·양자 수신·대시보드 등 모든 앱 기능은 정상 작동합니다.'
        );
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `요청 실패 (${res.status})`);
      }

      const replyMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.text || '응답을 수신하지 못했습니다.',
        sources: Array.isArray(data.sources) ? data.sources : [],
        modelUsed: data.modelUsed,
        timestamp: new Date().toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, replyMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI 응답 요청 중 오류가 발생했습니다.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    sounds.playTap();
    setMessages([INITIAL_ASSISTANT_MSG]);
    setErrorMsg(null);
  };

  return (
    <div
      className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full h-[88%] sm:h-[640px] sm:max-w-[540px] rounded-t-3xl sm:rounded-2xl bg-[#090d1f] border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 bg-slate-900/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                AI 라이프 에너지 어드바이저
              </h3>
              <p className="text-[10px] text-cyan-300/80 font-mono-hud truncate">
                {useSearch
                  ? 'Google Search Grounding · gemini-4-hydrogen'
                  : fastMode
                  ? '초고속 응답 모드 · gemini-3.1-flash-lite'
                  : '표준 추론 모드 · gemini-4-hydrogen'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResetChat}
              title="대화 초기화"
              className="w-8 h-8 rounded-lg bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="닫기"
              className="w-8 h-8 rounded-lg bg-slate-800/80 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Controls */}
        <div className="px-4 py-2 border-b border-white/5 bg-slate-950/60 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              sounds.playTap();
              setUseSearch((v) => !v);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer transition ${
              useSearch
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                : 'bg-slate-900 border-white/10 text-slate-400'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>실시간 웹 검색 {useSearch ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playTap();
              setFastMode((v) => !v);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer transition ${
              fastMode
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-slate-900 border-white/10 text-slate-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>고속 응답 {fastMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-50 rounded-br-sm'
                      : 'bg-slate-900/90 border border-white/10 text-slate-100 rounded-bl-sm'
                  }`}
                >
                  {msg.text}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1">
                      <div className="text-[10px] font-semibold text-cyan-300 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>Google 검색 출처</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {msg.sources.slice(0, 4).map((src, idx) => (
                          <a
                            key={`${src.uri}-${idx}`}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-sky-300 hover:text-cyan-200 underline flex items-center gap-1 truncate"
                          >
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {isUser ? '나' : msg.modelUsed || 'AI'} · {msg.timestamp}
                </span>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start">
              <div className="rounded-2xl rounded-bl-sm bg-slate-900/90 border border-cyan-500/25 px-3.5 py-2.5 text-xs text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>{useSearch ? '최신 웹 정보 검색 및 분석 중...' : '응답 생성 중...'}</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3 py-2 text-xs text-rose-300">
              ⚠️ {errorMsg}
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 2 && (
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 text-[11px] text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200 whitespace-nowrap shrink-0 cursor-pointer transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-3 border-t border-white/10 bg-slate-950/85 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="에너지, 조리 타이머, 웰니스 질문을 입력하세요..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>전송</span>
          </button>
        </form>
      </div>
    </div>
  );
};
