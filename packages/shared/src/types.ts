export interface Project {
  id: string;
  path: string;
  normalized_path: string;
  name: string;
  group_id: string | null;
  manual_position: number;
  website_url: string | null;
  repository_url: string | null;
  remote_origin: string | null;
  icon_source: 'custom' | 'local_favicon' | 'remote_favicon' | 'initials' | null;
  icon_cache_path: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_missing: boolean;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Group {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTag {
  project_id: string;
  tag_id: string;
}

export interface ScanRoot {
  id: string;
  path: string;
  normalized_path: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';
export type EditorProfileId = 'code' | 'code-insiders' | 'cursor' | 'custom';
export type TerminalProfileId = 'auto' | 'wt' | 'powershell' | 'cmd' | 'iterm' | 'terminal' | 'gnome-terminal' | 'konsole' | 'kitty' | 'alacritty' | 'xfce' | 'custom';
export type CardDensity = 'compact' | 'comfortable';
export type SortOption = 'manual' | 'name-asc' | 'recently-opened' | 'recently-added';

export interface AppSettings {
  theme: ThemeMode;
  selected_editor_profile: EditorProfileId;
  custom_editor_executable: string;
  custom_editor_args: string[];
  selected_terminal_profile: TerminalProfileId;
  custom_terminal_executable: string;
  custom_terminal_args: string[];
  check_updates_on_startup: boolean;
  card_density: CardDensity;
}

export interface DiscoveredRepo {
  path: string;
  normalized_path: string;
  name: string;
  remote_origin?: string | null;
  repository_url?: string | null;
  website_url?: string | null;
  icon_path?: string | null;
}

export interface ScanProgress {
  scanned_count: number;
  current_path: string;
  repos_found: number;
}

export interface ScanSummary {
  found: number;
  added: number;
  updated: number;
  missing: number;
  skipped: number;
  errors: string[];
  repos?: DiscoveredRepo[];
}

export interface LaunchResult {
  success: boolean;
  error?: string | null;
}

export interface IconResolutionResult {
  /** Narrowed to what the Rust command actually returns, so the result can be
      written straight back onto a project without a cast. */
  icon_source: 'custom' | 'local_favicon' | 'remote_favicon' | 'initials';
  icon_path?: string | null;
}

export interface WebsiteDetection {
  url: string;
  /** Which file the URL came from, so the guess is auditable. */
  source: string;
}

// ---------------------------------------------------------------------------
// Project analysis (mirrors src-tauri/src/models.rs)
// ---------------------------------------------------------------------------

export interface RepoSummary {
  total_files: number;
  total_dirs: number;
  total_bytes: number;
  total_lines: number;
  code_lines: number;
  comment_lines: number;
  blank_lines: number;
  binary_files: number;
  max_depth: number;
  todo_count: number;
  truncated: boolean;
}

export interface LanguageStat {
  language: string;
  files: number;
  bytes: number;
  lines: number;
  share: number;
}

export interface MapNode {
  name: string;
  path: string;
  kind: 'dir' | 'overflow';
  files: number;
  lines: number;
  bytes: number;
  weight: number;
  language: string | null;
  children: MapNode[];
}

export interface WeekBucket {
  week_start: string;
  commits: number;
}

export interface AuthorStat {
  name: string;
  email: string;
  commits: number;
  insertions: number;
  deletions: number;
  share: number;
  first_commit_at: string;
  last_commit_at: string;
}

export interface CommitSummary {
  hash: string;
  author: string;
  date: string;
  subject: string;
  insertions: number;
  deletions: number;
}

export interface GitStats {
  branch: string | null;
  is_dirty: boolean;
  dirty_files: number;
  total_commits: number;
  commits_truncated: boolean;
  first_commit_at: string | null;
  last_commit_at: string | null;
  age_days: number;
  days_since_last_commit: number;
  active_days: number;
  commits_last_30d: number;
  commits_last_90d: number;
  momentum: number;
  avg_commit_size: number;
  weekly_activity: WeekBucket[];
  punchcard: number[][];
  authors: AuthorStat[];
  bus_factor: number;
  branches: number;
  tags: number;
  recent_commits: CommitSummary[];
}

export interface Hotspot {
  path: string;
  language: string;
  lines: number;
  commits: number;
  authors: number;
  churn: number;
  risk: number;
}

export interface FileSummary {
  path: string;
  language: string;
  lines: number;
  bytes: number;
}

export interface StackItem {
  name: string;
  category: string;
  evidence: string;
  version: string | null;
}

export type HealthStatus = 'good' | 'warning' | 'critical' | 'info';

export interface HealthCheck {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
  weight: number;
  earned: number;
}

export interface HealthReport {
  score: number;
  grade: string;
  checks: HealthCheck[];
}

export interface ProjectAnalysis {
  path: string;
  generated_at: string;
  duration_ms: number;
  summary: RepoSummary;
  languages: LanguageStat[];
  map: MapNode;
  git: GitStats | null;
  stack: StackItem[];
  health: HealthReport;
  hotspots: Hotspot[];
  largest_files: FileSummary[];
  notes: string[];
}

export interface DownloadAsset {
  platform: 'windows' | 'macos' | 'linux';
  architecture: 'x64' | 'arm64';
  /** Optional: nothing has ever populated it, and consumers match on the
      file name suffix instead, which also distinguishes .exe from .msi. */
  fileType?: 'installer' | 'msi' | 'dmg' | 'appimage' | 'deb';
  fileName: string;
  fileSize?: number;
  downloadUrl: string;
  isRecommended?: boolean;
}

export interface DownloadManifest {
  version: string;
  publishedAt: string;
  releasePageUrl: string;
  releaseNotes: string;
  assets: DownloadAsset[];
}
