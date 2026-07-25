use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, State};

use crate::models::ScanSummaryResult;
use crate::services::git::normalize_path;
use crate::services::scanner::{scan_directory_for_repos, SCAN_CANCELLED};

pub struct ScanState(pub Arc<AtomicBool>);

#[tauri::command]
pub async fn scan_root_folder(
    path: String,
    app: AppHandle,
    state: State<'_, ScanState>,
) -> Result<ScanSummaryResult, String> {
    let root_buf = PathBuf::from(&path);
    if !root_buf.exists() {
        return Err(format!("Root folder does not exist: {}", path));
    }

    let cancel_signal = state.0.clone();
    let app_handle = app.clone();

    let repos = tokio::task::spawn_blocking(move || {
        scan_directory_for_repos(&root_buf, Some(&app_handle), cancel_signal)
    })
    .await
    .map_err(|e| format!("Scan task panicked: {}", e))?;

    let count = repos.len();

    Ok(ScanSummaryResult {
        found: count,
        added: count,
        updated: 0,
        missing: 0,
        skipped: 0,
        errors: Vec::new(),
        repos,
    })
}

#[tauri::command]
pub fn cancel_scan(state: State<'_, ScanState>) -> Result<bool, String> {
    state.0.store(true, Ordering::SeqCst);
    SCAN_CANCELLED.store(true, Ordering::SeqCst);
    Ok(true)
}

#[tauri::command]
pub fn normalize_local_path(path: String) -> String {
    normalize_path(Path::new(&path))
}

#[tauri::command]
pub fn check_path_exists(path: String) -> bool {
    Path::new(&path).exists()
}
