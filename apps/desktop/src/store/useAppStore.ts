import { create } from 'zustand';
import type { Project, Group, Tag, ScanRoot, AppSettings, SortOption, ScanProgress, ScanSummary, ProjectAnalysis } from '@git-manager/shared';
import { isInfrastructureUrl, pointsAtRepository, resolveRepositoryUrl } from '@git-manager/shared';
import * as db from '../services/db.js';
import * as tauri from '../services/tauri.js';
import { listen } from '@tauri-apps/api/event';

export type MainView =
  | 'all'
  | 'favorites'
  | 'recent'
  | 'unassigned'
  | 'missing'
  | 'archived'
  | 'group'
  | 'tag'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

interface AppState {
  // Views & Filtering
  activeView: MainView;
  selectedGroupId: string | null;
  selectedTagId: string | null;
  searchQuery: string;
  sortOption: SortOption;

  // Data Lists
  projects: Project[];
  groups: Group[];
  tags: Tag[];
  scanRoots: ScanRoot[];
  settings: AppSettings;

  // Scanner State
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  lastScanSummary: ScanSummary | null;

  // Project Detail Page
  openProjectId: string | null;
  analysis: ProjectAnalysis | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // Modals & Toasts
  toast: ToastMessage | null;
  editingProject: Project | null;
  groupModalState: { isOpen: boolean; group: Group | null };
  tagModalState: { isOpen: boolean; tag: Tag | null };

  // Actions
  init: () => Promise<void>;
  setActiveView: (view: MainView, groupId?: string | null, tagId?: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortOption: (sort: SortOption) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  clearToast: () => void;

  // Data Loading & Syncing
  loadProjects: () => Promise<void>;
  loadGroups: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadScanRoots: () => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Scanning Operations
  startScan: (rootPath?: string) => Promise<void>;
  cancelScan: () => Promise<void>;

  // Project Actions
  launchEditor: (project: Project) => Promise<void>;
  launchTerminal: (project: Project) => Promise<void>;
  launchDevServer: (project: Project) => Promise<void>;
  launchFolder: (project: Project) => Promise<void>;
  launchWebsite: (project: Project) => Promise<void>;
  launchRepository: (project: Project) => Promise<void>;
  toggleFavorite: (project: Project) => Promise<void>;
  toggleArchived: (project: Project) => Promise<void>;
  updateProjectData: (project: Partial<Project> & { id: string }, tagIds?: string[]) => Promise<void>;
  deleteProject: (project: Project) => Promise<void>;
  relinkFolder: (project: Project, newPath: string) => Promise<void>;
  reorderProjects: (orderedProjects: Project[]) => Promise<void>;

  // Group & Tag Actions
  saveGroup: (group: Partial<Group> & { name: string; color: string }) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  toggleGroupCollapsed: (groupId: string) => Promise<void>;
  reorderGroups: (orderedGroups: Group[]) => Promise<void>;

  saveTag: (tag: Partial<Tag> & { name: string; color: string }) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;

  // Project Detail Page
  openProjectDetail: (project: Project) => Promise<void>;
  closeProjectDetail: () => void;
  refreshAnalysis: () => Promise<void>;

  // Modal Triggers
  setEditingProject: (project: Project | null) => void;
  setGroupModalState: (isOpen: boolean, group?: Group | null) => void;
  setTagModalState: (isOpen: boolean, tag?: Tag | null) => void;
}

/** Projects already enriched (or being enriched) this session. */
const enrichmentAttempted = new Set<string>();

/**
 * Fills in the metadata the scanner could not, or filled in wrongly.
 *
 * Two things per project: the favicon (a local icon file in the repo, else the
 * remote favicon of its site) and the website URL (scanned from CNAME, .env,
 * framework configs and package.json). Runs detached from loadProjects so the
 * grid is never blocked, and patches the store per batch as results land.
 */
async function enrichProjects(
  projects: Project[],
  set: (partial: Partial<{ projects: Project[] }>) => void,
  get: () => { projects: Project[] }
): Promise<void> {
  const pending = projects.filter(
    (p) => !p.is_missing && !enrichmentAttempted.has(p.id) && needsEnrichment(p)
  );
  if (pending.length === 0) return;

  for (const p of pending) {
    enrichmentAttempted.add(p.id);
  }

  const CONCURRENCY = 6;
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const resolved = await Promise.all(batch.map(enrichOne));

    const patches = new Map(
      resolved.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => [r.id, r.patch])
    );
    if (patches.size === 0) continue;

    set({
      projects: get().projects.map((p) => {
        const patch = patches.get(p.id);
        return patch ? { ...p, ...patch } : p;
      }),
    });
  }
}

function needsEnrichment(project: Project): boolean {
  return !project.icon_cache_path || !project.website_url || hasBogusWebsite(project);
}

/**
 * True when the stored website URL is provably not a website. Both shapes were
 * written by the scanner, not by the user: the `npm init` homepage default that
 * links back to the repository, and a managed-backend endpoint picked up from a
 * `.env` key whose name looked like a site URL.
 */
function hasBogusWebsite(project: Project): boolean {
  return (
    pointsAtRepository(project.website_url, project.repository_url) ||
    isInfrastructureUrl(project.website_url)
  );
}

async function enrichOne(
  project: Project
): Promise<{ id: string; patch: Partial<Project> } | null> {
  const patch: Partial<Project> = {};

  const storedSiteIsBogus = hasBogusWebsite(project);

  if (!project.website_url || storedSiteIsBogus) {
    try {
      const found = await tauri.invokeResolveProjectWebsite(project.path, project.repository_url);
      if (found) {
        patch.website_url = found.url;
      } else if (storedSiteIsBogus) {
        // Nothing better exists and the stored value provably is not a site.
        patch.website_url = null;
      }
    } catch {
      // Detection is best-effort; the edit modal is always available.
    }
  }

  if (!project.icon_cache_path) {
    try {
      const websiteForFavicon = patch.website_url ?? project.website_url;
      const res = await tauri.invokeResolveProjectIcon(
        project.path,
        websiteForFavicon,
        project.id
      );
      if (res.icon_path) {
        patch.icon_source = res.icon_source as Project['icon_source'];
        patch.icon_cache_path = res.icon_path;
      }
    } catch {
      // Leave the project on initials; "Refresh favicon" can retry.
    }
  }

  if (Object.keys(patch).length === 0) return null;

  try {
    await db.updateProject({ id: project.id, ...patch });
  } catch {
    return null;
  }

  return { id: project.id, patch };
}

/**
 * Restores `repository_url` from the raw git remote for projects that are
 * missing it. `remote_origin` survived the partial-update bug that cleared the
 * derived URL, so this repairs existing databases without a re-scan.
 */
async function backfillRepositoryUrls(
  projects: Project[],
  set: (partial: Partial<{ projects: Project[] }>) => void,
  get: () => { projects: Project[] }
): Promise<void> {
  const repairs = new Map<string, string>();

  for (const project of projects) {
    if (project.repository_url) continue;
    const url = resolveRepositoryUrl(project);
    if (url) repairs.set(project.id, url);
  }

  if (repairs.size === 0) return;

  for (const [id, repository_url] of repairs) {
    try {
      await db.updateProject({ id, repository_url });
    } catch {
      // A failed repair just means the button stays disabled for now.
    }
  }

  set({
    projects: get().projects.map((p) =>
      repairs.has(p.id) ? { ...p, repository_url: repairs.get(p.id)! } : p
    ),
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  activeView: 'all',
  selectedGroupId: null,
  selectedTagId: null,
  searchQuery: '',
  sortOption: 'manual',

  projects: [],
  groups: [],
  tags: [],
  scanRoots: [],
  settings: {
    theme: 'system',
    selected_editor_profile: 'code',
    custom_editor_executable: '',
    custom_editor_args: ['{path}'],
    selected_terminal_profile: 'auto',
    custom_terminal_executable: '',
    custom_terminal_args: ['{path}'],
    check_updates_on_startup: true,
    card_density: 'comfortable',
  },

  isScanning: false,
  scanProgress: null,
  lastScanSummary: null,

  openProjectId: null,
  analysis: null,
  isAnalyzing: false,
  analysisError: null,

  toast: null,
  editingProject: null,
  groupModalState: { isOpen: false, group: null },
  tagModalState: { isOpen: false, tag: null },

  init: async () => {
    try {
      await get().loadSettings();
      await get().loadGroups();
      await get().loadTags();
      await get().loadScanRoots();
      await get().loadProjects();

      // Listen for Tauri scan progress events
      try {
        await listen<ScanProgress>('scan-progress', (event) => {
          set({ scanProgress: event.payload });
        });
      } catch (e) {
        console.warn('Scan progress event listener setup skipped in non-Tauri mode:', e);
      }
    } catch (err) {
      console.error('Store initialization error:', err);
    }
  },

  setActiveView: (view, groupId = null, tagId = null) => {
    // Navigating the sidebar always returns to the grid.
    set({
      activeView: view,
      selectedGroupId: groupId,
      selectedTagId: tagId,
      openProjectId: null,
      analysis: null,
      analysisError: null,
      isAnalyzing: false,
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortOption: (sort) => set({ sortOption: sort }),

  showToast: (message, type = 'info') => {
    const id = crypto.randomUUID();
    set({ toast: { id, type, message } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 4000);
  },

  clearToast: () => set({ toast: null }),

  loadProjects: async () => {
    const projects = await db.fetchProjects();
    set({ projects });

    // Both run detached so the grid renders immediately.
    void backfillRepositoryUrls(projects, set, get);
    void enrichProjects(projects, set, get);
  },

  loadGroups: async () => {
    const groups = await db.fetchGroups();
    set({ groups });
  },

  loadTags: async () => {
    const tags = await db.fetchTags();
    set({ tags });
  },

  loadScanRoots: async () => {
    const scanRoots = await db.fetchScanRoots();
    set({ scanRoots });
  },

  loadSettings: async () => {
    const settings = await db.fetchSettings();
    set({ settings });

    // Apply theme mode to document element
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System default
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  },

  updateSettings: async (newSettings) => {
    const updated = await db.saveSettings(newSettings);
    set({ settings: updated });
    await get().loadSettings();
    get().showToast('Settings saved successfully', 'success');
  },

  startScan: async (rootPath) => {
    let targetPath = rootPath;

    if (!targetPath) {
      const selected = await tauri.selectFolderDialog();
      if (!selected) return;
      targetPath = selected;
    }

    const normPath = await tauri.invokeNormalizeLocalPath(targetPath);
    await db.addScanRoot(targetPath, normPath);
    await get().loadScanRoots();

    set({ isScanning: true, scanProgress: { scanned_count: 0, current_path: targetPath, repos_found: 0 } });

    try {
      const summary = await tauri.invokeScanRootFolder(targetPath);
      let discoveredRepos = summary.repos || [];

      // Fallback: If no sub-repositories were discovered with .git, treat targetPath itself as a project
      if (discoveredRepos.length === 0) {
        const folderName = targetPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || 'Project';
        discoveredRepos = [
          {
            path: targetPath,
            normalized_path: normPath,
            name: folderName,
            remote_origin: null,
            repository_url: null,
            website_url: null,
            icon_path: null,
          },
        ];
      }

      const upsertResult = await db.upsertScanProjects(discoveredRepos);

      summary.added = upsertResult.added;
      summary.updated = upsertResult.updated;

      set({ lastScanSummary: summary, isScanning: false, scanProgress: null });
      await get().loadProjects();

      get().showToast(
        `Added ${upsertResult.added} new project(s), updated ${upsertResult.updated}`,
        'success'
      );
    } catch (err: any) {
      console.error('Scan error:', err);
      set({ isScanning: false, scanProgress: null });
      get().showToast(`Scan failed: ${err.message || err}`, 'error');
    }
  },

  cancelScan: async () => {
    await tauri.invokeCancelScan();
    set({ isScanning: false, scanProgress: null });
    get().showToast('Scan cancelled by user', 'info');
  },

  launchEditor: async (project) => {
    if (project.is_missing) {
      get().showToast('Project directory is missing. Please relink folder.', 'error');
      return;
    }
    const { settings } = get();
    const res = await tauri.invokeLaunchCodeEditor(
      settings.selected_editor_profile,
      settings.custom_editor_executable,
      settings.custom_editor_args,
      project.path
    );
    if (res.success) {
      const now = new Date().toISOString();
      await db.updateProject({ id: project.id, last_opened_at: now });
      await get().loadProjects();
    } else {
      get().showToast(`Failed to open editor: ${res.error}`, 'error');
    }
  },

  launchTerminal: async (project) => {
    if (project.is_missing) {
      get().showToast('Project directory is missing. Please relink folder.', 'error');
      return;
    }
    const { settings } = get();
    const res = await tauri.invokeLaunchTerminal(
      settings.selected_terminal_profile,
      settings.custom_terminal_executable,
      settings.custom_terminal_args,
      project.path
    );
    if (res.success) {
      const now = new Date().toISOString();
      await db.updateProject({ id: project.id, last_opened_at: now });
      await get().loadProjects();
    } else {
      get().showToast(`Failed to open terminal: ${res.error}`, 'error');
    }
  },

  launchDevServer: async (project) => {
    if (project.is_missing) {
      get().showToast('Project directory is missing. Please relink folder.', 'error');
      return;
    }
    const { settings } = get();
    const res = await tauri.invokeLaunchDevServer(
      settings.selected_terminal_profile,
      settings.custom_terminal_executable,
      settings.custom_terminal_args,
      project.path
    );
    if (res.success) {
      const now = new Date().toISOString();
      await db.updateProject({ id: project.id, last_opened_at: now });
      await get().loadProjects();
    } else {
      get().showToast(`Failed to launch dev server: ${res.error}`, 'error');
    }
  },

  launchFolder: async (project) => {
    if (project.is_missing) {
      get().showToast('Project directory is missing. Please relink folder.', 'error');
      return;
    }
    const res = await tauri.invokeOpenFolder(project.path);
    if (!res.success) {
      get().showToast(`Failed to open folder: ${res.error}`, 'error');
    }
  },

  launchWebsite: async (project) => {
    if (!project.website_url) {
      get().showToast('Website is not configured for this project', 'info');
      return;
    }
    try {
      await tauri.invokeOpenBrowserUrl(project.website_url);
    } catch (err: any) {
      get().showToast(`Failed to open website: ${err.message || err}`, 'error');
    }
  },

  launchRepository: async (project) => {
    const url = resolveRepositoryUrl(project);
    if (!url) {
      get().showToast('This project has no git remote to open', 'info');
      return;
    }

    try {
      await tauri.invokeOpenBrowserUrl(url);
    } catch (err: any) {
      get().showToast(`Failed to open repository: ${err.message || err}`, 'error');
      return;
    }

    // The URL was derived from the raw remote — store it so the next render
    // doesn't have to derive it again.
    if (project.repository_url !== url) {
      await db.updateProject({ id: project.id, repository_url: url });
      set({
        projects: get().projects.map((p) =>
          p.id === project.id ? { ...p, repository_url: url } : p
        ),
      });
    }
  },

  toggleFavorite: async (project) => {
    await db.updateProject({ id: project.id, is_favorite: !project.is_favorite });
    await get().loadProjects();
  },

  toggleArchived: async (project) => {
    await db.updateProject({ id: project.id, is_archived: !project.is_archived });
    await get().loadProjects();
    get().showToast(
      project.is_archived ? 'Project restored from archive' : 'Project moved to archive',
      'info'
    );
  },

  updateProjectData: async (projectData, tagIds) => {
    await db.updateProject(projectData);
    if (tagIds) {
      await db.setProjectTags(projectData.id, tagIds);
    }
    await get().loadProjects();
    get().showToast('Project updated', 'success');
  },

  deleteProject: async (project) => {
    await db.deleteProjectFromDb(project.id);
    await get().loadProjects();
    get().showToast(`Removed "${project.name}" from Git Manager`, 'info');
  },

  relinkFolder: async (project, newPath) => {
    const norm = await tauri.invokeNormalizeLocalPath(newPath);
    const exists = await tauri.invokeCheckPathExists(newPath);
    if (!exists) {
      get().showToast('Specified folder path does not exist', 'error');
      return;
    }
    await db.relinkProjectPath(project.id, newPath, norm);
    await get().loadProjects();
    get().showToast('Folder path relinked successfully', 'success');
  },

  reorderProjects: async (orderedProjects) => {
    // Optimistic UI update
    set({ projects: orderedProjects });
    const positions = orderedProjects.map((p, idx) => ({ id: p.id, position: idx }));
    try {
      await db.updateProjectPositions(positions);
    } catch (err) {
      console.error('Failed to save project positions:', err);
      await get().loadProjects(); // Rollback on error
    }
  },

  saveGroup: async (groupData) => {
    await db.saveGroup(groupData);
    await get().loadGroups();
    get().showToast('Group saved', 'success');
  },

  deleteGroup: async (groupId) => {
    await db.deleteGroup(groupId);
    await get().loadGroups();
    await get().loadProjects();
    get().showToast('Group deleted. Projects moved to Unassigned.', 'info');
  },

  toggleGroupCollapsed: async (groupId) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return;
    await db.saveGroup({ ...group, is_collapsed: !group.is_collapsed });
    await get().loadGroups();
  },

  reorderGroups: async (orderedGroups) => {
    set({ groups: orderedGroups });
    const positions = orderedGroups.map((g, idx) => ({ id: g.id, position: idx }));
    try {
      await db.updateGroupPositions(positions);
    } catch (err) {
      console.error('Failed to save group positions:', err);
      await get().loadGroups();
    }
  },

  saveTag: async (tagData) => {
    await db.saveTag(tagData);
    await get().loadTags();
    get().showToast('Tag saved', 'success');
  },

  deleteTag: async (tagId) => {
    await db.deleteTag(tagId);
    await get().loadTags();
    await get().loadProjects();
    get().showToast('Tag deleted', 'info');
  },

  openProjectDetail: async (project) => {
    // Show the page immediately with the header we already have; the analysis
    // streams in behind a skeleton.
    set({
      openProjectId: project.id,
      analysis: null,
      analysisError: null,
      isAnalyzing: true,
    });

    try {
      const analysis = await tauri.invokeAnalyzeProject(project.path);
      // A different project may have been opened while this was running.
      if (get().openProjectId !== project.id) return;
      set({ analysis, isAnalyzing: false });
    } catch (err: any) {
      if (get().openProjectId !== project.id) return;
      set({ analysisError: String(err?.message || err), isAnalyzing: false });
    }
  },

  closeProjectDetail: () =>
    set({ openProjectId: null, analysis: null, analysisError: null, isAnalyzing: false }),

  refreshAnalysis: async () => {
    const { openProjectId, projects, openProjectDetail } = get();
    const project = projects.find((p) => p.id === openProjectId);
    if (project) await openProjectDetail(project);
  },

  setEditingProject: (project) => set({ editingProject: project }),
  setGroupModalState: (isOpen, group = null) => set({ groupModalState: { isOpen, group } }),
  setTagModalState: (isOpen, tag = null) => set({ tagModalState: { isOpen, tag } }),
}));
