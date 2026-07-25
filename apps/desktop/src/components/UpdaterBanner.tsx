import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@git-manager/ui';
import type { Update } from '@tauri-apps/plugin-updater';
import * as tauri from '../services/tauri.js';
import { useAppStore } from '../store/useAppStore.js';

export const UpdaterBanner: React.FC = () => {
  const { settings } = useAppStore();
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  useEffect(() => {
    if (settings.check_updates_on_startup) {
      tauri.checkAppUpdate().then((update) => {
        if (update && update.available) {
          setUpdateInfo(update);
        }
      });
    }
  }, [settings.check_updates_on_startup]);

  if (!updateInfo || isDismissed) return null;

  const handleStartUpdate = async () => {
    try {
      setStatus('downloading');
      setDownloadProgress(20);

      let downloaded = 0;
      let contentLength = 0;

      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.min(99, Math.round((downloaded / contentLength) * 100)));
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });

      setStatus('ready');
    } catch (err: any) {
      console.error('Update install error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to download update');
    }
  };

  const handleRestart = async () => {
    await tauri.relaunchApp();
  };

  return (
    <div className="bg-gradient-to-r from-indigo-900/90 via-indigo-800/90 to-blue-900/90 border-b border-indigo-500/40 text-white px-6 py-2.5 flex items-center justify-between shadow-lg z-40 select-none animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-1.5 rounded-lg bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 shrink-0">
          {status === 'ready' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : status === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0 text-xs">
          {status === 'idle' && (
            <div>
              <span className="font-bold">New update available: v{updateInfo.version}</span>
              {updateInfo.body && (
                <span className="text-indigo-200 ml-2 truncate inline-block max-w-md align-bottom opacity-80">
                  — {updateInfo.body}
                </span>
              )}
            </div>
          )}

          {status === 'downloading' && (
            <div className="flex items-center gap-3">
              <span className="font-bold">Downloading update... {downloadProgress}%</span>
              <div className="w-32 bg-indigo-950/80 rounded-full h-1.5 overflow-hidden border border-indigo-700/50">
                <div className="bg-indigo-400 h-full transition-all duration-200" style={{ width: `${downloadProgress}%` }} />
              </div>
            </div>
          )}

          {status === 'ready' && (
            <span className="font-bold text-emerald-300">
              Update v{updateInfo.version} installed! Restart application to apply.
            </span>
          )}

          {status === 'error' && (
            <span className="font-bold text-rose-300">Update error: {errorMessage}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {status === 'idle' && (
          <>
            <Button size="sm" variant="primary" onClick={handleStartUpdate}>
              Update
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsDismissed(true)}>
              Later
            </Button>
          </>
        )}

        {status === 'ready' && (
          <Button size="sm" variant="primary" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={handleRestart}>
            Restart Now
          </Button>
        )}

        <button onClick={() => setIsDismissed(true)} className="text-indigo-300 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
