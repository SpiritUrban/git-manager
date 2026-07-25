import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import { check as checkUpdate, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import type { ScanSummary, LaunchResult, IconResolutionResult, EditorProfileId, TerminalProfileId } from '@git-manager/shared';

export async function selectFolderDialog(title: string = 'Select Projects Directory'): Promise<string | null> {
  try {
    const selected: any = await openDialog({
      directory: true,
      multiple: false,
      title,
    });

    if (!selected) return null;

    if (typeof selected === 'string') {
      return selected;
    }

    if (typeof selected === 'object' && selected !== null) {
      if (typeof selected.path === 'string') {
        return selected.path;
      }
    }

    if (Array.isArray(selected) && selected.length > 0) {
      const first = selected[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object' && first !== null && typeof first.path === 'string') {
        return first.path;
      }
    }

    return null;
  } catch (err) {
    console.error('Dialog error:', err);
    return null;
  }
}

export async function invokeScanRootFolder(path: string): Promise<ScanSummary> {
  return await invoke<ScanSummary>('scan_root_folder', { path });
}

export async function invokeCancelScan(): Promise<boolean> {
  return await invoke<boolean>('cancel_scan');
}

export async function invokeNormalizeLocalPath(path: string): Promise<string> {
  return await invoke<string>('normalize_local_path', { path });
}

export async function invokeCheckPathExists(path: string): Promise<boolean> {
  return await invoke<boolean>('check_path_exists', { path });
}

export async function invokeLaunchCodeEditor(
  profile: EditorProfileId,
  customExec: string,
  customArgs: string[],
  path: string
): Promise<LaunchResult> {
  return await invoke<LaunchResult>('launch_code_editor', {
    profile,
    customExec,
    customArgs,
    path,
  });
}

export async function invokeLaunchTerminal(
  profile: TerminalProfileId,
  customExec: string,
  customArgs: string[],
  path: string
): Promise<LaunchResult> {
  return await invoke<LaunchResult>('launch_terminal_app', {
    profile,
    customExec,
    customArgs,
    path,
  });
}

export async function invokeOpenFolder(path: string): Promise<LaunchResult> {
  return await invoke<LaunchResult>('launch_open_folder', { path });
}

export async function invokeOpenBrowserUrl(url: string): Promise<void> {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    await openUrl(url);
  } else {
    throw new Error('Only http and https protocols are allowed.');
  }
}

export async function invokeResolveProjectIcon(
  path: string,
  websiteUrl?: string | null,
  projectId?: string
): Promise<IconResolutionResult> {
  return await invoke<IconResolutionResult>('resolve_project_icon', {
    path,
    websiteUrl: websiteUrl || null,
    projectId: projectId || 'temp',
  });
}

export async function invokeRefreshRemoteFavicon(websiteUrl: string, projectId: string): Promise<string> {
  return await invoke<string>('refresh_remote_favicon', { websiteUrl, projectId });
}

export async function invokeClearIconCache(): Promise<boolean> {
  return await invoke<boolean>('clear_icon_cache');
}

export async function invokeGetAppDataDirPath(): Promise<string> {
  return await invoke<string>('get_app_data_dir_path');
}

export async function checkAppUpdate(): Promise<Update | null> {
  try {
    const update = await checkUpdate();
    return update;
  } catch (err) {
    console.warn('Update check failed:', err);
    return null;
  }
}

export async function relaunchApp(): Promise<void> {
  await relaunch();
}
