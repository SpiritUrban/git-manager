import React, { useState } from 'react';
import { X, FolderOpen, Globe, GitBranch, Star, Archive, Save } from 'lucide-react';
import { Button, Input } from '@git-manager/ui';
import { useAppStore } from '../store/useAppStore.js';
import { isValidHttpUrl } from '@git-manager/shared';
import * as tauri from '../services/tauri.js';

export const ProjectEditModal: React.FC = () => {
  const {
    editingProject,
    groups,
    tags,
    setEditingProject,
    updateProjectData,
    relinkFolder,
    showToast,
  } = useAppStore();

  if (!editingProject) return null;

  const [name, setName] = useState(editingProject.name);
  const [path, setPath] = useState(editingProject.path);
  const [groupId, setGroupId] = useState<string>(editingProject.group_id || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    editingProject.tags?.map((t) => t.id) || []
  );
  const [websiteUrl, setWebsiteUrl] = useState(editingProject.website_url || '');
  const [repositoryUrl, setRepositoryUrl] = useState(editingProject.repository_url || '');
  const [isFavorite, setIsFavorite] = useState(editingProject.is_favorite);
  const [isArchived, setIsArchived] = useState(editingProject.is_archived);

  const [urlError, setUrlError] = useState('');

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleSelectRelinkPath = async () => {
    const selected = await tauri.selectFolderDialog('Select Local Project Folder');
    if (selected) {
      setPath(selected);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
      setUrlError('Website URL must start with http:// or https://');
      return;
    }
    setUrlError('');

    await updateProjectData(
      {
        id: editingProject.id,
        name: name.trim() || editingProject.name,
        path: path.trim(),
        group_id: groupId || null,
        website_url: websiteUrl.trim() || null,
        repository_url: repositoryUrl.trim() || null,
        is_favorite: isFavorite,
        is_archived: isArchived,
      },
      selectedTagIds
    );

    setEditingProject(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Edit Project Details</h2>
          <button
            onClick={() => setEditingProject(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Display Name */}
          <Input
            label="Display Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project Name"
            required
          />

          {/* Path */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Local Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <Button type="button" variant="secondary" size="sm" icon={<FolderOpen className="w-4 h-4" />} onClick={handleSelectRelinkPath}>
                Browse
              </Button>
            </div>
          </div>

          {/* Group */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Primary Group</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Unassigned</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Project Tags</label>
              <div className="flex flex-wrap gap-2 p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                {tags.map((t) => {
                  const isChecked = selectedTagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggleTag(t.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                        isChecked
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Website URL */}
          <Input
            label="Website URL"
            icon={<Globe className="w-4 h-4" />}
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://my-app.com"
            error={urlError}
          />

          {/* Repository URL */}
          <Input
            label="Repository URL"
            icon={<GitBranch className="w-4 h-4" />}
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
          />

          {/* Flags */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <Star className="w-3.5 h-3.5 text-amber-500" />
              Favorite
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isArchived}
                onChange={(e) => setIsArchived(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <Archive className="w-3.5 h-3.5 text-slate-400" />
              Archived
            </label>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setEditingProject(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
