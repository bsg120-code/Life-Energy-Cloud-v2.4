import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경 변수가 설정되어 있지 않습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

interface GroundingSource {
  title: string;
  uri: string;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'life-energy-cloud-v2.4' });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const {
        message,
        history = [],
        useSearch = true,
        fastMode = false,
        activeSourceContext = '',
      }: {
        message: string;
        history?: ChatHistoryTurn[];
        useSearch?: boolean;
        fastMode?: boolean;
        activeSourceContext?: string;
      } = req.body ?? {};

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: '질문 내용을 입력해 주세요.' });
        return;
      }

      const ai = getGeminiClient();
      const model = fastMode && !useSearch ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

      const systemInstruction = [
        '당신은 Life Energy Cloud v2.4의 전문 AI 라이프 에너지 어드바이저입니다.',
        '사용자의 생체 리듬 회복(기본 충전, 15분 파워 냅 휴식, 생체에너지 연속 스트림), 정밀 온도·시간 조리(돼지고기 22분 정밀 타이머, 소고기 41분 숙성 및 열순환), 바이오 고형체(8시간)·액상(72시간) 안정화, 슈만 공명(7.83Hz) 및 528Hz 주파수, 최신 웰니스·영양·에너지 효율 트렌드에 대해 정확하고 실용적인 한국어 답변을 제공합니다.',
        activeSourceContext ? `현재 앱 상태 컨텍스트: ${activeSourceContext}` : '',
        '답변은 명료하고 구조화된 한국어로 작성하며, 과장된 의학적 단정 대신 실질적이고 안전한 가이드를 제공합니다. 웹 검색 도구를 사용한 경우 최신 근거를 반영해 답변하세요.',
      ]
        .filter(Boolean)
        .join('\n');

      const contents = [
        ...history
          .filter((h) => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string' && h.text.trim())
          .slice(-20)
          .map((h) => ({
            role: h.role,
            parts: [{ text: h.text }],
          })),
        {
          role: 'user' as const,
          parts: [{ text: message.trim() }],
        },
      ];

      const config: Record<string, unknown> = {
        systemInstruction,
      };

      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      if (model === 'gemini-4-hydrogen') {
        config.thinkingConfig = {
          thinkingLevel: fastMode ? ThinkingLevel.LOW : ThinkingLevel.MEDIUM,
        };
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      const text = response.text ?? '응답을 생성하지 못했습니다.';
      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const seenUris = new Set<string>();
      const sources: GroundingSource[] = [];

      for (const chunk of rawChunks) {
        const web = (chunk as { web?: { uri?: string; title?: string } })?.web;
        if (web?.uri && !seenUris.has(web.uri)) {
          seenUris.add(web.uri);
          sources.push({
            uri: web.uri,
            title: web.title || web.uri,
          });
        }
      }

      res.json({
        text,
        sources,
        modelUsed: model,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '알 수 없는 서버 오류가 발생했습니다.';
      const statusCode =
        typeof (error as { status?: number })?.status === 'number'
          ? (error as { status: number }).status
          : 500;
      res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
        error: errMsg,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: { server: httpServer },
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith('index.html') ||
            filePath.endsWith('sw.js') ||
            filePath.endsWith('manifest.webmanifest')
          ) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Life Energy Cloud server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
