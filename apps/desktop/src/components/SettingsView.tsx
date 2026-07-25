import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Code2,
  Terminal,
  FolderOpen,
  RefreshCcw,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Play,
  Plus,
  FolderPlus,
  Info,
} from 'lucide-react';
import { Button, Input, Callout, Badge } from '@git-manager/ui';
import { useAppStore } from '../store/useAppStore.js';
import { PRODUCT_METADATA } from '@git-manager/shared';
import type { EditorProfileId, TerminalProfileId, ThemeMode } from '@git-manager/shared';
import * as tauri from '../services/tauri.js';

export const SettingsView: React.FC = () => {
  const {
    settings,
    scanRoots,
    projects,
    updateSettings,
    startScan,
    loadScanRoots,
    showToast,
  } = useAppStore();

  const [editorProfile, setEditorProfile] = useState<EditorProfileId>(settings.selected_editor_profile);
  const [customEditorExec, setCustomEditorExec] = useState(settings.custom_editor_executable);
  const [customEditorArgs, setCustomEditorArgs] = useState(settings.custom_editor_args.join(' '));

  const [terminalProfile, setTerminalProfile] = useState<TerminalProfileId>(settings.selected_terminal_profile);
  const [customTerminalExec, setCustomTerminalExec] = useState(settings.custom_terminal_executable);
  const [customTerminalArgs, setCustomTerminalArgs] = useState(settings.custom_terminal_args.join(' '));

  const [themeMode, setThemeMode] = useState<ThemeMode>(settings.theme);
  const [checkUpdatesOnStartup, setCheckUpdatesOnStartup] = useState(settings.check_updates_on_startup);

  const [dbPath, setDbPath] = useState<string>('git_manager.db');
  const [appDataDir, setAppDataDir] = useState<string>('');
  const [updateStatusText, setUpdateStatusText] = useState<string>('No check performed in this session.');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    tauri.invokeGetAppDataDirPath().then((dir) => setAppDataDir(dir)).catch(() => {});
  }, []);

  const handleSaveEditor = async () => {
    const argsArray = customEditorArgs.split(' ').map((s) => s.trim()).filter(Boolean);
    await updateSettings({
      selected_editor_profile: editorProfile,
      custom_editor_executable: customEditorExec,
      custom_editor_args: argsArray.length > 0 ? argsArray : ['{path}'],
    });
  };

  const handleSaveTerminal = async () => {
    const argsArray = customTerminalArgs.split(' ').map((s) => s.trim()).filter(Boolean);
    await updateSettings({
      selected_terminal_profile: terminalProfile,
      custom_terminal_executable: customTerminalExec,
      custom_terminal_args: argsArray.length > 0 ? argsArray : ['{path}'],
    });
  };

  const handleSaveAppearance = async (mode: ThemeMode) => {
    setThemeMode(mode);
    await updateSettings({ theme: mode });
  };

  const handleToggleAutoUpdate = async (checked: boolean) => {
    setCheckUpdatesOnStartup(checked);
    await updateSettings({ check_updates_on_startup: checked });
  };

  const handleTestEditor = async () => {
    const sample = projects[0];
    if (!sample) {
      showToast('Please add at least one repository to test launcher', 'info');
      return;
    }
    const res = await tauri.invokeLaunchCodeEditor(
      editorProfile,
      customEditorExec,
      customEditorArgs.split(' ').filter(Boolean),
      sample.path
    );
    if (res.success) {
      showToast(`Editor test launched successfully on "${sample.name}"`, 'success');
    } else {
      showToast(`Editor test failed: ${res.error}`, 'error');
    }
  };

  const handleTestTerminal = async () => {
    const sample = projects[0];
    if (!sample) {
      showToast('Please add at least one repository to test launcher', 'info');
      return;
    }
    const res = await tauri.invokeLaunchTerminal(
      terminalProfile,
      customTerminalExec,
      customTerminalArgs.split(' ').filter(Boolean),
      sample.path
    );
    if (res.success) {
      showToast(`Terminal test launched successfully on "${sample.name}"`, 'success');
    } else {
      showToast(`Terminal test failed: ${res.error}`, 'error');
    }
  };

  const handleCheckUpdateNow = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusText('Checking remote releases...');
    const update = await tauri.checkAppUpdate();
    setIsCheckingUpdate(false);

    if (update && update.available) {
      setUpdateStatusText(`New release available: v${update.version}`);
      showToast(`Update v${update.version} is available!`, 'success');
    } else {
      setUpdateStatusText('You are running the latest version of Git Manager.');
      showToast('No new updates available', 'info');
    }
  };

  const handleClearIconCache = async () => {
    if (confirm('Clear cached remote favicons? Custom uploaded project icons will not be affected.')) {
      try {
        await tauri.invokeClearIconCache();
        showToast('Icon cache cleared', 'success');
      } catch (err: any) {
        showToast(`Failed to clear icon cache: ${err.message || err}`, 'error');
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-8 select-none">
      {/* Settings Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">Settings</h2>
        <p className="text-xs text-slate-400 mt-1">Configure workspace paths, editor profiles, terminal launchers, and preferences.</p>
      </div>

      {/* Section: Appearance */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-indigo-400" />
          Appearance & Theme
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { id: 'system', label: 'System Theme', icon: <Monitor className="w-4 h-4" /> },
              { id: 'dark', label: 'Dark Mode', icon: <Moon className="w-4 h-4" /> },
              { id: 'light', label: 'Light Mode', icon: <Sun className="w-4 h-4" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => handleSaveAppearance(t.id)}
              className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
                themeMode === t.id
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/30'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Section: Code Editor Integration */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            Code Editor Integration
          </h3>
          <Button variant="secondary" size="sm" icon={<Play className="w-3.5 h-3.5 text-indigo-400" />} onClick={handleTestEditor}>
            Test Launcher
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(
            [
              { id: 'code', label: 'VS Code' },
              { id: 'code-insiders', label: 'VS Code Insiders' },
              { id: 'cursor', label: 'Cursor' },
              { id: 'custom', label: 'Custom Executable' },
            ] as const
          ).map((profile) => (
            <button
              key={profile.id}
              onClick={() => setEditorProfile(profile.id)}
              className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                editorProfile === profile.id
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {profile.label}
            </button>
          ))}
        </div>

        {editorProfile === 'custom' && (
          <div className="space-y-3 pt-2 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <Input
              label="Custom Executable Path"
              value={customEditorExec}
              onChange={(e) => setCustomEditorExec(e.target.value)}
              placeholder="e.g. C:\Program Files\Editor\editor.exe"
            />
            <Input
              label="Arguments Template (use {path} placeholder)"
              value={customEditorArgs}
              onChange={(e) => setCustomEditorArgs(e.target.value)}
              placeholder="e.g. {path}"
            />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={handleSaveEditor}>
            Save Editor Profile
          </Button>
        </div>
      </section>

      {/* Section: Terminal Integration */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Terminal Emulator Integration
          </h3>
          <Button variant="secondary" size="sm" icon={<Play className="w-3.5 h-3.5 text-emerald-400" />} onClick={handleTestTerminal}>
            Test Launcher
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(
            [
              { id: 'auto', label: 'Auto Detect' },
              { id: 'wt', label: 'Windows Terminal' },
              { id: 'powershell', label: 'PowerShell' },
              { id: 'cmd', label: 'Command Prompt' },
              { id: 'custom', label: 'Custom Binary' },
            ] as const
          ).map((profile) => (
            <button
              key={profile.id}
              onClick={() => setTerminalProfile(profile.id)}
              className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                terminalProfile === profile.id
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {profile.label}
            </button>
          ))}
        </div>

        {terminalProfile === 'custom' && (
          <div className="space-y-3 pt-2 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <Input
              label="Custom Terminal Executable Path"
              value={customTerminalExec}
              onChange={(e) => setCustomTerminalExec(e.target.value)}
              placeholder="e.g. C:\Tools\alacritty.exe"
            />
            <Input
              label="Arguments Template (use {path} placeholder)"
              value={customTerminalArgs}
              onChange={(e) => setCustomTerminalArgs(e.target.value)}
              placeholder="e.g. --working-directory {path}"
            />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="sm" onClick={handleSaveTerminal}>
            Save Terminal Profile
          </Button>
        </div>
      </section>

      {/* Section: Project Root Folders */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              Scanned Root Folders
            </h3>
            <p className="text-xs text-slate-400">Directories monitored for Git repository discovery.</p>
          </div>
          <Button variant="secondary" size="sm" icon={<FolderPlus className="w-4 h-4 text-amber-400" />} onClick={() => startScan()}>
            Add Root Folder
          </Button>
        </div>

        {scanRoots.length === 0 ? (
          <div className="text-xs text-slate-500 p-4 bg-slate-950/40 rounded-xl text-center italic border border-slate-800">
            No root folders configured. Click "Add Root Folder" to scan local repositories.
          </div>
        ) : (
          <div className="space-y-2">
            {scanRoots.map((root) => (
              <div
                key={root.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate pr-4">
                  <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-mono text-slate-200 truncate">{root.path}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RefreshCcw className="w-3.5 h-3.5" />}
                    onClick={() => startScan(root.path)}
                  >
                    Rescan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section: Automatic Updates */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <RefreshCcw className="w-4 h-4 text-indigo-400" />
          Application Updates
        </h3>
        <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-xs">
          <div>
            <div className="font-bold text-slate-200 mb-1">
              Current Version: <span className="text-indigo-400">v0.1.0</span>
            </div>
            <div className="text-slate-400">{updateStatusText}</div>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={isCheckingUpdate}
            icon={<RefreshCcw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />}
            onClick={handleCheckUpdateNow}
          >
            Check Now
          </Button>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={checkUpdatesOnStartup}
            onChange={(e) => handleToggleAutoUpdate(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
          />
          Automatically check for updates on startup
        </label>
      </section>

      {/* Section: Data & Storage */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          Data & Local Storage
        </h3>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-300">Local Database</div>
              <div className="font-mono text-slate-400 text-[11px] mt-0.5">{appDataDir ? `${appDataDir}/git_manager.db` : 'SQLite: git_manager.db'}</div>
            </div>
          </div>
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-300">Remote Icon Cache</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Stored in local application cache folder</div>
            </div>
            <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={handleClearIconCache}>
              Clear Cache
            </Button>
          </div>
        </div>
      </section>

      {/* Section: About & Unsigned Preview Notice */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200">{PRODUCT_METADATA.name}</h3>
            <p className="text-xs text-slate-400">Open-source local Git workspace manager.</p>
          </div>
          <Badge variant="warning">
            <ShieldAlert className="w-3 h-3" /> Unsigned Preview Build
          </Badge>
        </div>

        <Callout variant="warning" title="Unsigned preview build">
          Git Manager is currently distributed without Windows code signing and without Apple notarization.
          Windows SmartScreen and macOS Gatekeeper may display security warnings on first launch. All project data is stored locally on your device.
        </Callout>

        <div className="flex items-center gap-4 pt-2 text-xs text-indigo-400 font-semibold">
          <button onClick={() => tauri.invokeOpenBrowserUrl(PRODUCT_METADATA.repositoryUrl)} className="inline-flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3.5 h-3.5" /> GitHub Repository
          </button>
          <button onClick={() => tauri.invokeOpenBrowserUrl(PRODUCT_METADATA.releasesUrl)} className="inline-flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3.5 h-3.5" /> Release Notes
          </button>
        </div>
      </section>
    </div>
  );
};
