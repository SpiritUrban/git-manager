import React from 'react';
import { GitBranch, GitCommit, GitPullRequest, Layers, ShieldCheck } from 'lucide-react';
import { Badge } from '@git-manager/ui';

export const RoadmapSection: React.FC = () => {
  const roadmapItems = [
    {
      icon: <GitBranch className="w-5 h-5 text-indigo-400" />,
      title: 'Branch Status & Ahead/Behind Badges',
      desc: 'Display active branch names and unpushed/unpulled commit counters on project cards.',
    },
    {
      icon: <GitCommit className="w-5 h-5 text-emerald-400" />,
      title: 'Quick Commit & Stash Actions',
      desc: 'Lightweight actions to quickly stash changes or create simple commits without opening heavy IDEs.',
    },
    {
      icon: <GitPullRequest className="w-5 h-5 text-blue-400" />,
      title: 'Diff Viewer & Modified Files List',
      desc: 'Built-in side-by-side diff preview for uncommitted worktree changes.',
    },
    {
      icon: <Layers className="w-5 h-5 text-amber-400" />,
      title: 'Nested Group Trees & Workspaces',
      desc: 'Multi-level folder hierarchies and multi-window workspace layouts.',
    },
  ];

  return (
    <section id="roadmap" className="py-20 border-t border-slate-800/80 bg-slate-900/40 select-none">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" className="mb-3">
            Future Development
          </Badge>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-3">
            Product Roadmap
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Upcoming features planned for subsequent major releases of Git Manager.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {roadmapItems.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4"
            >
              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700/80 shrink-0">
                {item.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-100">{item.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Planned
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
