use std::path::PathBuf;

use crate::models::ProjectAnalysis;
use crate::services::analysis::analyze_repository;

/// Analyzes a repository directory. The work is filesystem- and process-bound,
/// so it runs on the blocking pool to keep the webview responsive.
#[tauri::command]
pub async fn analyze_project(path: String) -> Result<ProjectAnalysis, String> {
    tauri::async_runtime::spawn_blocking(move || analyze_repository(&PathBuf::from(path)))
        .await
        .map_err(|e| format!("Analysis task failed: {}", e))?
}
