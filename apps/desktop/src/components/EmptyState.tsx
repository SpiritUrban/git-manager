import React from 'react';
import { FolderPlus, GitBranch, FolderGit2 } from 'lucide-react';
import { Button, Logo } from '@git-manager/ui';
import { useAppStore } from '../store/useAppStore.js';
import * as tauri from '../services/tauri.js';

export const EmptyState: React.FC = () => {
  const { startScan } = useAppStore();

  const handleAddSingleRepo = async () => {
    const selected = await tauri.selectFolderDialog('Select Single Git Repository');
    if (selected) {
      await startScan(selected);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 select-none text-center bg-slate-950/60">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-indigo-600/10 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 shadow-xl shadow-indigo-500/10">
        <FolderGit2 className="w-10 h-10" />
      </div>

      <h2 className="text-2xl font-black text-slate-100 tracking-tight mb-2">
        Organize all your Git projects in one place
      </h2>

      <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
        Scan your root development directories to discover local Git repositories, group them, and launch them in code editors or terminals with a single click.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          icon={<FolderPlus className="w-5 h-5" />}
          onClick={() => startScan()}
        >
          Add projects folder
        </Button>

        <Button
          variant="outline"
          size="lg"
          icon={<GitBranch className="w-5 h-5 text-blue-400" />}
          onClick={handleAddSingleRepo}
        >
          Add single repository
        </Button>
      </div>
    </div>
  );
};
