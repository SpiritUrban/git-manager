use std::path::Path;
use tauri::AppHandle;

use crate::models::IconResolutionResult;
use crate::services::git::read_package_json;
use crate::services::icons::{cache_local_icon, fetch_remote_favicon, find_local_icon};

#[tauri::command]
pub async fn resolve_project_icon(
    path: String,
    website_url: Option<String>,
    project_id: String,
    app: AppHandle,
) -> Result<IconResolutionResult, String> {
    let repo_dir = Path::new(&path);

    // 1. Check for a local icon file in the project directory
    if let Some(local_icon_path) = find_local_icon(repo_dir) {
        // Copy it to the app cache so WebView can load it via asset:// protocol
        if let Ok(cached_path) = cache_local_icon(&local_icon_path, &app, &project_id) {
            return Ok(IconResolutionResult {
                icon_source: "local_favicon".to_string(),
                icon_path: Some(cached_path),
            });
        }
    }

    // 2. Try fetching remote favicon from website_url
    if let Some(url) = website_url {
        if let Ok(cached_path) = fetch_remote_favicon(&url, &app, &project_id).await {
            return Ok(IconResolutionResult {
                icon_source: "remote_favicon".to_string(),
                icon_path: Some(cached_path),
            });
        }
    }

    Ok(IconResolutionResult {
        icon_source: "initials".to_string(),
        icon_path: None,
    })
}

/// Refreshing used to fail outright when a site served no favicon, discarding a
/// perfectly good local icon and surfacing a bare HTTP status. The remote icon
/// is still preferred, since asking for a refresh means asking for the latest
/// one, but a local file is a better answer than an error.
#[tauri::command]
pub async fn refresh_remote_favicon(
    path: String,
    website_url: Option<String>,
    project_id: String,
    app: AppHandle,
) -> Result<IconResolutionResult, String> {
    let mut remote_error = None;

    if let Some(url) = website_url.as_deref().filter(|u| !u.trim().is_empty()) {
        match fetch_remote_favicon(url, &app, &project_id).await {
            Ok(cached_path) => {
                return Ok(IconResolutionResult {
                    icon_source: "remote_favicon".to_string(),
                    icon_path: Some(cached_path),
                })
            }
            Err(err) => remote_error = Some(format!("{} ({})", err, url)),
        }
    }

    if let Some(local_icon_path) = find_local_icon(Path::new(&path)) {
        if let Ok(cached_path) = cache_local_icon(&local_icon_path, &app, &project_id) {
            return Ok(IconResolutionResult {
                icon_source: "local_favicon".to_string(),
                icon_path: Some(cached_path),
            });
        }
    }

    Err(match remote_error {
        Some(err) => format!("No icon found. Website returned {}", err),
        None => "No website configured and no icon file found in the project".to_string(),
    })
}

/// Recomputes the name the scanner would give this folder today, so a project
/// whose package.json has since been corrected can adopt it without being
/// removed and rediscovered.
#[tauri::command]
pub fn detect_project_name(path: String) -> String {
    let dir = Path::new(&path);
    let folder_name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    read_package_json(dir).display_name.unwrap_or(folder_name)
}
