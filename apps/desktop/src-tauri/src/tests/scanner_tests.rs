use crate::services::git::is_git_repository;
use crate::services::scanner::scan_directory_for_repos;
use std::fs;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

#[test]
fn test_is_git_repository_and_scanner() {
    let tmp_dir = std::env::temp_dir().join("git_manager_test_scanner");
    let _ = fs::remove_dir_all(&tmp_dir);
    
    let repo_dir = tmp_dir.join("test_repo");
    let git_dir = repo_dir.join(".git");
    fs::create_dir_all(&git_dir).unwrap();

    let node_modules_dir = repo_dir.join("node_modules").join("nested_fake_repo").join(".git");
    fs::create_dir_all(&node_modules_dir).unwrap();

    assert!(is_git_repository(&repo_dir));

    let cancel_signal = Arc::new(AtomicBool::new(false));
    let repos = scan_directory_for_repos(&tmp_dir, None, cancel_signal);

    assert_eq!(repos.len(), 1);
    assert_eq!(repos[0].name, "test_repo");

    let _ = fs::remove_dir_all(&tmp_dir);
}
