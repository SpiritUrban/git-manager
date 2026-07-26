import React from 'react';
import {
  FolderGit2,
  Star,
  Clock,
  Code2,
  Terminal,
  Folder,
  Globe,
  Github,
  GitBranch,
  MoreVertical,
  Play,
  Plus,
  Search,
} from 'lucide-react';
import { Card, Badge, IconButton } from '@git-manager/ui';
import { describeRepositoryUrl, getFallbackInitials } from '@git-manager/shared';

interface DemoProject {
  name: string;
  group: { name: string; color: string };
  tags: { name: string; color: string }[];
  repositoryUrl: string | null;
  websiteUrl: string | null;
  isFavorite: boolean;
}

// Mirrors ProjectCard in the desktop app. The card body below reuses the same
// Card/Badge/IconButton primitives the app itself renders, so this preview
// cannot drift away from the real UI the way a hand-copied mockup did.
const demoProjects: DemoProject[] = [
  {
    name: 'nextjs-e-commerce',
    group: { name: 'Frontend', color: '#6366f1' },
    tags: [
      { name: 'React', color: '#38bdf8' },
      { name: 'Next.js', color: '#94a3b8' },
    ],
    repositoryUrl: 'https://github.com/acme/nextjs-e-commerce',
    websiteUrl: 'https://shop.acme.dev',
    isFavorite: true,
  },
  {
    name: 'rust-git-scanner',
    group: { name: 'Core Engine', color: '#10b981' },
    tags: [
      { name: 'Rust', color: '#f97316' },
      { name: 'Tauri', color: '#eab308' },
    ],
    repositoryUrl: 'https://github.com/acme/rust-git-scanner',
    websiteUrl: null,
    isFavorite: true,
  },
  {
    name: 'mobile-flutter-app',
    group: { name: 'Mobile', color: '#f59e0b' },
    tags: [{ name: 'Flutter', color: '#22d3ee' }],
    repositoryUrl: null,
    websiteUrl: null,
    isFavorite: false,
  },
  {
    name: 'fastapi-backend-service',
    group: { name: 'Backend', color: '#3b82f6' },
    tags: [{ name: 'Python', color: '#a78bfa' }],
    repositoryUrl: 'https://gitlab.com/acme/fastapi-service',
    websiteUrl: 'https://api.acme.dev',
    isFavorite: false,
  },
];

/** GitHub gets its own mark; every other host falls back to a generic git icon. */
function repositoryIcon(url: string | null): React.ReactNode {
  const Icon = url?.includes('github.com') ? Github : GitBranch;
  return <Icon className={`w-4 h-4 ${url ? 'text-slate-300' : 'text-slate-600'}`} />;
}

const MockProjectCard: React.FC<{ project: DemoProject }> = ({ project }) => (
  <div className="relative group">
    <Card className="p-4 flex flex-col justify-between h-full bg-slate-900/90 border-slate-800/80 shadow-lg">
      <div>
        {/* Header: icon, name, repository origin */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400 text-sm tracking-wider select-none shrink-0 shadow-inner">
              {getFallbackInitials(project.name)}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-100 truncate tracking-tight group-hover:text-indigo-400 transition-colors">
                {project.name}
              </h3>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {project.repositoryUrl
                  ? describeRepositoryUrl(project.repositoryUrl)
                  : 'Local repository'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <IconButton
              icon={
                <Star
                  className={`w-3.5 h-3.5 ${
                    project.isFavorite ? 'fill-amber-500 text-amber-500' : 'text-slate-500'
                  }`}
                />
              }
              title={project.isFavorite ? 'Remove favorite' : 'Add to favorites'}
              size="sm"
            />
            <IconButton
              icon={<MoreVertical className="w-3.5 h-3.5 text-slate-400" />}
              title="Project options"
              size="sm"
            />
          </div>
        </div>

        {/* Group and tag badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <Badge color={project.group.color}>{project.group.name}</Badge>
          {project.tags.map((tag) => (
            <Badge key={tag.name} color={tag.color}>
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Six actions in two rows of three, as in the app */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80">
        <IconButton
          icon={<Play className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />}
          title="Launch dev server (npm run dev)"
          variant="secondary"
          size="md"
        />
        <IconButton
          icon={<Code2 className="w-4 h-4 text-indigo-400" />}
          title="Open in editor"
          variant="secondary"
          size="md"
        />
        <IconButton
          icon={<Terminal className="w-4 h-4 text-sky-400" />}
          title="Open terminal"
          variant="secondary"
          size="md"
        />
        <IconButton
          icon={<Folder className="w-4 h-4 text-amber-400" />}
          title="Open project folder"
          variant="secondary"
          size="md"
        />
        <IconButton
          icon={
            <Globe
              className={`w-4 h-4 ${project.websiteUrl ? 'text-blue-400' : 'text-slate-600'}`}
            />
          }
          title={project.websiteUrl ? `Open website (${project.websiteUrl})` : 'Website is not configured'}
          variant="secondary"
          size="md"
          disabled={!project.websiteUrl}
        />
        <IconButton
          icon={repositoryIcon(project.repositoryUrl)}
          title={
            project.repositoryUrl
              ? `Open repository page (${describeRepositoryUrl(project.repositoryUrl)})`
              : 'No git remote configured'
          }
          variant="secondary"
          size="md"
          disabled={!project.repositoryUrl}
        />
      </div>
    </Card>
  </div>
);

export const HeroMockup: React.FC = () => {
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
      <div className="flex h-[532px]">
        {/* Mock Sidebar */}
        <div className="w-56 bg-slate-950/70 border-r border-slate-800 p-3 space-y-4 text-xs shrink-0">
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500">Overview</div>
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 font-semibold">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>All Projects</span>
              </div>
              <span className="text-[10px] bg-indigo-500/20 px-1.5 py-0.5 rounded-full">4</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 text-slate-400">
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Favorites</span>
              </div>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full">2</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Recent</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-500">Groups</div>
            {demoProjects.map((p) => (
              <div key={p.group.name} className="flex items-center gap-2 px-2 py-1 text-slate-300">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: p.group.color }}
                />
                <span>{p.group.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mock Grid */}
        <div className="flex-1 min-w-0 p-4 bg-slate-900/60 overflow-y-auto space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            {demoProjects.map((project) => (
              <MockProjectCard key={project.name} project={project} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
