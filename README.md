# Git Manager

> A lightweight, cross-platform desktop manager for discovering, organizing, and launching your local Git repositories.

[![CI](https://github.com/SpiritUrban/git-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/SpiritUrban/git-manager/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ⚡ Overview

**Git Manager** helps developers who maintain dozens or hundreds of local Git repositories quickly navigate, organize, and launch them. Instead of browsing deep file trees or executing terminal navigation commands manually, Git Manager scans your specified root folders, presents your projects in customizable visual cards, groups them, and opens them in your favorite code editor, terminal emulator, file browser, or remote website with a single click.

> [!NOTE]
> All project configuration, metadata, and settings are stored locally on your device in SQLite. No cloud backend, telemetry, or tracking is used.

---

## ✨ Features

- 🔍 **Fast Multithreaded Scanning**: Discovers Git repositories in specified root folders using high-performance background file traversal while skipping standard build outputs (`node_modules`, `target`, `.next`, etc.).
- 📂 **Group & Tag Organization**: Categorize projects into custom color-coded groups and multi-tag filters.
- 🤹 **Custom Drag-and-Drop Ordering**: Manually arrange cards and groups via intuitive drag-and-drop.
- 💻 **One-Click Launchers**:
  - **Code Editor**: Launch VS Code, Cursor, or custom IDE executables with custom argument templates.
  - **Terminal**: Open Windows Terminal, PowerShell, CMD, macOS Terminal, iTerm, GNOME Terminal, Konsole, Kitty, Alacritty, or custom shell binaries directly in the project directory.
  - **File Explorer**: Open native file manager (Explorer, Finder, Linux File Manager).
  - **Website & Remote**: Open configured web application homepages or normalized Git remote URLs (GitHub, GitLab, Bitbucket) in your default browser.
- 🎨 **Automatic Favicon & Icon Detection**: Resolves project icons from local app icons, HTML favicons, web app URLs, or smart initial fallbacks.
- 🔄 **Automatic In-App Updates**: Background update checks via Tauri Updater with seamless download, progress tracking, and restart confirmation.
- 🌙 **Dark & Light Themes**: Instrumental, high-contrast dark and light UI modes built with React, Tailwind CSS, and Lucide icons.

---

## 🚫 Non-Goals (Scope for initial release)

To maintain high performance and utility, the current release focuses exclusively on repository management and launcher efficiency. The following features are intentionally deferred for future releases:

- Git staging, commit, push, pull, fetch, merge, rebase, diff viewer.
- GitHub OAuth, cloud synchronization, user accounts, telemetry.
- Auto-run on system startup, plugin framework, nested group trees.

---

## 💻 Supported Platforms

- **Windows**: x64 (`.exe` NSIS installer, `.msi`)
- **macOS**: Apple Silicon (`arm64` `.dmg`) & Intel (`x64` `.dmg`)
- **Linux**: x64 (`AppImage`, `.deb`)

---

## ⚠️ Unsigned Preview Build Warning

> [!WARNING]
> **Git Manager is currently distributed without paid Windows Authenticode code signing certificates and without Apple Developer ID notarization.**
>
> When installing Git Manager:
> - **Windows**: SmartScreen may present a warning. Click **More info** $\rightarrow$ **Run anyway**.
> - **macOS**: Gatekeeper may block launch. Right-click `Git Manager.app` $\rightarrow$ **Open**, or allow execution via **System Settings $\rightarrow$ Privacy & Security**.
> - **Linux**: Ensure executable permissions are set on `.AppImage` files (`chmod +x Git-Manager_*.AppImage`).
>
> Official releases are built deterministically from tag commits via GitHub Actions. Always verify downloads originate from our official [GitHub Releases](https://github.com/SpiritUrban/git-manager/releases).

---

## 🛠️ Monorepo Structure

```text
git-manager/
├─ apps/
│  ├─ desktop/       # Tauri v2 + Rust + React + TS + Tailwind CSS desktop app
│  └─ site/          # Vite static landing & download page for GitHub Pages
├─ packages/
│  ├─ shared/        # Product metadata, domain types, URL utilities, schemas
│  ├─ ui/            # Shared React UI components & design system tokens
│  └─ config/        # Common toolchain configurations
├─ scripts/          # Release, version sync, and download manifest generators
├─ docs/             # Technical architecture, development, release, and unsigned docs
└─ .github/          # CI, Release, and GitHub Pages workflow actions
```

---

## 📦 Getting Started & Commands

### Prerequisites

- **Node.js**: `v20.x` or higher
- **pnpm**: `v10.x` (or `npx pnpm`)
- **Rust**: `1.80+` stable toolchain (`rustc`, `cargo`)
- **Platform Dependencies**:
  - **Linux**: `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libxdo-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`.

### Local Development Commands

```bash
# Install monorepo dependencies
pnpm install

# Start desktop app in development mode
pnpm dev:desktop

# Start marketing site in development mode
pnpm dev:site

# Run all TypeScript & Rust tests
pnpm check

# Execute Vitest TypeScript tests
pnpm test:ts

# Execute Cargo Rust tests
pnpm test:rust

# Typecheck monorepo packages
pnpm typecheck
```

---

## 🚀 Release Process & Updater Keys

Tauri Updater requires an Ed25519 public/private keypair for verifying release manifests (`latest.json`) and signature files (`.sig`).

1. Generate keypair using Tauri CLI:
   ```bash
   npx tauri signer generate
   ```
2. Store the **Public Key** in `apps/desktop/src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.
3. Save the **Private Key** securely as a GitHub Repository Secret:
   - Secret Name: `TAURI_SIGNING_PRIVATE_KEY`
   - Password Secret (optional): `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
4. Trigger release:
   ```bash
   pnpm release:prepare 0.2.0
   git add .
   git commit -m "chore: release v0.2.0"
   git tag v0.2.0
   git push origin main
   git push origin v0.2.0
   ```

Refer to [docs/RELEASE.md](docs/RELEASE.md) and [docs/UNSIGNED_BUILDS.md](docs/UNSIGNED_BUILDS.md) for full instructions.

---

## 🛣️ Future Roadmap

- [ ] Interactive branch status badge on project cards
- [ ] Stash / Uncommitted changes counter
- [ ] Quick commit & push shortcut action bar
- [ ] Custom workspace layouts & keyboard shortcut cheatsheet

---

## 📄 License

Distributed under the [MIT License](LICENSE).
