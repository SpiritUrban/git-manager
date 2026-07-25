import React from 'react';
import {
  FolderGit2,
  FolderKanban,
  Grip,
  Code2,
  Terminal,
  FolderOpen,
  Globe,
  Cpu,
  RefreshCw,
  HardDrive,
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <FolderGit2 className="w-6 h-6 text-indigo-400" />,
      title: 'All repositories in one place',
      desc: 'Multithreaded background discovery scans your root directories and aggregates your Git projects into an intuitive visual hub.',
    },
    {
      icon: <FolderKanban className="w-6 h-6 text-blue-400" />,
      title: 'Groups and tags',
      desc: 'Categorize your codebase into color-coded groups and apply multi-tag labels to filter projects instantly.',
    },
    {
      icon: <Grip className="w-6 h-6 text-emerald-400" />,
      title: 'Drag-and-drop organization',
      desc: 'Manually reorder project cards and groups with drag-and-drop controls saved persistently in your local database.',
    },
    {
      icon: <Code2 className="w-6 h-6 text-indigo-400" />,
      title: 'Open in editor',
      desc: 'One-click IDE launching for VS Code, VS Code Insiders, Cursor, or custom IDE executables with custom argument templates.',
    },
    {
      icon: <Terminal className="w-6 h-6 text-emerald-400" />,
      title: 'Open terminal',
      desc: 'Launch Windows Terminal, PowerShell, CMD, macOS Terminal, iTerm, GNOME Terminal, Konsole, Kitty, or Alacritty directly in project directory.',
    },
    {
      icon: <FolderOpen className="w-6 h-6 text-amber-400" />,
      title: 'Open project folder',
      desc: 'Instantly reveal repository locations in your native OS file browser (Explorer, Finder, or Linux File Manager).',
    },
    {
      icon: <Globe className="w-6 h-6 text-cyan-400" />,
      title: 'Open deployed website',
      desc: 'Quick access to project homepages or normalized Git remote URLs (GitHub, GitLab, Bitbucket) in your web browser.',
    },
    {
      icon: <Cpu className="w-6 h-6 text-rose-400" />,
      title: 'Cross-platform builds',
      desc: 'Native performance for Windows x64, macOS Intel, macOS Apple Silicon, and Linux x64.',
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-purple-400" />,
      title: 'In-app updates',
      desc: 'Automatic background update checks powered by Tauri Updater with signature verification and restart prompts.',
    },
    {
      icon: <HardDrive className="w-6 h-6 text-slate-400" />,
      title: 'Local-first storage',
      desc: 'Your repository data, paths, and preferences remain strictly on your local device stored securely in SQLite.',
    },
  ];

  return (
    <section id="features" className="py-20 border-t border-slate-800/80 bg-slate-950/60 select-none">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-3">
            Designed for developer velocity
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Git Manager gives you clear visibility over all your local codebases without the bloat of heavy Git clients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-500/40 transition-all shadow-md group"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
