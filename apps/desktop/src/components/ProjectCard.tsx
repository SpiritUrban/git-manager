import React, { useState } from 'react';
import {
  Code2,
  Terminal,
  Folder,
  Globe,
  Star,
  MoreVertical,
  AlertTriangle,
  Archive,
  Pencil,
  RefreshCcw,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Card, Badge, IconButton, Button } from '@git-manager/ui';
import type { Project, Group } from '@git-manager/shared';
import { getFallbackInitials } from '@git-manager/shared';
import { useAppStore } from '../store/useAppStore.js';
import * as tauri from '../services/tauri.js';

interface ProjectCardProps {
  project: Project;
  group?: Group;
  dragHandleProps?: any;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, group, dragHandleProps }) => {
  const {
    launchEditor,
    launchTerminal,
    launchFolder,
    launchWebsite,
    toggleFavorite,
    toggleArchived,
    deleteProject,
    setEditingProject,
    relinkFolder,
    showToast,
    loadProjects,
  } = useAppStore();

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [relinkInput, setRelinkInput] = useState(false);

  const handleDoubleClick = () => {
    if (!project.is_missing) {
      launchEditor(project);
    }
  };

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
    if (project.icon_cache_path) {
      return (
        <img
          src={`asset://${project.icon_cache_path}`}
          alt={project.name}
          className="w-10 h-10 rounded-lg object-contain bg-slate-800 p-1 border border-slate-700"
          onError={(e) => {
            // Fallback to initials if image fails to render
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    const initials = getFallbackInitials(project.name);
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
        onDoubleClick={handleDoubleClick}
        className={`p-4 flex flex-col justify-between h-full bg-slate-900/90 border-slate-800/80 hover:border-indigo-500/50 transition-all shadow-lg ${
          project.is_missing ? 'border-rose-500/50 bg-rose-950/10' : ''
        }`}
      >
        {/* Top Header Row */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
                {renderIcon()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100 truncate tracking-tight hover:text-indigo-400 transition-colors">
                    {project.name}
                  </h3>
                  {project.is_favorite && (
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5" title={project.path}>
                  {project.path}
                </div>
              </div>
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center gap-1 shrink-0">
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
                onClick={() => setShowContextMenu(!showContextMenu)}
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
          <div className="mb-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2">
            <span className="text-[11px] text-rose-300 font-medium">Folder missing on disk</span>
            <Button size="sm" variant="danger" onClick={handleRelink}>
              Relink
            </Button>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80">
          <IconButton
            icon={<Code2 className="w-4 h-4 text-indigo-400" />}
            title={project.is_missing ? 'Missing project cannot be opened' : 'Open in editor'}
            variant="secondary"
            size="md"
            disabled={project.is_missing}
            onClick={() => launchEditor(project)}
          />
          <IconButton
            icon={<Terminal className="w-4 h-4 text-emerald-400" />}
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
        </div>
      </Card>

      {/* Context Menu Dropdown */}
      {showContextMenu && (
        <div className="absolute right-2 top-10 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 text-xs select-none">
          <button
            onClick={() => {
              setShowContextMenu(false);
              setEditingProject(project);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800"
          >
            <Pencil className="w-3.5 h-3.5 text-indigo-400" />
            Edit project details
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
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
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

          {project.repository_url && (
            <button
              onClick={() => {
                setShowContextMenu(false);
                tauri.invokeOpenBrowserUrl(project.repository_url!);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              Open repository web URL
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
