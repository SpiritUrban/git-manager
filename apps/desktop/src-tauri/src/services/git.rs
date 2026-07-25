use serde_json::Value;
use std::fs;
use std::path::Path;

pub fn normalize_path(path: &Path) -> String {
    let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    let mut s = canonical.to_string_lossy().to_string();
    if s.starts_with(r"\\?\") {
        s = s[4..].to_string();
    }
    // Normalize slashes for consistency across platforms
    s.replace('\\', "/").to_lowercase()
}

pub fn is_git_repository(dir: &Path) -> bool {
    let git_path = dir.join(".git");
    git_path.exists()
}

pub fn extract_git_remote_origin(dir: &Path) -> Option<String> {
    let git_config = dir.join(".git").join("config");
    if git_config.is_file() {
        if let Ok(content) = fs::read_to_string(&git_config) {
            let mut in_remote_origin = false;
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("[remote \"origin\"]") {
                    in_remote_origin = true;
                    continue;
                }
                if trimmed.starts_with('[') {
                    in_remote_origin = false;
                    continue;
                }
                if in_remote_origin && trimmed.starts_with("url =") {
                    let parts: Vec<&str> = trimmed.splitn(2, '=').collect();
                    if parts.len() == 2 {
                        return Some(parts[1].trim().to_string());
                    }
                }
            }
        }
    }
    None
}

pub fn normalize_remote_url(remote: &str) -> Option<String> {
    let trimmed = remote.trim();
    if trimmed.is_empty() {
        return None;
    }

    // git@github.com:owner/repo.git -> https://github.com/owner/repo
    if trimmed.starts_with("git@") {
        if let Some(colon_pos) = trimmed.find(':') {
            let host = &trimmed[4..colon_pos];
            let mut path = &trimmed[colon_pos + 1..];
            if path.ends_with(".git") {
                path = &path[..path.len() - 4];
            }
            return Some(format!("https://{}/{}", host, path));
        }
    }

    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        let mut clean = trimmed.to_string();
        if clean.ends_with(".git") {
            clean.truncate(clean.len() - 4);
        }
        return Some(clean);
    }

    None
}

pub struct PackageJsonInfo {
    pub display_name: Option<String>,
    pub homepage: Option<String>,
}

pub fn read_package_json(dir: &Path) -> PackageJsonInfo {
    let pkg_path = dir.join("package.json");
    let mut info = PackageJsonInfo {
        display_name: None,
        homepage: None,
    };

    if pkg_path.is_file() {
        if let Ok(content) = fs::read_to_string(&pkg_path) {
            if let Ok(json) = serde_json::from_str::<Value>(&content) {
                if let Some(dn) = json.get("displayName").and_then(|v| v.as_str()) {
                    info.display_name = Some(dn.to_string());
                } else if let Some(n) = json.get("name").and_then(|v| v.as_str()) {
                    info.display_name = Some(n.to_string());
                }

                if let Some(hp) = json.get("homepage").and_then(|v| v.as_str()) {
                    if hp.starts_with("http://") || hp.starts_with("https://") {
                        info.homepage = Some(hp.to_string());
                    }
                }
            }
        }
    }

    info
}
