use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::time::Duration;
use reqwest::header::CONTENT_TYPE;
use tauri::AppHandle;
use tauri::Manager;

pub fn find_local_icon(repo_dir: &Path) -> Option<String> {
    let candidates = [
        "favicon.ico",
        "favicon.png",
        "favicon.svg",
        "public/favicon.ico",
        "public/favicon.png",
        "public/favicon.svg",
        "public/icon.png",
        "public/logo.png",
        "public/apple-touch-icon.png",
        "src/favicon.ico",
        "src/favicon.png",
        "src/favicon.svg",
        "src/app/favicon.ico",
        "src/app/favicon.png",
        "src/app/icon.png",
        "app/favicon.ico",
        "app/icon.png",
        "assets/favicon.ico",
        "assets/favicon.png",
        "assets/icon.png",
        "assets/logo.png",
        "static/favicon.ico",
        "static/favicon.png",
        "static/icon.png",
        "src-tauri/icons/icon.png",
        "src-tauri/icons/32x32.png",
        "src-tauri/icons/128x128.png",
    ];

    for rel_path in candidates {
        let full = repo_dir.join(rel_path);
        if full.is_file() {
            return Some(full.to_string_lossy().to_string());
        }
    }

    None
}

/// Copy a local icon file into the app cache directory so WebView can access it via asset:// protocol.
pub fn cache_local_icon(
    source_path: &str,
    app: &AppHandle,
    project_id: &str,
) -> Result<String, String> {
    let src = Path::new(source_path);
    if !src.is_file() {
        return Err(format!("Source icon file does not exist: {}", source_path));
    }

    let ext = src.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("ico");

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("App cache dir resolution failed: {}", e))?
        .join("favicons");

    fs::create_dir_all(&cache_dir).map_err(|e| format!("Failed to create cache dir: {}", e))?;

    let target_file = cache_dir.join(format!("{}.{}", project_id, ext));
    fs::copy(src, &target_file).map_err(|e| format!("Failed to copy icon to cache: {}", e))?;

    Ok(target_file.to_string_lossy().to_string())
}

pub async fn fetch_remote_favicon(
    website_url: &str,
    app: &AppHandle,
    project_id: &str,
) -> Result<String, String> {
    if !website_url.starts_with("http://") && !website_url.starts_with("https://") {
        return Err("Invalid HTTP/HTTPS URL protocol.".to_string());
    }

    let parsed = url::Url::parse(website_url).map_err(|e| format!("Invalid URL: {}", e))?;
    let domain = parsed.host_str().unwrap_or("domain");
    let favicon_url = format!("https://www.google.com/s2/favicons?domain={}&sz=128", domain);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let response = client
        .get(&favicon_url)
        .send()
        .await
        .map_err(|e| format!("Favicon fetch failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned HTTP {}", response.status()));
    }

    if let Some(ct) = response.headers().get(CONTENT_TYPE) {
        let ct_str = ct.to_str().unwrap_or("");
        if !ct_str.contains("image") && !ct_str.contains("octet-stream") && !ct_str.contains("icon") {
            return Err(format!("Invalid content-type: {}", ct_str));
        }
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read favicon bytes: {}", e))?;

    if bytes.len() > 2 * 1024 * 1024 {
        return Err("Favicon exceeds max limit of 2MB.".to_string());
    }

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("App cache dir resolution failed: {}", e))?
        .join("favicons");

    fs::create_dir_all(&cache_dir).map_err(|e| format!("Failed to create cache dir: {}", e))?;

    let target_file = cache_dir.join(format!("{}.png", project_id));
    let mut file = File::create(&target_file).map_err(|e| format!("Failed to save cache file: {}", e))?;
    file.write_all(&bytes).map_err(|e| format!("Failed to write cache file: {}", e))?;

    Ok(target_file.to_string_lossy().to_string())
}
