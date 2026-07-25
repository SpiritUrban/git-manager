use std::fs;
use std::path::{Path, PathBuf};

/// Conventional locations of the actual application inside a repository.
/// Monorepos keep the interesting files one or two levels down, so scanning
/// only the root reports nothing for exactly the projects that need it most.
const NESTED_APP_DIRS: &[&str] = &[
    "apps/web",
    "apps/desktop",
    "apps/client",
    "apps/site",
    "packages/web",
    "client",
    "frontend",
    "web",
    "www",
    "site",
    "ui",
    "src-tauri",
    "backend",
    "server",
    "api",
];

/// Parent directories whose children are workspace members.
const WORKSPACE_GROUPS: &[&str] = &["apps", "packages", "services"];

/// Caps how many workspace members are inspected, so a repository with hundreds
/// of packages cannot turn a lookup into a directory crawl.
const MAX_WORKSPACE_MEMBERS: usize = 12;

/// Directories worth inspecting for project metadata, repo root first.
///
/// Each entry pairs a display prefix (`""` for the root, `"apps/web/"` for a
/// nested app) with the absolute directory. `accept` decides whether a candidate
/// directory is relevant — typically "does it hold a manifest".
pub fn app_roots<F>(root: &Path, accept: F) -> Vec<(String, PathBuf)>
where
    F: Fn(&Path) -> bool,
{
    let mut roots: Vec<(String, PathBuf)> = vec![(String::new(), root.to_path_buf())];

    for name in NESTED_APP_DIRS {
        let dir = root.join(name);
        if dir.is_dir() && accept(&dir) {
            roots.push((format!("{}/", name), dir));
        }
    }

    for group in WORKSPACE_GROUPS {
        let Ok(entries) = fs::read_dir(root.join(group)) else {
            continue;
        };
        let mut dirs: Vec<PathBuf> = entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.is_dir())
            .collect();
        dirs.sort();

        for dir in dirs.into_iter().take(MAX_WORKSPACE_MEMBERS) {
            let Some(name) = dir.file_name().and_then(|n| n.to_str()) else {
                continue;
            };
            let prefix = format!("{}/{}/", group, name);

            // One level deeper covers apps/<name>/src-tauri.
            let nested = dir.join("src-tauri");
            if nested.is_dir() && accept(&nested) {
                roots.push((format!("{}src-tauri/", prefix), nested));
            }

            if accept(&dir) && !roots.iter().any(|(p, _)| *p == prefix) {
                roots.push((prefix, dir));
            }
        }
    }

    roots
}

/// True when the directory declares dependencies — the usual proof that it is an
/// application or package rather than an incidental folder.
pub fn has_manifest(dir: &Path) -> bool {
    [
        "package.json",
        "Cargo.toml",
        "go.mod",
        "pyproject.toml",
        "composer.json",
    ]
    .iter()
    .any(|manifest| dir.join(manifest).is_file())
}
