# Release Process & Updater Key Guide — Git Manager

This document describes the step-by-step procedure for preparing and triggering production releases for **Git Manager**.

---

## 🔑 1. Tauri Updater Signing Keys Setup

Tauri Updater requires an Ed25519 public/private keypair to cryptographically sign release manifests (`latest.json`) and signature files (`.sig`).

> [!IMPORTANT]
> **Updater keypair vs Platform signing**:
> The Tauri updater keypair is independent of paid Apple Developer or Microsoft Authenticode certificates. It ensures that installed desktop clients only accept update binaries signed by your private updater key.

### Generating Keys
Run the Tauri CLI key generation command:
```bash
npx tauri signer generate
```

This will produce:
- **Public Key**: Put this string in `apps/desktop/src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.
- **Private Key**: Save this key string securely.

### GitHub Repository Secrets Setup
Add the private key as a GitHub Repository Secret:
1. Open Repository $\rightarrow$ **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Click **New repository secret**.
   - Name: `TAURI_SIGNING_PRIVATE_KEY`
   - Value: *(Paste your private key string)*
3. If password protected, add secret: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

---

## 🚀 2. Triggering a Release

Follow these steps to create a new release version (e.g. `v0.2.0`):

```bash
# 1. Synchronize version strings across all workspace packages
pnpm release:prepare 0.2.0

# 2. Verify all versions match
pnpm version:check

# 3. Commit version change
git add .
git commit -m "chore: release v0.2.0"

# 4. Tag the commit with v*.*.* pattern
git tag v0.2.0

# 5. Push commit and tag to GitHub
git push origin main
git push origin v0.2.0
```

---

## 🤖 3. GitHub Actions Execution

1. The `release.yml` workflow will automatically trigger on tag push `v*.*.*`.
2. Workflow validates tag version against package manifests (`pnpm version:check`).
3. Multi-platform build matrix compiles binaries for Windows x64, macOS Apple Silicon, macOS Intel, and Linux x64.
4. Assets are signed with `TAURI_SIGNING_PRIVATE_KEY`.
5. GitHub Release is created automatically with compiled installers and a single cross-platform `latest.json` updater manifest.
6. The `pages.yml` workflow triggers on release publication, generating `download-manifest.json` and deploying the updated landing page to GitHub Pages.
