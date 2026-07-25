pub mod files;
pub mod health;
pub mod history;
pub mod languages;
pub mod stack;

use std::collections::HashMap;
use std::path::Path;
use std::time::Instant;

use chrono::Utc;

use crate::models::{Hotspot, ProjectAnalysis};
use files::FileRecord;
use history::FileChurn;

/// How many directory levels the project map renders.
const MAP_DEPTH: usize = 3;
const HOTSPOT_LIMIT: usize = 12;
const LARGEST_FILE_LIMIT: usize = 10;
/// Files past this length are what the "file size discipline" check counts.
const OVERSIZED_LINE_THRESHOLD: usize = 1000;

/// Runs the full analysis pipeline over a repository directory.
///
/// Each stage degrades independently: a repo with no git history still gets a
/// file map and a stack read, and a repo git cannot be read from still gets
/// everything else. Nothing here mutates the working directory.
pub fn analyze_repository(root: &Path) -> Result<ProjectAnalysis, String> {
    if !root.is_dir() {
        return Err(format!("Directory does not exist: {}", root.display()));
    }

    let started = Instant::now();
    let mut notes: Vec<String> = Vec::new();

    let scan = files::scan_tree(root);
    if scan.summary.truncated {
        notes.push(
            "Repository exceeds the 40 000 file scan limit — metrics cover the scanned subset."
                .to_string(),
        );
    }

    let languages = files::language_breakdown(&scan.records);
    let map = files::build_map(&scan.records, MAP_DEPTH);
    let largest_files = files::largest_files(&scan.records, LARGEST_FILE_LIMIT);

    let file_paths: Vec<String> = scan.records.iter().map(|r| r.rel_path.clone()).collect();
    let detection = stack::detect(root, &file_paths);
    let test_files = stack::count_test_files(&file_paths);

    let history = history::analyze_history(root);
    if history.is_none() {
        notes.push(
            "No readable git history — commit, author and hotspot metrics are unavailable."
                .to_string(),
        );
    }
    if let Some(outcome) = &history {
        if outcome.stats.commits_truncated {
            notes.push("History is capped at the 10 000 most recent commits.".to_string());
        }
    }

    let hotspots = match &history {
        Some(outcome) => compute_hotspots(&scan.records, &outcome.churn),
        None => Vec::new(),
    };

    let oversized_files = scan
        .records
        .iter()
        .filter(|r| r.lines > OVERSIZED_LINE_THRESHOLD)
        .count();

    let health = health::score(health::HealthInput {
        summary: &scan.summary,
        stack: &detection,
        git: history.as_ref().map(|h| &h.stats),
        test_files,
        oversized_files,
    });

    Ok(ProjectAnalysis {
        path: root.to_string_lossy().to_string(),
        generated_at: Utc::now().to_rfc3339(),
        duration_ms: started.elapsed().as_millis() as u64,
        summary: scan.summary,
        languages,
        map,
        git: history.map(|h| h.stats),
        stack: detection.items,
        health,
        hotspots,
        largest_files,
        notes,
    })
}

/// Hotspots rank files by churn x size: something both large and constantly
/// edited is where defects and merge pain concentrate. Both factors are
/// normalised against the repository's own maximum, so the score is relative to
/// the project rather than to an absolute line count that means nothing across
/// languages.
fn compute_hotspots(records: &[FileRecord], churn: &HashMap<String, FileChurn>) -> Vec<Hotspot> {
    let by_path: HashMap<&str, &FileRecord> =
        records.iter().map(|r| (r.rel_path.as_str(), r)).collect();

    let max_commits = churn.values().map(|c| c.commits).max().unwrap_or(1).max(1) as f64;
    let max_lines = records
        .iter()
        .filter(|r| r.is_code)
        .map(|r| r.lines)
        .max()
        .unwrap_or(1)
        .max(1) as f64;

    let mut hotspots: Vec<Hotspot> = churn
        .iter()
        .filter_map(|(path, stat)| {
            // Files deleted since, or excluded from the scan, have no size to
            // weigh the churn against — they are history, not present risk.
            let record = by_path.get(path.as_str())?;
            if !record.is_code || record.lines == 0 {
                return None;
            }

            let churn_factor = stat.commits as f64 / max_commits;
            let size_factor = record.lines as f64 / max_lines;

            Some(Hotspot {
                path: path.clone(),
                language: record.language.clone(),
                lines: record.lines,
                commits: stat.commits,
                authors: stat.authors.len(),
                churn: stat.churn,
                risk: (churn_factor * size_factor).sqrt(),
            })
        })
        .collect();

    hotspots.sort_by(|a, b| {
        b.risk
            .partial_cmp(&a.risk)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    hotspots.truncate(HOTSPOT_LIMIT);
    hotspots
}
