import React, { useState } from 'react';
import { Search, RefreshCw, Plus, FolderPlus, GitBranch, ArrowUpDown } from 'lucide-react';
import { Button, IconButton } from '@git-manager/ui';
import { useAppStore } from '../store/useAppStore.js';
import type { SortOption } from '@git-manager/shared';
import * as tauri from '../services/tauri.js';

interface TopbarProps {
  visibleCount: number;
}

export const Topbar: React.FC<TopbarProps> = ({ visibleCount }) => {
  const {
    activeView,
    selectedGroupId,
    selectedTagId,
    groups,
    tags,
    searchQuery,
    sortOption,
    isScanning,
    setSearchQuery,
    setSortOption,
    startScan,
    loadProjects,
    showToast,
  } = useAppStore();

  const [showAddMenu, setShowAddMenu] = useState(false);

  const getViewTitle = () => {
    switch (activeView) {
      case 'all':
        return 'All Projects';
      case 'favorites':
        return 'Favorites';
      case 'recent':
        return 'Recently Opened';
      case 'unassigned':
        return 'Unassigned Projects';
      case 'missing':
        return 'Missing Projects';
      case 'archived':
        return 'Archived Projects';
      case 'group':
        return groups.find((g) => g.id === selectedGroupId)?.name || 'Group View';
      case 'tag':
        return tags.find((t) => t.id === selectedTagId)?.name || 'Tag View';
      case 'settings':
        return 'Application Settings';
      default:
        return 'Git Manager';
    }
  };

  const handleAddSingleRepo = async () => {
    setShowAddMenu(false);
    const selected = await tauri.selectFolderDialog('Select Single Git Repository');
    if (selected) {
      await startScan(selected);
    }
  };

  const handleAddRootFolder = async () => {
    setShowAddMenu(false);
    await startScan();
  };

  return (
    <header className="h-16 shrink-0 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between gap-4 select-none">
      {/* Title & Count */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-lg font-bold text-slate-100 truncate tracking-tight">
          {getViewTitle()}
        </h1>
        {activeView !== 'settings' && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-indigo-400 border border-slate-700">
            {visibleCount}
          </span>
        )}
      </div>

      {activeView !== 'settings' && (
        <div className="flex items-center gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, path, group, tag..."
              className="w-full bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent focus:outline-none cursor-pointer font-medium text-slate-200"
            >
              <option value="manual" className="bg-slate-900 text-slate-200">Manual Order</option>
              <option value="name-asc" className="bg-slate-900 text-slate-200">Name (A–Z)</option>
              <option value="recently-opened" className="bg-slate-900 text-slate-200">Recently Opened</option>
              <option value="recently-added" className="bg-slate-900 text-slate-200">Recently Added</option>
            </select>
          </div>

          {/* Refresh Button */}
          <IconButton
            icon={<RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-indigo-400' : ''}`} />}
            title="Refresh projects"
            onClick={loadProjects}
            disabled={isScanning}
          />

          {/* Add Dropdown Menu */}
          <div className="relative">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              Add
            </Button>

            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 p-1.5 space-y-1 text-xs">
                <button
                  onClick={handleAddRootFolder}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  <FolderPlus className="w-4 h-4 text-indigo-400 group-hover:text-white" />
                  <div className="text-left">
                    <div className="font-semibold">Add Projects Folder</div>
                    <div className="text-[10px] opacity-75">Scan root folder recursively</div>
                  </div>
                </button>
                <button
                  onClick={handleAddSingleRepo}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  <GitBranch className="w-4 h-4 text-blue-400 group-hover:text-white" />
                  <div className="text-left">
                    <div className="font-semibold">Add Single Repository</div>
                    <div className="text-[10px] opacity-75">Add specific .git project</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
