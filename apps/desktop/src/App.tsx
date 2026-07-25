import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore.js';
import { Sidebar } from './components/Sidebar.js';
import { Topbar } from './components/Topbar.js';
import { ProjectGrid } from './components/ProjectGrid.js';
import { SettingsView } from './components/SettingsView.js';
import { EmptyState } from './components/EmptyState.js';
import { UpdaterBanner } from './components/UpdaterBanner.js';
import { ProjectEditModal } from './components/ProjectEditModal.js';
import { GroupModal } from './components/GroupModal.js';
import { TagModal } from './components/TagModal.js';

export const App: React.FC = () => {
  const {
    activeView,
    projects,
    scanRoots,
    toast,
    init,
    clearToast,
  } = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  const hasProjectsOrRoots = projects.length > 0 || scanRoots.length > 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Updater Non-blocking Banner */}
      <UpdaterBanner />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Workspace */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden">
          <Topbar visibleCount={projects.filter((p) => !p.is_archived).length} />

          {activeView === 'settings' ? (
            <SettingsView />
          ) : !hasProjectsOrRoots ? (
            <EmptyState />
          ) : (
            <ProjectGrid />
          )}
        </main>
      </div>

      {/* Toast Overlay */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={clearToast} className="opacity-70 hover:opacity-100 font-bold ml-2">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProjectEditModal />
      <GroupModal />
      <TagModal />
    </div>
  );
};
