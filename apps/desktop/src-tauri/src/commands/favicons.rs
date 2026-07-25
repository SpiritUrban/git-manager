use std::path::Path;
use tauri::AppHandle;

use crate::models::IconResolutionResult;
use crate::services::icons::{fetch_remote_favicon, find_local_icon};

#[tauri::command]
pub async fn resolve_project_icon(
    path: String,
    website_url: Option<String>,
    project_id: String,
    app: AppHandle,
) -> Result<IconResolutionResult, String> {
    let repo_dir = Path::new(&path);
    if let Some(local_icon) = find_local_icon(repo_dir) {
        return Ok(IconResolutionResult {
            icon_source: "local_favicon".to_string(),
            icon_path: Some(local_icon),
        });
    }

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

#[tauri::command]
pub async fn refresh_remote_favicon(
    website_url: String,
    project_id: String,
    app: AppHandle,
) -> Result<String, String> {
    fetch_remote_favicon(&website_url, &app, &project_id).await
}
