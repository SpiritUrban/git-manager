use crate::models::LaunchResult;
use crate::services::launcher::{launch_editor, launch_terminal, open_folder};

#[tauri::command]
pub fn launch_code_editor(
    profile: String,
    custom_exec: String,
    custom_args: Vec<String>,
    path: String,
) -> LaunchResult {
    match launch_editor(&profile, &custom_exec, &custom_args, &path) {
        Ok(_) => LaunchResult {
            success: true,
            error: None,
        },
        Err(e) => LaunchResult {
            success: false,
            error: Some(e),
        },
    }
}

#[tauri::command]
pub fn launch_terminal_app(
    profile: String,
    custom_exec: String,
    custom_args: Vec<String>,
    path: String,
) -> LaunchResult {
    match launch_terminal(&profile, &custom_exec, &custom_args, &path) {
        Ok(_) => LaunchResult {
            success: true,
            error: None,
        },
        Err(e) => LaunchResult {
            success: false,
            error: Some(e),
        },
    }
}

#[tauri::command]
pub fn launch_open_folder(path: String) -> LaunchResult {
    match open_folder(&path) {
        Ok(_) => LaunchResult {
            success: true,
            error: None,
        },
        Err(e) => LaunchResult {
            success: false,
            error: Some(e),
        },
    }
}
