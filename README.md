# Life Energy Cloud v2.4

라이프 에너지 자율 관리 클라우드 플랫폼 (PWA 지원 · 스마트폰 스마트모드 자동 실행).

## GitHub 실행 방법 (3가지 중 선택)

### 방법 1. 단일 실행파일(`index.html`) 1개만 업로드 (가장 간편)
1. 앱 상단(또는 스마트폰 메뉴)의 **`📥 GitHub 실행파일(index.html)`** 버튼으로 `index.html`을 다운로드합니다. (프로젝트 내 `docs/index.html` 또는 `public/github-index.html`과 동일합니다.)
2. GitHub 새 저장소(Public)에 이 `index.html` 파일 1개만 업로드합니다.
3. 저장소 **Settings → Pages → Build and deployment**에서 **Source: Deploy from a branch**, **Branch: `main` / `/ (root)`**를 선택하고 **Save**를 누르면 바로 실행됩니다.

### 방법 2. 프로젝트 전체를 GitHub에 저장 후 `/docs`로 즉시 실행
1. 저장소 **Settings → Pages**로 이동합니다.
2. **Source: Deploy from a branch**, **Branch: `main` / `/docs`**를 선택하고 **Save**를 누릅니다.
3. 별도 빌드 과정 없이 미리 생성된 `docs/index.html`이 즉시 배포됩니다.

### 방법 3. GitHub Actions 자동 빌드 배포
1. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 선택합니다.
2. `.github/workflows/deploy-pages.yml` 워크플로우가 자동 실행되어 PWA 전체 기능이 배포됩니다.

- 실행 주소: `https://<GitHub-아이디>.github.io/<저장소-이름>/`
- 바로 설치 공유 링크: `https://<GitHub-아이디>.github.io/<저장소-이름>/?install=1`

## 로컬 실행 및 GitHub 실행파일 재생성

```bash
npm install
npm run dev
npm run build:github
```
