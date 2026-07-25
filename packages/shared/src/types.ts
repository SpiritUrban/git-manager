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
  icon_source: string;
  icon_path?: string | null;
}

export interface DownloadAsset {
  platform: 'windows' | 'macos' | 'linux';
  architecture: 'x64' | 'arm64';
  fileType: 'installer' | 'msi' | 'dmg' | 'appimage' | 'deb';
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
