use crate::services::git::{normalize_path, normalize_remote_url};
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
