use std::path::PathBuf;

use crate::models::WebsiteDetection;
use crate::services::website::find_website_url;

/// Looks for the project's public website across the conventional places it is
/// declared. Reads several small files, so it runs on the blocking pool.
#[tauri::command]
pub async fn resolve_project_website(
    path: String,
    repository_url: Option<String>,
) -> Result<Option<WebsiteDetection>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        find_website_url(&PathBuf::from(path), repository_url.as_deref())
    })
    .await
    .map_err(|e| format!("Website detection failed: {}", e))
}
