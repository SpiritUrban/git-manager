use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use walkdir::WalkDir;
use tauri::{AppHandle, Emitter};

use crate::models::{DiscoveredRepo, ScanProgressEvent};
use crate::services::git::{extract_git_remote_origin, is_git_repository, normalize_path, normalize_remote_url, read_package_json};
use crate::services::icons::find_local_icon;
use crate::services::website::find_website_url;

pub static SCAN_CANCELLED: AtomicBool = AtomicBool::new(false);

const IGNORED_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".output",
    "coverage",
    "vendor",
    "venv",
    ".venv",
    "__pycache__",
    "AppData",
    "Library",
    ".gradle",
    ".idea",
];

pub fn scan_directory_for_repos(
    root_path: &Path,
    app: Option<&AppHandle>,
    cancel_signal: Arc<AtomicBool>,
) -> Vec<DiscoveredRepo> {
    cancel_signal.store(false, Ordering::SeqCst);
    let mut repos = Vec::new();
    let mut scanned_count = 0;

    // 1. Check if the selected root folder itself is a Git repository
    if is_git_repository(root_path) {
        let display_path = root_path.to_string_lossy().to_string();
        let norm_path = normalize_path(root_path);
        let dir_name = root_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Unknown".to_string());
        let pkg_info = read_package_json(root_path);
        let final_name = pkg_info.display_name.unwrap_or(dir_name);
        let remote_origin = extract_git_remote_origin(root_path);
        let repository_url = remote_origin.as_deref().and_then(normalize_remote_url);
        let local_icon = find_local_icon(root_path);
        let website_url =
            find_website_url(root_path, repository_url.as_deref()).map(|found| found.url);

        repos.push(DiscoveredRepo {
            path: display_path,
            normalized_path: norm_path,
            name: final_name,
            remote_origin,
            repository_url,
            website_url,
            icon_path: local_icon,
        });

        return repos;
    }

    // 2. Otherwise scan subdirectories and skip descending into discovered repos
    let mut it = WalkDir::new(root_path)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            if let Some(file_name) = entry.file_name().to_str() {
                if entry.file_type().is_dir() && IGNORED_DIRS.contains(&file_name) {
                    return false;
                }
            }
            true
        });

    while let Some(entry) = it.next() {
        if cancel_signal.load(Ordering::SeqCst) {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();
        if path.is_dir() {
            scanned_count += 1;

            if scanned_count % 5 == 0 {
                if let Some(app_handle) = app {
                    let _ = app_handle.emit(
                        "scan-progress",
                        ScanProgressEvent {
                            scanned_count,
                            current_path: path.to_string_lossy().to_string(),
                            repos_found: repos.len(),
                        },
                    );
                }
            }

            if entry.depth() > 0 && is_git_repository(path) {
                let display_path = path.to_string_lossy().to_string();
                let norm_path = normalize_path(path);
                let dir_name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "Unknown".to_string());

                let pkg_info = read_package_json(path);
                let final_name = pkg_info.display_name.unwrap_or(dir_name);
                let remote_origin = extract_git_remote_origin(path);
                let repository_url = remote_origin.as_deref().and_then(normalize_remote_url);
                let local_icon = find_local_icon(path);
                let website_url =
                    find_website_url(path, repository_url.as_deref()).map(|found| found.url);

                repos.push(DiscoveredRepo {
                    path: display_path,
                    normalized_path: norm_path,
                    name: final_name,
                    remote_origin,
                    repository_url,
                    website_url,
                    icon_path: local_icon,
                });

                // Skip walking inside discovered git repository directory
                it.skip_current_dir();
            }
        }
    }

    repos
}
