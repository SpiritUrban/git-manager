import React from 'react';
import {
  FolderGit2,
  Star,
  Clock,
  Code2,
  Terminal,
  Folder,
  Globe,
  Plus,
  Search,
  CheckCircle2,
} from 'lucide-react';

export const HeroMockup: React.FC = () => {
  const demoProjects = [
    { name: 'nextjs-e-commerce', group: 'Frontend', color: '#6366f1', tags: ['React', 'Next.js'], path: '~/Projects/e-commerce', fav: true },
    { name: 'rust-git-scanner', group: 'Core Engine', color: '#10b981', tags: ['Rust', 'Tauri'], path: '~/Projects/git-scanner', fav: true },
    { name: 'mobile-flutter-app', group: 'Mobile', color: '#f59e0b', tags: ['Flutter'], path: '~/Projects/mobile-app', fav: false },
    { name: 'fastapi-backend-service', group: 'Backend', color: '#3b82f6', tags: ['Python'], path: '~/Projects/fastapi-service', fav: false },
  ];

  return (
    <div className="relative mx-auto w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden select-none">
      {/* Top Window Titlebar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-xs font-bold text-slate-400">Git Manager — Desktop Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            v0.1.0 Ready
          </div>
        </div>
      </div>

      {/* App Main Layout */}
      <div className="flex h-[420px]">
        {/* Mock Sidebar */}
        <div className="w-56 bg-slate-950/70 border-r border-slate-800 p-3 space-y-4 text-xs">
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500">Overview</div>
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 font-semibold">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>All Projects</span>
              </div>
              <span className="text-[10px] bg-indigo-500/20 px-1.5 py-0.5 rounded-full">4</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 text-slate-400 hover:text-slate-200">
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Favorites</span>
              </div>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full">2</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 text-slate-400 hover:text-slate-200">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Recent</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500">Groups</div>
            <div className="flex items-center gap-2 px-2 py-1 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Frontend</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Core Engine</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Mobile</span>
            </div>
          </div>
        </div>

        {/* Mock Grid */}
        <div className="flex-1 p-4 bg-slate-900/60 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                readOnly
                value=""
                placeholder="Search local repositories..."
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            {demoProjects.map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-xs shrink-0">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-100 truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{p.path}</div>
                      </div>
                    </div>
                    {p.fav && <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />}
                  </div>

                  <div className="flex items-center gap-1 mb-3">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.group}
                    </span>
                    {p.tags.map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-800/80">
                  <div className="p-1 rounded bg-slate-800 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer" title="Open VS Code">
                    <Code2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-1 rounded bg-slate-800 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer" title="Open Terminal">
                    <Terminal className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-1 rounded bg-slate-800 text-amber-400 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer" title="Open Folder">
                    <Folder className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-1 rounded bg-slate-800 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer" title="Open Website">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
