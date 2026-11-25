import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const singleOutDir = path.join(rootDir, 'dist-single');
const docsDir = path.join(rootDir, 'docs');
const publicDir = path.join(rootDir, 'public');

console.log('[1/3] Building single-file bundle for GitHub Pages...');
execSync('npx vite build --outDir dist-single', {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_SINGLE_FILE: 'true',
    VITE_BASE_PATH: './',
  },
});

const rawHtml = fs.readFileSync(path.join(singleOutDir, 'index.html'), 'utf8');
const assetsDir = path.join(singleOutDir, 'assets');
const assetFiles = fs.readdirSync(assetsDir);

const jsFiles = assetFiles.filter((f) => f.endsWith('.js'));
const cssFiles = assetFiles.filter((f) => f.endsWith('.css'));

if (jsFiles.length === 0 || cssFiles.length === 0) {
  throw new Error(`Expected JS and CSS bundles in ${assetsDir}, found: ${assetFiles.join(', ')}`);
}

const cssContent = cssFiles
  .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf8'))
  .join('\n');
const jsContent = jsFiles
  .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf8'))
  .join('\n');

const png192Base64 = fs
  .readFileSync(path.join(publicDir, 'pwa-192x192.png'))
  .toString('base64');
const appleIconBase64 = fs
  .readFileSync(path.join(publicDir, 'apple-touch-icon.png'))
  .toString('base64');
const svgIconBase64 = fs
  .readFileSync(path.join(publicDir, 'icon.svg'))
  .toString('base64');

const png192DataUri = `data:image/png;base64,${png192Base64}`;
const appleIconDataUri = `data:image/png;base64,${appleIconBase64}`;
const svgIconDataUri = `data:image/svg+xml;base64,${svgIconBase64}`;

// Escape closing script tags inside JS bundle so inline <script type="module"> cannot terminate prematurely
const safeJsContent = jsContent.replaceAll('</script>', '<\\/script>');

const inlineManifestScript = `<script>
(function(){
  try {
    var icon192 = '${png192DataUri}';
    window.__INLINE_ICON_192__ = icon192;
    var baseUrl = window.location.href.split('?')[0].split('#')[0];
    var manifest = {
      id: baseUrl,
      name: 'Life Energy Cloud v2.4',
      short_name: 'Life Energy',
      description: '라이프 에너지 자율 관리 클라우드 플랫폼',
      start_url: baseUrl,
      scope: baseUrl.replace(/[^/]*$/, ''),
      display: 'standalone',
      orientation: 'portrait-primary',
      theme_color: '#070913',
      background_color: '#070913',
      lang: 'ko',
      icons: [
        { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' }
      ]
    };
    var blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = URL.createObjectURL(blob);
    document.head.appendChild(link);
  } catch (e) {}
})();
</script>`;

let standaloneHtml = rawHtml
  .replace(/(\.\/|\/)apple-touch-icon\.png/g, () => appleIconDataUri)
  .replace(/(\.\/|\/)icon\.svg/g, () => svgIconDataUri)
  .replace(/(\.\/|\/)pwa-192x192\.png/g, () => png192DataUri)
  .replace(/<link[^>]+href=["'][^"']*assets\/[^"']*\.css["'][^>]*>/g, '')
  .replace(/<link[^>]+rel=["']modulepreload["'][^>]*>/g, '')
  .replace(/<script[^>]+src=["'][^"']*assets\/[^"']*\.js["'][^>]*>\s*<\/script>/g, '')
  .replace('</head>', () => `<style>\n${cssContent}\n</style>\n${inlineManifestScript}\n</head>`)
  .replace('</body>', () => `<script type="module">\n${safeJsContent}\n</script>\n</body>`);

// 1. Save single-file GitHub executable into public/ so users can download it as index.html from the app
const publicStandalonePath = path.join(publicDir, 'github-index.html');
fs.writeFileSync(publicStandalonePath, standaloneHtml, 'utf8');
console.log(
  `[2/3] Created self-contained GitHub executable: public/github-index.html (${Math.round(
    Buffer.byteLength(standaloneHtml) / 1024
  )} KB)`
);

// 2. Also populate /docs for zero-config GitHub Pages (Settings -> Pages -> main / /docs)
fs.rmSync(docsDir, { recursive: true, force: true });
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, 'index.html'), standaloneHtml, 'utf8');
fs.writeFileSync(path.join(docsDir, '404.html'), standaloneHtml, 'utf8');
fs.writeFileSync(path.join(docsDir, '.nojekyll'), '', 'utf8');

// Copy icon assets into docs/ as well
for (const asset of [
  'icon.svg',
  'apple-touch-icon.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-maskable-512x512.png',
]) {
  const src = path.join(publicDir, asset);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(docsDir, asset));
  }
}

// Clean up temporary dist-single
fs.rmSync(singleOutDir, { recursive: true, force: true });
console.log('[3/3] Populated /docs/index.html for instant GitHub Pages deployment!');
