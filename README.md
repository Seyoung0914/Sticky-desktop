# SYMOA

실시간 동기화를 지원하는 노트 데스크탑 앱입니다.

---

## 📥 설치 (일반 사용자)

[GitHub Releases](../../releases) 페이지에서 최신 버전을 다운로드하세요.  
**Rust, Node.js 등 별도 설치가 필요 없습니다.**

### macOS

1. `.dmg` 파일을 다운로드합니다
2. 더블클릭하여 열고, SYMOA을 Applications 폴더로 드래그합니다
3. 완료! 🎉

> ⚠️ **코드 서명이 없는 빌드**의 경우, 처음 실행 시 "손상된 파일" 에러가 날 수 있습니다:
> ```bash
> # 터미널에서 한 번만 실행하면 됩니다
> sudo xattr -rd com.apple.quarantine /Applications/SYMOA.app
> ```

### Windows

1. `.exe` 인스톨러를 다운로드합니다
2. 더블클릭하여 설치합니다
3. 완료! 🎉

> ⚠️ SmartScreen 경고가 뜰 수 있습니다 → "추가 정보" → "실행" 클릭

---

## 🛠 개발 환경 설정 (개발자용)

소스 코드를 수정하거나 직접 빌드하려면 아래 도구가 필요합니다.

### 사전 요구사항

#### 1. Node.js (v18 이상)

- 다운로드: https://nodejs.org/

#### 2. Rust 툴체인

Tauri는 Rust로 네이티브 바이너리를 컴파일하므로 Rust가 필요합니다.  
**npm install로는 설치되지 않으며, 별도로 설치해야 합니다.**

- **Windows**: https://win.rustup.rs/x86_64 에서 `rustup-init.exe` 를 다운로드하여 실행 (기본 옵션 선택)
- **macOS / Linux**: 터미널에서 아래 명령어 실행
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

> ⚠️ **Windows 사용자**: [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) 도 필요합니다. Rust 설치 시 안내가 나오면 함께 설치해 주세요.

설치 확인:

```bash
rustc --version
cargo --version
```

### 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (Tauri 앱)
npm run tauri dev
```

### 로컬 빌드

```bash
# 프로덕션 빌드 (현재 OS용 설치 파일 생성)
npm run tauri build
```

빌드 결과물 위치:
- **macOS**: `src-tauri/target/release/bundle/dmg/SYMOA_x.x.x_*.dmg`
- **Windows**: `src-tauri/target/release/bundle/nsis/SYMOA_x.x.x_x64-setup.exe`

### 권장 IDE

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---

## 🚀 배포 (Release)

### 자동 빌드 (GitHub Actions)

태그를 push하면 GitHub Actions가 자동으로 Mac/Windows 빌드를 실행하고 Releases에 업로드합니다:

```bash
git tag v0.1.0
git push origin v0.1.0
```

빌드 완료 후 GitHub Releases 페이지에서 Draft Release를 확인하고 Publish 하면 됩니다.

사용자는 Releases 페이지에서 `.dmg` 또는 `.exe`를 다운받아 설치하면 됩니다.
