# Unsigned Preview Builds & Security Notice

## Overview

Git Manager binaries are currently compiled and distributed **without paid commercial OS code signing certificates** (Microsoft Authenticode / Apple Developer ID Program).

---

## 🔒 Types of Signatures & Certificates Explained

| Signature Type | Purpose | Used in Git Manager? |
| -------------- | ------- | -------------------- |
| **Platform Code Signing** (Windows Authenticode / Apple Developer ID) | Verifies publisher identity to OS security systems (SmartScreen / Gatekeeper). Eliminates warning dialogs. | ❌ No (Commercial paid certificate required) |
| **Apple Notarization** | Apple cloud scan verifying binary is free of known malware. | ❌ No ($99/year Apple Developer Account required) |
| **macOS Ad-Hoc Signature** | Technical bundle signing identity (`-`) required for macOS ARM64 executable compatibility. | ✅ Yes (Used for technical Apple Silicon binary execution) |
| **Tauri Updater Signature** (Ed25519) | Cryptographic keypair verifying update downloads originate from the official repository maintainer. | ✅ Yes (`TAURI_SIGNING_PRIVATE_KEY` / `pubkey`) |

---

## ⚠️ Platform Security Behaviors

### 1. Windows SmartScreen
When executing `Git-Manager_*-setup.exe` or `*.msi`, Windows SmartScreen may display:
> *"Windows protected your PC. Microsoft Defender SmartScreen prevented an unrecognized app from starting."*

**How to run**:
1. Click **More info**.
2. Click **Run anyway**.

---

### 2. macOS Gatekeeper
When launching `Git Manager.app` for the first time, macOS may display:
> *"Git Manager.app cannot be opened because it is from an unidentified developer."*

**How to run**:
1. Right-click **Git Manager.app** in Finder.
2. Select **Open** from the context menu.
3. Click **Open** in the confirmation dialog.
4. Alternatively, go to **System Settings → Privacy & Security** and click **Open Anyway**.

---

### 3. Linux Executable Permissions
AppImage binaries on Linux require executable file permissions:
```bash
chmod +x Git-Manager_*.AppImage
./Git-Manager_*.AppImage
```

---

## 🛡️ Security Guarantee

Git Manager is 100% open-source under the MIT license. All repository scanning, settings persistence, and local database operations run strictly on your machine. No telemetry or external server communication occurs except for checking update releases on GitHub.
