# Remote Compose Editor Sample

Android Remote Compose를 배우기 위한 웹 Editor와 JVM 변환기 샘플입니다.

**[웹 Editor 열기](https://kangmin1012.github.io/RemoteCompose_Sample_Web/)** · [Android 앱](https://github.com/kangmin1012/RemoteCompose_Sample_App)

## 동작 흐름

1. 브라우저에서 Home 또는 Detail 화면의 요소를 추가·수정·삭제·드래그합니다.
2. Kotlin/Wasm 미리보기가 편집한 JSON을 받아 화면을 그립니다.
3. **Deploy**가 선택한 화면의 JSON을 이 GitHub 저장소에 커밋합니다.
4. GitHub Actions가 JVM 변환기로 `.rc` 파일을 생성하고 GitHub Pages를 배포합니다.
5. Android 앱에서 새로고침하면 새 바이너리를 내려받아 표시합니다.

Text, Button, Spacer, Divider, Card, Row와 중첩 요소, 색상·간격·테두리·클릭 액션을 지원합니다. `navigate:detail` 같은 액션은 Android 앱의 화면 이동으로 연결됩니다. 브라우저 미리보기는 레이아웃 확인용이며 Android 호스트 이벤트를 실행하지 않습니다.

## 실행 및 검증

일반 편집기 실행에는 Node.js만 필요합니다. `file://`로 열지 말고 HTTP 서버를 사용하세요.

```sh
node scripts/serve.mjs       # http://localhost:8080
node --test tests/editor.test.mjs
```

바이너리 변환과 미리보기 소스 빌드에는 JDK 21이 필요합니다.

```sh
cd server
./gradlew run --args="--dir .. .."
```

```sh
cd preview-src
./gradlew wasmJsBrowserDistribution
```

미리보기 소스를 수정한 경우 `preview-src/build/dist/wasmJs/productionExecutable/`의 결과물을 `preview/`에 반영하세요. 일반 JSON 편집에는 미리보기를 다시 빌드할 필요가 없습니다.

## 코드 안내

- `index.html`, `assets/editor.css`: 화면 구조와 스타일.
- `assets/editor.js`: 요소 편집, 드래그, JSON 생성, GitHub 저장 및 Actions 진행 표시.
- `assets/sample-data.js`: Reset과 불러오기 실패 시 사용할 기본 화면.
- `config*.json` / `config*.rc`: 화면 정의와 변환 결과. Estimates 두 화면은 앱용 추가 예제이며 참고 Editor처럼 탭은 Home·Detail만 제공합니다.
- `server/`: JSON 모델과 `RemoteComposeWriter` 기반 변환 코드.
- `preview-src/`, `preview/`: Kotlin/Wasm 소스와 배포용 미리보기. JSON 모델은 변환기의 소스를 공유합니다.
- `.github/workflows/convert.yml`: 테스트 → 변환 → 생성 파일 커밋 → Pages 배포.

## GitHub 연결

배포 브랜치는 `master`, Pages Source는 **GitHub Actions**입니다. 다른 저장소에서 사용할 때 `assets/editor.js`의 `REPO`, `REPO_N`과 workflow 브랜치를 변경하세요. 모든 정적 파일은 상대 경로를 사용합니다.

Editor의 Deploy에는 대상 저장소에 **Contents: Read and write**, **Actions: Read-only** 권한을 가진 fine-grained GitHub token을 입력합니다. 참고 구현처럼 토큰은 해당 브라우저의 `localStorage`에 저장되며 GitHub API 호출에 사용됩니다. 토큰을 소스나 커밋에 넣지 마세요. 토큰 없이 편집·미리보기·Copy JSON을 사용할 수 있습니다.

## 참고 코드

[armcha/remotecompose](https://github.com/armcha/remotecompose), 기준 커밋 `b80e896840e74cc33d18d65bb382931eddc1e3fd`의 Editor·변환기·미리보기·예제를 기반으로 합니다. 동작을 보존하면서 HTML/CSS/JS와 기본 데이터를 분리하고 포맷을 정리했습니다. Reset이 없는 화면을 참조하던 오류를 수정했으며, 배포 대상을 이 저장소로 변경했습니다. Remote Compose 버전은 앱과 동일한 `1.0.0-alpha05`입니다.
