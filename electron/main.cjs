const { app, BrowserWindow, shell } = require('electron');
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { GoogleGenAI, ThinkingLevel } = require('@google/genai');

// Load .env from executable folder first (for portable .exe), then app root
const exeDir = path.dirname(process.execPath);
const appRoot = app.getAppPath();
for (const envCandidate of [
  path.join(exeDir, '.env'),
  path.join(appRoot, '.env'),
]) {
  if (fs.existsSync(envCandidate)) {
    dotenv.config({ path: envCandidate });
  }
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY 환경 변수가 설정되어 있지 않습니다. 실행 파일과 같은 폴더에 .env 파일을 만들고 GEMINI_API_KEY를 입력해 주세요.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'life-energy-cloud-desktop',
      },
    },
  });
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const expressApp = express();
    const httpServer = http.createServer(expressApp);
    expressApp.use(express.json({ limit: '2mb' }));

    expressApp.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', service: 'life-energy-cloud-v2.4' });
    });

    expressApp.post('/api/chat', async (req, res) => {
      try {
        const {
          message,
          history = [],
          useSearch = true,
          fastMode = false,
          activeSourceContext = '',
        } = req.body ?? {};

        if (!message || typeof message !== 'string' || !message.trim()) {
          res.status(400).json({ error: '질문 내용을 입력해 주세요.' });
          return;
        }

        const ai = getGeminiClient();
        const model =
          fastMode && !useSearch ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

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
            .filter(
              (h) =>
                h &&
                (h.role === 'user' || h.role === 'model') &&
                typeof h.text === 'string' &&
                h.text.trim()
            )
            .slice(-20)
            .map((h) => ({
              role: h.role,
              parts: [{ text: h.text }],
            })),
          {
            role: 'user',
            parts: [{ text: message.trim() }],
          },
        ];

        const config = { systemInstruction };
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
        const rawChunks =
          response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        const seenUris = new Set();
        const sources = [];

        for (const chunk of rawChunks) {
          const web = chunk && chunk.web;
          if (web && web.uri && !seenUris.has(web.uri)) {
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
      } catch (error) {
        const errMsg =
          error instanceof Error
            ? error.message
            : '알 수 없는 서버 오류가 발생했습니다.';
        const statusCode =
          error && typeof error.status === 'number' ? error.status : 500;
        res
          .status(statusCode >= 400 && statusCode < 600 ? statusCode : 500)
          .json({ error: errMsg });
      }
    });

    const distPath = path.join(appRoot, 'dist');
    expressApp.use(
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

    expressApp.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });

    httpServer.on('error', reject);
    httpServer.listen(0, '127.0.0.1', () => {
      const address = httpServer.address();
      resolve({ httpServer, port: address.port });
    });
  });
}

let serverHandle = null;

function createWindow(port) {
  const iconPath = path.join(appRoot, 'public', 'pwa-192x192.png');
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 420,
    minHeight: 680,
    title: 'Life Energy Cloud v2.4',
    backgroundColor: '#070913',
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(async () => {
  try {
    const { httpServer, port } = await startLocalServer();
    serverHandle = httpServer;
    createWindow(port);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(port);
      }
    });
  } catch (err) {
    console.error('Failed to start Life Energy Cloud:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverHandle) {
    serverHandle.close();
    serverHandle = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
