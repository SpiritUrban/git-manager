import type { DownloadAsset, DownloadManifest } from './types.js';

export interface ReleaseAssetClassification {
  platform: DownloadAsset['platform'];
  architecture: DownloadAsset['architecture'];
}

/** Shape of the fields this module reads from the GitHub releases API. */
export interface GitHubRelease {
  tag_name?: string;
  published_at?: string;
  html_url?: string;
  body?: string;
  assets?: { name: string; size?: number; browser_download_url: string }[];
}

export declare function isDistributableAsset(name: string): boolean;
export declare function classifyReleaseAsset(name: string): ReleaseAssetClassification;
export declare function buildDownloadManifest(release: GitHubRelease): DownloadManifest;
