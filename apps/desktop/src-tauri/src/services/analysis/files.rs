use std::collections::HashMap;
use std::fs;
use std::path::Path;

use ignore::WalkBuilder;

use super::languages::{classify, count_lines, count_todo_markers, Classification};
use crate::models::{FileSummary, LanguageStat, MapNode, RepoSummary};

/// Directories that are never interesting even when not gitignored — build
/// output, dependency trees and tool caches would otherwise dominate every metric.
const ALWAYS_SKIP: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".turbo",
    ".parcel-cache",
    ".cache",
    "coverage",
    "vendor",
    "__pycache__",
    ".venv",
    "venv",
    ".tox",
    ".mypy_cache",
    ".pytest_cache",
    ".gradle",
    ".idea",
    ".vs",
    "Pods",
    "DerivedData",
    ".terraform",
    ".serverless",
    "bower_components",
];

/// Hard ceilings so a pathological repository cannot hang the UI.
const MAX_FILES: usize = 40_000;
const MAX_READ_BYTES: u64 = 2 * 1024 * 1024;

pub struct FileRecord {
    pub rel_path: String,
    pub bytes: u64,
    pub lines: usize,
    pub code: usize,
    pub language: String,
    pub is_code: bool,
}

pub struct ScanOutcome {
    pub summary: RepoSummary,
    pub records: Vec<FileRecord>,
}

/// Walks the repository, honouring .gitignore, and measures every text file.
pub fn scan_tree(root: &Path) -> ScanOutcome {
    let mut records: Vec<FileRecord> = Vec::new();
    let mut dirs = 0usize;
    let mut total_bytes = 0u64;
    let mut total_lines = 0usize;
    let mut code_lines = 0usize;
    let mut comment_lines = 0usize;
    let mut blank_lines = 0usize;
    let mut binary_files = 0usize;
    let mut max_depth = 0usize;
    let mut todo_count = 0usize;
    let mut truncated = false;

    let walker = WalkBuilder::new(root)
        .hidden(false) // .github/, .gitignore etc. are meaningful signal
        .git_ignore(true)
        .git_global(false)
        .git_exclude(true)
        .parents(false)
        .require_git(false)
        .follow_links(false)
        .filter_entry(|entry| {
            // depth 0 is the repository root itself — never prune it, even if it
            // happens to be named "dist" or "build".
            entry.depth() == 0
                || entry
                    .file_name()
                    .to_str()
                    .map(|name| !ALWAYS_SKIP.contains(&name))
                    .unwrap_or(false)
        })
        .build();

    for entry in walker.flatten() {
        let depth = entry.depth();
        if depth == 0 {
            continue;
        }

        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        if is_dir {
            dirs += 1;
            max_depth = max_depth.max(depth);
            continue;
        }

        if records.len() >= MAX_FILES {
            truncated = true;
            break;
        }

        let path = entry.path();
        let Some(file_name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
        total_bytes += size;
        max_depth = max_depth.max(depth);

        let rel_path = relative_slash_path(root, path);

        match classify(file_name) {
            Classification::Binary(bucket) => {
                binary_files += 1;
                records.push(FileRecord {
                    rel_path,
                    bytes: size,
                    lines: 0,
                    code: 0,
                    language: bucket.to_string(),
                    is_code: false,
                });
            }
            Classification::Text(spec) => {
                let (lines, code, comments, blanks) = if size <= MAX_READ_BYTES {
                    match fs::read_to_string(path) {
                        Ok(content) => {
                            todo_count += count_todo_markers(&content);
                            let (code, comments, blanks) = count_lines(&content, spec.comment);
                            (code + comments + blanks, code, comments, blanks)
                        }
                        // Not valid UTF-8 after all — treat it as an asset.
                        Err(_) => (0, 0, 0, 0),
                    }
                } else {
                    (0, 0, 0, 0)
                };

                total_lines += lines;
                code_lines += code;
                comment_lines += comments;
                blank_lines += blanks;

                records.push(FileRecord {
                    rel_path,
                    bytes: size,
                    lines,
                    code,
                    language: spec.name.to_string(),
                    is_code: spec.is_code,
                });
            }
        }
    }

    let summary = RepoSummary {
        total_files: records.len(),
        total_dirs: dirs,
        total_bytes,
        total_lines,
        code_lines,
        comment_lines,
        blank_lines,
        binary_files,
        max_depth,
        todo_count,
        truncated,
    };

    ScanOutcome { summary, records }
}

fn relative_slash_path(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

/// Language breakdown ranked by line count, with byte count as the tiebreaker so
/// asset-only languages (Images, Fonts) still land in a stable order.
pub fn language_breakdown(records: &[FileRecord]) -> Vec<LanguageStat> {
    let mut acc: HashMap<&str, (usize, u64, usize)> = HashMap::new();

    for r in records {
        let entry = acc.entry(r.language.as_str()).or_insert((0, 0, 0));
        entry.0 += 1;
        entry.1 += r.bytes;
        entry.2 += r.lines;
    }

    let total_lines: usize = records.iter().map(|r| r.lines).sum();

    let mut stats: Vec<LanguageStat> = acc
        .into_iter()
        .map(|(language, (files, bytes, lines))| LanguageStat {
            language: language.to_string(),
            files,
            bytes,
            lines,
            share: if total_lines > 0 {
                lines as f64 / total_lines as f64
            } else {
                0.0
            },
        })
        .collect();

    stats.sort_by(|a, b| {
        b.lines
            .cmp(&a.lines)
            .then(b.bytes.cmp(&a.bytes))
            .then(a.language.cmp(&b.language))
    });

    stats
}

pub fn largest_files(records: &[FileRecord], limit: usize) -> Vec<FileSummary> {
    let mut list: Vec<&FileRecord> = records.iter().filter(|r| r.lines > 0).collect();
    list.sort_by_key(|r| std::cmp::Reverse(r.lines));
    list.into_iter()
        .take(limit)
        .map(|r| FileSummary {
            path: r.rel_path.clone(),
            language: r.language.clone(),
            lines: r.lines,
            bytes: r.bytes,
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Project map
// ---------------------------------------------------------------------------

/// Files bigger than this share of the parent get their own tile instead of
/// being folded into the directory block.
const MAX_CHILDREN_PER_NODE: usize = 14;

#[derive(Default)]
struct DirAcc {
    files: usize,
    lines: usize,
    bytes: u64,
    weight: f64,
    languages: HashMap<String, f64>,
    children: HashMap<String, DirAcc>,
}

impl DirAcc {
    fn insert(&mut self, segments: &[&str], record: &FileRecord, weight: f64) {
        self.files += 1;
        self.lines += record.lines;
        self.bytes += record.bytes;
        self.weight += weight;
        *self.languages.entry(record.language.clone()).or_insert(0.0) += weight;

        if let Some((head, rest)) = segments.split_first() {
            if !rest.is_empty() {
                self.children
                    .entry((*head).to_string())
                    .or_default()
                    .insert(rest, record, weight);
            }
        }
    }

    fn dominant_language(&self) -> Option<String> {
        self.languages
            .iter()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(name, _)| name.clone())
    }

    fn into_node(self, name: String, path: String, depth: usize, max_depth: usize) -> MapNode {
        let language = self.dominant_language();

        let mut children: Vec<MapNode> = if depth >= max_depth {
            Vec::new()
        } else {
            let base = if path.is_empty() {
                String::new()
            } else {
                format!("{}/", path)
            };
            self.children
                .into_iter()
                .map(|(child_name, acc)| {
                    let child_path = format!("{}{}", base, child_name);
                    acc.into_node(child_name.clone(), child_path, depth + 1, max_depth)
                })
                .collect()
        };

        children.sort_by(|a, b| {
            b.weight
                .partial_cmp(&a.weight)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        if children.len() > MAX_CHILDREN_PER_NODE {
            let overflow: Vec<MapNode> = children.split_off(MAX_CHILDREN_PER_NODE - 1);
            let merged = MapNode {
                name: format!("+{} more", overflow.len()),
                path: format!("{}/*", path),
                kind: "overflow".to_string(),
                files: overflow.iter().map(|n| n.files).sum(),
                lines: overflow.iter().map(|n| n.lines).sum(),
                bytes: overflow.iter().map(|n| n.bytes).sum(),
                weight: overflow.iter().map(|n| n.weight).sum(),
                language: None,
                children: Vec::new(),
            };
            if merged.weight > 0.0 {
                children.push(merged);
            }
        }

        MapNode {
            name,
            path,
            kind: "dir".to_string(),
            files: self.files,
            lines: self.lines,
            bytes: self.bytes,
            weight: self.weight,
            language,
            children,
        }
    }
}

/// Builds the treemap source tree. Tile area uses code lines where available and
/// falls back to a damped byte count, so an assets folder still shows up without
/// swamping a source folder that holds far more of the project's substance.
pub fn build_map(records: &[FileRecord], depth: usize) -> MapNode {
    let mut root = DirAcc::default();

    for record in records {
        let weight = tile_weight(record);
        if weight <= 0.0 {
            continue;
        }
        let segments: Vec<&str> = record.rel_path.split('/').collect();
        // A file directly in the repo root gets a synthetic parent so it is
        // still visible as its own block rather than vanishing into the total.
        if segments.len() == 1 {
            root.files += 1;
            root.lines += record.lines;
            root.bytes += record.bytes;
            root.weight += weight;
            *root.languages.entry(record.language.clone()).or_insert(0.0) += weight;
            let child = root.children.entry("(root files)".to_string()).or_default();
            child.files += 1;
            child.lines += record.lines;
            child.bytes += record.bytes;
            child.weight += weight;
            *child
                .languages
                .entry(record.language.clone())
                .or_insert(0.0) += weight;
            continue;
        }
        root.insert(&segments, record, weight);
    }

    root.into_node(String::new(), String::new(), 0, depth)
}

fn tile_weight(record: &FileRecord) -> f64 {
    if record.lines > 0 {
        record.lines as f64
    } else {
        // ~1 unit per 4 KB keeps a 400 KB image comparable to a 100-line file
        // instead of a 400 000-line one.
        (record.bytes as f64 / 4096.0).min(500.0)
    }
}
