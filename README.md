<div align="center">

<img src="apps/desktop/src-tauri/icons/128x128@2x.png" width="96" alt="Git Manager" />

# Git Manager

**All your local Git repositories in one place — find them, group them, open them in one click.**

[![Release](https://img.shields.io/github/v/release/SpiritUrban/git-manager?color=6366f1)](https://github.com/SpiritUrban/git-manager/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/SpiritUrban/git-manager/total?color=10b981)](https://github.com/SpiritUrban/git-manager/releases)
[![CI](https://github.com/SpiritUrban/git-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/SpiritUrban/git-manager/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[**Website & downloads**](https://spiriturban.github.io/git-manager/) ·
[Latest release](https://github.com/SpiritUrban/git-manager/releases/latest) ·
[Report a bug](https://github.com/SpiritUrban/git-manager/issues)

</div>

---

If you keep dozens of projects on disk, finding the right one means digging through folder trees
or retyping paths in a terminal. Git Manager scans the folders you point it at, finds every Git
repository inside, and shows them as cards you can group, tag and reorder. One click opens a
project in your editor, terminal, file manager, dev server, website or remote page.

Everything lives locally in SQLite. No account, no cloud, no telemetry.

## Download

| Platform | Files |
|---|---|
| **Windows** | `.exe` installer — no admin rights needed; `.msi` for managed deployment |
| **macOS** | `.dmg` for Apple Silicon and Intel |
| **Linux** | `.AppImage`, `.deb`, `.rpm` |

[**Get the latest release →**](https://github.com/SpiritUrban/git-manager/releases/latest)

Every build comes from a tagged GitHub Actions run and ships a signed update manifest, so the
app updates itself from then on.

> [!NOTE]
> Builds are not code-signed yet, so Windows SmartScreen and macOS Gatekeeper warn on first
> launch. On Windows choose **More info → Run anyway**; on macOS right-click the app → **Open**.
> Per-platform steps are on the [website](https://spiriturban.github.io/git-manager/).

## What it does

- **Finds repositories for you** — multithreaded scan of your root folders, skipping
  `node_modules`, `target`, `dist` and other noise.
- **Groups and tags** — colour-coded groups, multi-tag filters, favourites, drag-and-drop order.
- **Opens things in one click** — VS Code, Cursor or a custom editor; Windows Terminal,
  PowerShell, iTerm, GNOME Terminal, Konsole, Kitty, Alacritty or your own shell; the file
  manager; the dev server; the project website; the remote page on GitHub, GitLab or Bitbucket.
- **Recognises projects visually** — pulls each icon from the project's own favicon or app icon,
  falling back to generated initials.
- **Repository insight** — per-project overview with languages, file map, commit history and
  contributor stats.
- **Updates itself** — signed in-app updates with progress and a restart prompt.
- **Dark and light themes.**

Deliberately out of scope: staging, commits, merges, diffs, and anything needing an account.
Git Manager launches your tools, it does not replace them.

## Built with

Tauri v2 and Rust for the backend and native launchers · React 19, TypeScript, Tailwind CSS v4
and Zustand for the interface · SQLite for local storage · pnpm workspace monorepo · GitHub
Actions for CI, four-platform release builds and the GitHub Pages site.

## Development

```bash
pnpm install
```

```bash
pnpm dev:desktop
```

```bash
pnpm check
```

Needs Node 20+, pnpm 10+ and a stable Rust toolchain. Linux additionally needs the WebKitGTK
development packages — exact list in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

More detail: [architecture](docs/ARCHITECTURE.md) · [contributing](CONTRIBUTING.md) ·
[releasing](RELEASING.md) · [security policy](SECURITY.md)

## Roadmap

- [ ] Branch status badge on project cards
- [ ] Uncommitted changes counter
- [ ] Quick commit and push actions
- [ ] Custom workspace layouts and keyboard shortcuts

## Author

Built by **Vitaliy Dyachuk** — [spiriturban.github.io](https://spiriturban.github.io/)

I help site owners untangle difficult web projects. More of my work and services are on
[my site](https://spiriturban.github.io/); the code lives on
[GitHub](https://github.com/SpiritUrban).

If Git Manager saves you time, a ⭐ on the repository is the easiest way to say thanks.

## License

[MIT](LICENSE) © 2026 Vitaliy Dyachuk. Free to use, modify and redistribute — the one condition
is that the copyright notice stays with the code.
