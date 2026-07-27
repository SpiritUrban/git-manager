import React, { useState } from 'react';
import { X, FolderOpen, Globe, GitBranch, Star, Archive, Save } from 'lucide-react';
import { Button, Input } from '@git-manager/ui';
import { useAppStore } from '../store/useAppStore.js';
import { isValidHttpUrl, type Project } from '@git-manager/shared';
import * as tauri from '../services/tauri.js';

/**
 * The dialog is mounted unconditionally, so the "is anything being edited"
 * check has to happen before any state exists. Keeping the form in a child
 * means its hooks only ever run while a project is actually open, and the
 * `key` gives each project a fresh form instead of leaving the previous
 * project's values behind.
 */
export const ProjectEditModal: React.FC = () => {
  const editingProject = useAppStore((s) => s.editingProject);

  if (!editingProject) return null;

  return <ProjectEditForm key={editingProject.id} project={editingProject} />;
};

const ProjectEditForm: React.FC<{ project: Project }> = ({ project }) => {
  const { groups, tags, setEditingProject, updateProjectData, relinkFolder, showToast } =
    useAppStore();

  const [name, setName] = useState(project.name);
  const [path, setPath] = useState(project.path);
  const [groupId, setGroupId] = useState<string>(project.group_id || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    project.tags?.map((t) => t.id) || []
  );
  const [websiteUrl, setWebsiteUrl] = useState(project.website_url || '');
  const [repositoryUrl, setRepositoryUrl] = useState(project.repository_url || '');
  const [isFavorite, setIsFavorite] = useState(project.is_favorite);
  const [isArchived, setIsArchived] = useState(project.is_archived);

  const [urlError, setUrlError] = useState('');

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleDetectName = async () => {
    try {
      const detected = await tauri.invokeDetectProjectName(path.trim() || project.path);
      if (detected && detected !== name) {
        setName(detected);
        showToast(`Detected name: ${detected}`, 'info');
      } else if (detected === name) {
        showToast('Already matches the detected name', 'info');
      }
    } catch (err: any) {
      showToast(`Could not read the project folder: ${err.message || err}`, 'error');
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
        id: project.id,
        name: name.trim() || project.name,
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
          <div>
            <Input
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project Name"
              required
            />
            {/* The name is only captured when a project is first discovered, so
                a package.json corrected afterwards had no way in short of
                removing and rescanning the project. */}
            <button
              type="button"
              onClick={handleDetectName}
              className="mt-1.5 text-[11px] text-indigo-400 hover:underline"
            >
              Detect from folder and package.json
            </button>
          </div>

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

          {/* Tags — always rendered: hiding the whole block when no tags exist
              left no hint that projects can be tagged at all. */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Project Tags</label>
            <div className="flex flex-wrap gap-2 p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl">
              {tags.length === 0 ? (
                <span className="text-xs text-slate-500 italic">
                  No tags yet — create one in the sidebar, then assign it here.
                </span>
              ) : (
                tags.map((t) => {
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
                })
              )}
            </div>
          </div>

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
