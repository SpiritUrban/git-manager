pub mod commands;
pub mod models;
pub mod services;
#[cfg(test)]
pub mod tests;

use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri_plugin_sql::{Migration, MigrationKind};
use commands::scanner::ScanState;

pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_schema",
            sql: "
            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                position INTEGER NOT NULL,
                is_collapsed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                normalized_path TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                group_id TEXT,
                manual_position INTEGER NOT NULL DEFAULT 0,
                website_url TEXT,
                repository_url TEXT,
                remote_origin TEXT,
                icon_source TEXT,
                icon_cache_path TEXT,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                is_archived INTEGER NOT NULL DEFAULT 0,
                is_missing INTEGER NOT NULL DEFAULT 0,
                last_opened_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS project_tags (
                project_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY (project_id, tag_id),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS scan_roots (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                normalized_path TEXT NOT NULL UNIQUE,
                is_enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            ",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .manage(ScanState(Arc::new(AtomicBool::new(false))))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:git_manager.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            commands::scanner::scan_root_folder,
            commands::scanner::cancel_scan,
            commands::scanner::normalize_local_path,
            commands::scanner::check_path_exists,
            commands::launcher::launch_code_editor,
            commands::launcher::launch_terminal_app,
            commands::launcher::launch_dev_server,
            commands::launcher::launch_open_folder,
            commands::favicons::resolve_project_icon,
            commands::favicons::refresh_remote_favicon,
            commands::system::clear_icon_cache,
            commands::system::get_app_data_dir_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri desktop application");
}
