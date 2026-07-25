use std::path::PathBuf;

use crate::services::analysis::analyze_repository;
use crate::services::analysis::languages::{classify, count_lines, Classification, CommentStyle};

fn repo_root() -> PathBuf {
    // CARGO_MANIFEST_DIR is apps/desktop/src-tauri; the git root is three up.
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(3)
        .expect("repository root")
        .to_path_buf()
}

#[test]
fn classifies_by_extension_and_filename() {
    assert!(matches!(
        classify("useAppStore.ts"),
        Classification::Text(spec) if spec.name == "TypeScript" && spec.is_code
    ));
    assert!(matches!(
        classify("Dockerfile"),
        Classification::Text(spec) if spec.name == "Dockerfile"
    ));
    assert!(matches!(
        classify("favicon.ico"),
        Classification::Binary(bucket) if bucket == "Images"
    ));
    assert!(matches!(
        classify(".gitignore"),
        Classification::Text(spec) if spec.name == "Config"
    ));
}

#[test]
fn splits_code_comments_and_blanks() {
    let source = "// header\nfn main() {\n\n    /* block\n       continues */\n    let x = 1;\n}\n";
    let (code, comments, blanks) = count_lines(source, CommentStyle::CFamily);

    assert_eq!(blanks, 1);
    assert_eq!(comments, 3, "line comment plus both block lines");
    assert_eq!(code, 3, "fn, let and closing brace");
}

#[test]
fn analyzes_this_repository() {
    let root = repo_root();
    let analysis = analyze_repository(&root).expect("analysis should succeed");

    assert!(analysis.summary.total_files > 0, "found no files");
    assert!(analysis.summary.code_lines > 0, "counted no code");
    assert!(!analysis.languages.is_empty(), "no languages detected");
    assert!(!analysis.map.children.is_empty(), "project map is empty");
    assert!(
        analysis.health.score <= 100,
        "score must stay within 0..=100"
    );

    // node_modules and target are excluded, so nothing should reference them.
    assert!(
        !analysis
            .largest_files
            .iter()
            .any(|f| f.path.contains("node_modules") || f.path.contains("target/")),
        "scan leaked into ignored directories"
    );

    // Every map node's weight must equal the sum of its children's, or exceed it
    // when the deepest level is collapsed.
    for child in &analysis.map.children {
        let child_sum: f64 = child.children.iter().map(|c| c.weight).sum();
        assert!(
            child.weight + 0.001 >= child_sum,
            "node {} weighs less than its children",
            child.name
        );
    }
}

#[test]
fn detects_the_expected_stack_for_this_repository() {
    let analysis = analyze_repository(&repo_root()).expect("analysis should succeed");
    let names: Vec<&str> = analysis.stack.iter().map(|s| s.name.as_str()).collect();

    assert!(names.contains(&"Rust"), "Cargo.toml should imply Rust");
    assert!(
        names.contains(&"TypeScript"),
        "tsconfig should imply TypeScript"
    );
    assert!(
        names.contains(&"Tauri"),
        "tauri.conf.json should imply Tauri"
    );
}
