use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use walkdir::WalkDir;
use tauri::{AppHandle, Emitter};

use crate::models::{DiscoveredRepo, ScanProgressEvent};
use crate::services::git::{extract_git_remote_origin, is_git_repository, normalize_path, normalize_remote_url, read_package_json};

pub static SCAN_CANCELLED: AtomicBool = AtomicBool::new(false);

const IGNORED_DIRS: &[&str] = &[
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

    let walker = WalkDir::new(root_path)
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

    for entry in walker.filter_map(|e| e.ok()) {
        if cancel_signal.load(Ordering::SeqCst) {
            break;
        }

        let path = entry.path();
        if path.is_dir() {
            scanned_count += 1;

            if scanned_count % 25 == 0 {
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

            if is_git_repository(path) {
                let display_path = path.to_string_lossy().to_string();
                let norm_path = normalize_path(path);
                
                let dir_name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "Unknown".to_string());

                let pkg_info = read_package_json(path);
                let final_name = pkg_info
                    .display_name
                    .unwrap_or(dir_name);

                let remote_origin = extract_git_remote_origin(path);
                let repository_url = remote_origin
                    .as_deref()
                    .and_then(normalize_remote_url);

                repos.push(DiscoveredRepo {
                    path: display_path,
                    normalized_path: norm_path,
                    name: final_name,
                    remote_origin,
                    repository_url,
                    website_url: pkg_info.homepage,
                    icon_path: None,
                });
            }
        }
    }

    repos
}
