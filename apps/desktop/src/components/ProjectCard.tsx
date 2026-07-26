import React, { useState } from 'react';
import {
  Code2,
  Terminal,
  Folder,
  GitBranch,
  Github,
  Globe,
  Star,
  MoreVertical,
  AlertTriangle,
  Archive,
  Pencil,
  RefreshCcw,
  Trash2,
  ExternalLink,
  Play,
  FolderKanban,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Card, Badge, IconButton, Button } from '@git-manager/ui';
import type { Project, Group } from '@git-manager/shared';
import { describeRepositoryUrl, getFallbackInitials, resolveRepositoryUrl } from '@git-manager/shared';
import { useAppStore } from '../store/useAppStore.js';
import * as tauri from '../services/tauri.js';

interface ProjectCardProps {
  project: Project;
  group?: Group;
  dragHandleProps?: any;
}

/** GitHub gets its own mark; every other host falls back to a generic git icon. */
function repositoryIcon(url: string | null): React.ReactNode {
  const isGithub = url?.includes('github.com') ?? false;
  const Icon = isGithub ? Github : GitBranch;
  return <Icon className={`w-4 h-4 ${url ? 'text-slate-300' : 'text-slate-600'}`} />;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, group, dragHandleProps }) => {
  const {
    launchEditor,
    launchTerminal,
    launchDevServer,
    launchFolder,
    launchWebsite,
    launchRepository,
    toggleFavorite,
    toggleArchived,
    deleteProject,
    setEditingProject,
    relinkFolder,
    openProjectDetail,
    showToast,
    groups,
    updateProjectData,
  } = useAppStore();

  const [showContextMenu, setShowContextMenu] = useState(false);
  // Assigning a group used to be reachable only through the edit dialog, behind
  // a menu entry that never mentioned groups.
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const toggleContextMenu = () => {
    setShowContextMenu((open) => !open);
    setShowGroupPicker(false);
  };

  const handleMoveToGroup = async (targetGroupId: string | null) => {
    setShowGroupPicker(false);
    setShowContextMenu(false);
    // No tag list passed, so the project's tags are left untouched.
    await updateProjectData({ id: project.id, group_id: targetGroupId });
  };

  /** Everything interactive inside the card sits above the card-wide open handler. */
  const stopBubble = (e: React.MouseEvent) => e.stopPropagation();

  // Falls back to deriving the page from the raw git remote, so the button works
  // even for projects whose stored URL was never filled in.
  const repositoryUrl = resolveRepositoryUrl(project);

  const handleRefreshIcon = async () => {
    setShowContextMenu(false);
    if (project.website_url) {
      try {
        const cached = await tauri.invokeRefreshRemoteFavicon(project.website_url, project.id);
        useAppStore.getState().updateProjectData({
          id: project.id,
          icon_source: 'remote_favicon',
          icon_cache_path: cached,
        });
        showToast('Icon refreshed successfully', 'success');
      } catch (err: any) {
        showToast(`Failed to refresh icon: ${err.message || err}`, 'error');
      }
    } else {
      showToast('No website URL configured to fetch favicon', 'info');
    }
  };

  const handleRelink = async () => {
    const selected = await tauri.selectFolderDialog('Select Relink Directory');
    if (selected) {
      await relinkFolder(project, selected);
    }
  };

  const handleDeleteWithConfirm = async () => {
    setShowContextMenu(false);
    if (confirm(`Remove "${project.name}" from Git Manager?\n\nNote: This will only remove the record from Git Manager database. No files on your disk will be deleted.`)) {
      await deleteProject(project);
    }
  };

  const renderIcon = () => {
    let iconSrc: string | null = null;

    // 1. Highest priority: Local icon file discovered in project directory
    if (project.icon_cache_path) {
      if (project.icon_cache_path.startsWith('http://') || project.icon_cache_path.startsWith('https://')) {
        iconSrc = project.icon_cache_path;
      } else {
        // Local file on disk (project favicon or cached copy) — the asset protocol
        // resolves to http://asset.localhost/... on Windows, asset://localhost/... elsewhere.
        iconSrc = convertFileSrc(project.icon_cache_path);
      }
    } else if (project.website_url) {
      // 2. Custom website URL (e.g. https://my-app.dev)
      try {
        const u = new URL(project.website_url);
        if (!u.hostname.includes('github.com') && !u.hostname.includes('gitlab.com')) {
          iconSrc = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
        }
      } catch {}
    }

    const initials = getFallbackInitials(project.name);

    if (iconSrc) {
      return (
        <div className="relative w-10 h-10 shrink-0">
          <img
            src={iconSrc}
            alt={project.name}
            className="w-10 h-10 rounded-lg object-contain bg-slate-800 p-1 border border-slate-700 shadow-sm"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fb = parent.querySelector('.initials-fallback') as HTMLElement;
                if (fb) fb.style.display = 'flex';
              }
            }}
          />
          <div className="initials-fallback hidden w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 items-center justify-center font-black text-indigo-400 text-sm tracking-wider select-none shrink-0 shadow-inner">
            {initials}
          </div>
        </div>
      );
    }

    return (
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400 text-sm tracking-wider select-none shrink-0 shadow-inner">
        {initials}
      </div>
    );
  };

  return (
    <div className="relative group">
      <Card
        interactive
        role="button"
        tabIndex={0}
        title={`Open ${project.name} overview`}
        onClick={() => openProjectDetail(project)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProjectDetail(project);
          }
        }}
        className={`p-4 flex flex-col justify-between h-full bg-slate-900/90 border-slate-800/80 hover:border-indigo-500/50 transition-all shadow-lg ${
          project.is_missing ? 'border-rose-500/50 bg-rose-950/10' : ''
        }`}
      >
        {/* Top Header Row */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div
                {...dragHandleProps}
                onClick={stopBubble}
                className="cursor-grab active:cursor-grabbing"
              >
                {renderIcon()}
              </div>
              <div className="min-w-0">
                <h3
                  className="text-sm font-bold text-slate-100 truncate tracking-tight group-hover:text-indigo-400 transition-colors"
                  title={project.path}
                >
                  {project.name}
                </h3>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {repositoryUrl ? describeRepositoryUrl(repositoryUrl) : 'Local repository'}
                </div>
              </div>
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center gap-1 shrink-0" onClick={stopBubble}>
              <IconButton
                icon={<Star className={`w-3.5 h-3.5 ${project.is_favorite ? 'fill-amber-500 text-amber-500' : 'text-slate-500'}`} />}
                title={project.is_favorite ? 'Remove favorite' : 'Add to favorites'}
                size="sm"
                onClick={() => toggleFavorite(project)}
              />
              <IconButton
                icon={<MoreVertical className="w-3.5 h-3.5 text-slate-400" />}
                title="Project options"
                size="sm"
                onClick={toggleContextMenu}
              />
            </div>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {group && (
              <Badge color={group.color}>
                {group.name}
              </Badge>
            )}
            {project.tags?.map((t) => (
              <Badge key={t.id} color={t.color}>
                {t.name}
              </Badge>
            ))}
            {project.is_missing && (
              <Badge variant="danger">
                <AlertTriangle className="w-3 h-3" /> Missing
              </Badge>
            )}
            {project.is_archived && (
              <Badge variant="outline">
                <Archive className="w-3 h-3" /> Archived
              </Badge>
            )}
          </div>
        </div>

        {/* Missing Relink Banner */}
        {project.is_missing && (
          <div
            onClick={stopBubble}
            className="mb-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2"
          >
            <span className="text-[11px] text-rose-300 font-medium">Folder missing on disk</span>
            <Button size="sm" variant="danger" onClick={handleRelink}>
              Relink
            </Button>
          </div>
        )}

        {/* Action Buttons Row */}
        {/* Six actions in two rows of three: a single row of six overflows the
            card at the 4-column grid width, and wrapping is width-independent. */}
        <div
          className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80"
          onClick={stopBubble}
        >
          <IconButton
            icon={<Play className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />}
            title={project.is_missing ? 'Missing project cannot be opened' : 'Launch dev server (npm run dev)'}
            variant="secondary"
            size="md"
            disabled={project.is_missing}
            onClick={() => launchDevServer(project)}
          />
          <IconButton
            icon={<Code2 className="w-4 h-4 text-indigo-400" />}
            title={project.is_missing ? 'Missing project cannot be opened' : 'Open in editor'}
            variant="secondary"
            size="md"
            disabled={project.is_missing}
            onClick={() => launchEditor(project)}
          />
          <IconButton
            icon={<Terminal className="w-4 h-4 text-sky-400" />}
            title={project.is_missing ? 'Missing project cannot be opened' : 'Open terminal'}
            variant="secondary"
            size="md"
            disabled={project.is_missing}
            onClick={() => launchTerminal(project)}
          />
          <IconButton
            icon={<Folder className="w-4 h-4 text-amber-400" />}
            title={project.is_missing ? 'Missing project cannot be opened' : 'Open project folder'}
            variant="secondary"
            size="md"
            disabled={project.is_missing}
            onClick={() => launchFolder(project)}
          />
          <IconButton
            icon={<Globe className={`w-4 h-4 ${project.website_url ? 'text-blue-400' : 'text-slate-600'}`} />}
            title={project.website_url ? `Open website (${project.website_url})` : 'Website is not configured'}
            variant="secondary"
            size="md"
            disabled={!project.website_url}
            onClick={() => launchWebsite(project)}
          />
          <IconButton
            icon={repositoryIcon(repositoryUrl)}
            title={
              repositoryUrl
                ? `Open repository page (${describeRepositoryUrl(repositoryUrl)})`
                : 'No git remote configured'
            }
            variant="secondary"
            size="md"
            disabled={!repositoryUrl}
            onClick={() => launchRepository(project)}
          />
        </div>
      </Card>

      {/* Context Menu Dropdown */}
      {showContextMenu && (
        <div className="absolute right-2 top-10 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 text-xs select-none">
          <button
            onClick={() => {
              setShowContextMenu(false);
              launchDevServer(project);
            }}
            disabled={project.is_missing}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
            Launch dev server (npm run dev)
          </button>
          <button
            onClick={() => setShowGroupPicker(!showGroupPicker)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800"
          >
            <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
            Move to group
            {showGroupPicker ? (
              <ChevronDown className="w-3.5 h-3.5 ml-auto text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-500" />
            )}
          </button>

          {showGroupPicker && (
            <div className="ml-2 pl-2 border-l border-slate-800 space-y-0.5 max-h-44 overflow-y-auto">
              <button
                onClick={() => handleMoveToGroup(null)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 ${
                  project.group_id ? 'text-slate-400' : 'text-indigo-300 font-semibold'
                }`}
              >
                <span className="w-2 h-2 rounded-full border border-slate-600 shrink-0" />
                No group
              </button>
              {groups.length === 0 ? (
                <div className="px-2.5 py-1.5 text-slate-500 italic">
                  No groups yet — create one in the sidebar
                </div>
              ) : (
                groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleMoveToGroup(g.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 ${
                      project.group_id === g.id ? 'text-indigo-300 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: g.color }}
                    />
                    <span className="truncate">{g.name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          <button
            onClick={() => {
              setShowContextMenu(false);
              setEditingProject(project);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800"
          >
            <Pencil className="w-3.5 h-3.5 text-indigo-400" />
            Edit details, group &amp; tags
          </button>
          <button
            onClick={() => {
              setShowContextMenu(false);
              launchEditor(project);
            }}
            disabled={project.is_missing}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            Open in editor
          </button>
          <button
            onClick={() => {
              setShowContextMenu(false);
              launchTerminal(project);
            }}
            disabled={project.is_missing}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            Open terminal
          </button>
          <button
            onClick={() => {
              setShowContextMenu(false);
              launchFolder(project);
            }}
            disabled={project.is_missing}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            Open folder
          </button>

          {repositoryUrl && (
            <button
              onClick={() => {
                setShowContextMenu(false);
                launchRepository(project);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              Open repository page
            </button>
          )}

          <button
            onClick={handleRefreshIcon}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800"
          >
            <RefreshCcw className="w-3.5 h-3.5 text-slate-400" />
            Refresh favicon
          </button>

          <button
            onClick={() => {
              setShowContextMenu(false);
              toggleArchived(project);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800"
          >
            <Archive className="w-3.5 h-3.5 text-slate-400" />
            {project.is_archived ? 'Unarchive project' : 'Archive project'}
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            onClick={handleDeleteWithConfirm}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            Remove from Git Manager
          </button>
        </div>
      )}
    </div>
  );
};
