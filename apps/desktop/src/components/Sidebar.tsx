import React from 'react';
import {
  FolderGit2,
  Star,
  Clock,
  FolderOpen,
  AlertTriangle,
  Archive,
  FolderKanban,
  Plus,
  Tag as TagIcon,
  Settings,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Logo, IconButton, Badge } from '@git-manager/ui';
import { useAppStore, MainView } from '../store/useAppStore.js';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    selectedGroupId,
    selectedTagId,
    projects,
    groups,
    tags,
    setActiveView,
    setGroupModalState,
    setTagModalState,
    deleteGroup,
    deleteTag,
  } = useAppStore();

  const counts = React.useMemo(() => {
    return {
      all: projects.filter((p) => !p.is_archived).length,
      favorites: projects.filter((p) => p.is_favorite && !p.is_archived).length,
      recent: projects.filter((p) => p.last_opened_at && !p.is_archived).length,
      unassigned: projects.filter((p) => !p.group_id && !p.is_archived).length,
      missing: projects.filter((p) => p.is_missing && !p.is_archived).length,
      archived: projects.filter((p) => p.is_archived).length,
    };
  }, [projects]);

  const navItems: { id: MainView; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'all', label: 'All Projects', icon: <FolderGit2 className="w-4 h-4" />, count: counts.all },
    { id: 'favorites', label: 'Favorites', icon: <Star className="w-4 h-4 text-amber-500" />, count: counts.favorites },
    { id: 'recent', label: 'Recently Opened', icon: <Clock className="w-4 h-4 text-blue-400" />, count: counts.recent },
    { id: 'unassigned', label: 'Unassigned', icon: <FolderOpen className="w-4 h-4 text-slate-400" />, count: counts.unassigned },
    { id: 'missing', label: 'Missing', icon: <AlertTriangle className="w-4 h-4 text-rose-500" />, count: counts.missing },
    { id: 'archived', label: 'Archived', icon: <Archive className="w-4 h-4 text-slate-500" />, count: counts.archived },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-slate-900/90 border-r border-slate-800 text-slate-300 h-screen select-none">
      {/* App Header */}
      <div className="p-4 border-b border-slate-800/80">
        <Logo size="md" />
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
        <div className="space-y-1">
          <div className="px-2 pb-1 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            Overview
          </div>
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Groups List */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Groups</span>
            <IconButton
              icon={<Plus className="w-3.5 h-3.5" />}
              title="Create new group"
              size="sm"
              onClick={() => setGroupModalState(true)}
            />
          </div>
          {groups.length === 0 ? (
            <div className="px-2 py-2 text-xs text-slate-500 italic">No custom groups</div>
          ) : (
            groups.map((group) => {
              const isActive = activeView === 'group' && selectedGroupId === group.id;
              const groupCount = projects.filter((p) => p.group_id === group.id && !p.is_archived).length;
              return (
                <div key={group.id} className="group relative flex items-center">
                  <button
                    onClick={() => setActiveView('group', group.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-6">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="truncate">{group.name}</span>
                    </div>
                    {groupCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
                        {groupCount}
                      </span>
                    )}
                  </button>
                  <div className="absolute right-1 hidden group-hover:flex items-center gap-0.5 bg-slate-800/90 rounded p-0.5 shadow-sm">
                    <IconButton
                      icon={<Pencil className="w-3 h-3" />}
                      title="Edit group"
                      size="sm"
                      onClick={() => setGroupModalState(true, group)}
                    />
                    <IconButton
                      icon={<Trash2 className="w-3 h-3" />}
                      title="Delete group"
                      variant="danger"
                      size="sm"
                      onClick={() => deleteGroup(group.id)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Tags List */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Tags</span>
            <IconButton
              icon={<Plus className="w-3.5 h-3.5" />}
              title="Create new tag"
              size="sm"
              onClick={() => setTagModalState(true)}
            />
          </div>
          {tags.length === 0 ? (
            <div className="px-2 py-2 text-xs text-slate-500 italic">No tags created</div>
          ) : (
            tags.map((tag) => {
              const isActive = activeView === 'tag' && selectedTagId === tag.id;
              return (
                <div key={tag.id} className="group relative flex items-center">
                  <button
                    onClick={() => setActiveView('tag', null, tag.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-6">
                      <TagIcon className="w-3.5 h-3.5" style={{ color: tag.color }} />
                      <span className="truncate">{tag.name}</span>
                    </div>
                  </button>
                  <div className="absolute right-1 hidden group-hover:flex items-center gap-0.5 bg-slate-800/90 rounded p-0.5">
                    <IconButton
                      icon={<Pencil className="w-3 h-3" />}
                      title="Edit tag"
                      size="sm"
                      onClick={() => setTagModalState(true, tag)}
                    />
                    <IconButton
                      icon={<Trash2 className="w-3 h-3" />}
                      title="Delete tag"
                      variant="danger"
                      size="sm"
                      onClick={() => deleteTag(tag.id)}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Settings Footer Link */}
      <div className="p-3 border-t border-slate-800/80">
        <button
          onClick={() => setActiveView('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeView === 'settings'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
