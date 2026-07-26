use crate::services::git::{is_generic_package_name, normalize_path, normalize_remote_url};
use std::path::Path;

#[test]
fn test_normalize_remote_url() {
    assert_eq!(
        normalize_remote_url("git@github.com:SpiritUrban/git-manager.git"),
        Some("https://github.com/SpiritUrban/git-manager".to_string())
    );
    assert_eq!(
        normalize_remote_url("https://github.com/SpiritUrban/git-manager.git"),
        Some("https://github.com/SpiritUrban/git-manager".to_string())
    );
    assert_eq!(normalize_remote_url(""), None);
}

#[test]
fn test_normalize_path() {
    let p = Path::new("C:\\Users\\Test\\Folder");
    let norm = normalize_path(p);
    assert!(norm.contains("c:/users/test/folder") || norm.contains("users/test/folder"));
}

#[test]
fn test_generic_package_names_are_rejected() {
    // Every one of these was found in a real project folder, where the
    // scaffold name hid the directory name in the UI.
    for name in [
        "tauri-app",
        "nextjs",
        "nuxt-app",
        "app",
        "my-project",
        "temp-react-app",
        "front",
        "node-bootstrap3-template",
        "@git-manager/monorepo",
        "  App  ",
    ] {
        assert!(
            is_generic_package_name(name),
            "expected {name:?} to be treated as a scaffold default"
        );
    }
}

#[test]
fn test_real_package_names_are_kept() {
    for name in [
        "trashradar",
        "portfolio-2023",
        "digital-workshop",
        "sigil-editor",
        "web-radar-desktop",
        "@scope/git-manager",
    ] {
        assert!(
            !is_generic_package_name(name),
            "expected {name:?} to be kept as a display name"
        );
    }
}
