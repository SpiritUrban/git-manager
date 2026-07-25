# Development Setup Guide — Git Manager

This guide walks you through setting up your local development environment for **Git Manager**.

---

## 💻 System Prerequisites

### 1. Node.js & pnpm
- **Node.js**: `v20.x` or higher
- **pnpm**: `v10.x` (or use `npx pnpm`)

### 2. Rust Toolchain
- Install Rust via [rustup.rs](https://rustup.rs/):
  ```bash
  rustup toolchain install stable
  rustup default stable
  ```

### 3. Platform Dependencies

#### Windows
- C++ Build Tools (via Visual Studio Installer with "Desktop development with C++" workload).

#### macOS
- Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

#### Linux (Ubuntu / Debian)
- System GUI and WebKit libraries:
  ```bash
  sudo apt-get update
  sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
  ```

---

## 🚀 Environment Setup Commands

```bash
# Clone the repository
git clone https://github.com/SpiritUrban/git-manager.git
cd git-manager

# Install monorepo dependencies
pnpm install

# Start desktop app in dev mode
pnpm dev:desktop

# Start marketing website in dev mode
pnpm dev:site
```

---

## 🧪 Running Tests & Validation

```bash
# Run full suite (Typecheck + Vitest + Cargo tests)
pnpm check

# Run Vitest TypeScript unit tests
pnpm test:ts

# Run Cargo Rust unit tests
pnpm test:rust

# Typecheck monorepo packages
pnpm typecheck
```

---

## 📂 Local Database & Log Directories

### SQLite Database File
- **Windows**: `%APPDATA%\com.gitmanager.desktop\git_manager.db`
- **macOS**: `~/Library/Application Support/com.gitmanager.desktop/git_manager.db`
- **Linux**: `~/.config/com.gitmanager.desktop/git_manager.db`

### Icon Cache Directory
- **Windows**: `%LOCALAPPDATA%\com.gitmanager.desktop\favicons\`
- **macOS**: `~/Library/Caches/com.gitmanager.desktop/favicons/`
- **Linux**: `~/.cache/com.gitmanager.desktop/favicons/`
