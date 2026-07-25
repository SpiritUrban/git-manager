use std::fs;
use tauri::AppHandle;
use tauri::Manager;

#[tauri::command]
pub fn clear_icon_cache(app: AppHandle) -> Result<bool, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("App cache dir resolution failed: {}", e))?
        .join("favicons");

    if cache_dir.exists() {
        fs::remove_dir_all(&cache_dir).map_err(|e| format!("Failed to clear icon cache: {}", e))?;
        fs::create_dir_all(&cache_dir)
            .map_err(|e| format!("Failed to recreate icon cache dir: {}", e))?;
    }

    Ok(true)
}

#[tauri::command]
pub fn get_app_data_dir_path(app: AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("App data dir resolution failed: {}", e))?;
    Ok(dir.to_string_lossy().to_string())
}
