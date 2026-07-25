use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::process::Command;

use chrono::{DateTime, Datelike, Duration, Timelike, Utc};

use crate::models::{AuthorStat, CommitSummary, GitStats, WeekBucket};

/// Keeps `git` from flashing a console window on Windows.
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Upper bound on history depth. Ten thousand commits is enough for every metric
/// here to be stable, and keeps the parse under a second on large repositories.
const MAX_COMMITS: usize = 10_000;

/// Field separator inside a commit header line (ASCII unit separator).
const FS: char = '\x1f';
/// Record marker that starts a commit header line (ASCII start-of-header).
const RS: char = '\x01';

pub struct CommitRecord {
    pub hash: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: DateTime<Utc>,
    /// Hour and weekday in the author's own timezone, so the punchcard shows
    /// "when this person works" rather than when UTC happened to be.
    pub local_hour: usize,
    pub local_weekday: usize,
    pub subject: String,
    pub insertions: usize,
    pub deletions: usize,
    pub files: Vec<String>,
}

/// Per-file change history, keyed by repo-relative path.
pub struct FileChurn {
    pub commits: usize,
    pub authors: HashSet<String>,
    pub churn: usize,
}

pub struct HistoryOutcome {
    pub stats: GitStats,
    pub churn: HashMap<String, FileChurn>,
}

fn git(repo: &Path, args: &[&str]) -> Option<String> {
    let mut cmd = Command::new("git");
    cmd.arg("-C").arg(repo).args(args);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().ok()?;
    if !output.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Reads and aggregates the commit history. Returns `None` when git is absent or
/// the directory has no commits yet — the rest of the analysis stays valid.
pub fn analyze_history(repo: &Path) -> Option<HistoryOutcome> {
    let log = git(
        repo,
        &[
            "log",
            "--no-merges",
            &format!("--max-count={}", MAX_COMMITS),
            "--numstat",
            &format!(
                "--pretty=format:{}%H{}%an{}%ae{}%aI{}%s",
                RS, FS, FS, FS, FS
            ),
        ],
    )?;

    let commits = parse_log(&log);
    if commits.is_empty() {
        return None;
    }

    let churn = build_churn(&commits);
    let stats = build_stats(repo, &commits);

    Some(HistoryOutcome { stats, churn })
}

fn parse_log(log: &str) -> Vec<CommitRecord> {
    let mut commits: Vec<CommitRecord> = Vec::new();

    for line in log.lines() {
        if let Some(header) = line.strip_prefix(RS) {
            let parts: Vec<&str> = header.splitn(5, FS).collect();
            if parts.len() < 5 {
                continue;
            }
            let Ok(authored) = DateTime::parse_from_rfc3339(parts[3].trim()) else {
                continue;
            };

            commits.push(CommitRecord {
                hash: parts[0].to_string(),
                author_name: parts[1].to_string(),
                author_email: parts[2].to_ascii_lowercase(),
                timestamp: authored.with_timezone(&Utc),
                local_hour: authored.hour() as usize,
                local_weekday: authored.weekday().num_days_from_monday() as usize,
                subject: parts[4].to_string(),
                insertions: 0,
                deletions: 0,
                files: Vec::new(),
            });
            continue;
        }

        if line.trim().is_empty() {
            continue;
        }

        // numstat row: "<added>\t<deleted>\t<path>"; binary files report "-".
        let Some(current) = commits.last_mut() else {
            continue;
        };
        let mut cols = line.split('\t');
        let (Some(added), Some(deleted), Some(path)) = (cols.next(), cols.next(), cols.next())
        else {
            continue;
        };

        current.insertions += added.parse::<usize>().unwrap_or(0);
        current.deletions += deleted.parse::<usize>().unwrap_or(0);
        current.files.push(normalize_numstat_path(path));
    }

    commits
}

/// Renames arrive as `old => new` or `dir/{old => new}/file`. Only the resulting
/// path matters for churn attribution.
fn normalize_numstat_path(raw: &str) -> String {
    let path = raw.trim();
    if !path.contains("=>") {
        return path.to_string();
    }

    if let (Some(open), Some(close)) = (path.find('{'), path.find('}')) {
        if open < close {
            let inner = &path[open + 1..close];
            let new_part = inner.split("=>").nth(1).unwrap_or("").trim();
            let rebuilt = format!("{}{}{}", &path[..open], new_part, &path[close + 1..]);
            return rebuilt.replace("//", "/");
        }
    }

    path.split("=>").nth(1).unwrap_or(path).trim().to_string()
}

fn build_churn(commits: &[CommitRecord]) -> HashMap<String, FileChurn> {
    let mut churn: HashMap<String, FileChurn> = HashMap::new();

    for commit in commits {
        // A commit's insertions/deletions are known per file only via numstat,
        // which we already folded into the commit total; attribute the commit's
        // average change to each file it touched.
        let per_file = if commit.files.is_empty() {
            0
        } else {
            (commit.insertions + commit.deletions) / commit.files.len()
        };

        for file in &commit.files {
            let entry = churn.entry(file.clone()).or_insert_with(|| FileChurn {
                commits: 0,
                authors: HashSet::new(),
                churn: 0,
            });
            entry.commits += 1;
            entry.authors.insert(commit.author_email.clone());
            entry.churn += per_file;
        }
    }

    churn
}

fn build_stats(repo: &Path, commits: &[CommitRecord]) -> GitStats {
    let now = Utc::now();

    // git log is newest-first.
    let last = commits.first().map(|c| c.timestamp);
    let first = commits.last().map(|c| c.timestamp);

    let age_days = first.map(|f| (now - f).num_days()).unwrap_or(0);
    let days_since_last_commit = last.map(|l| (now - l).num_days()).unwrap_or(0);

    let active_days: HashSet<String> = commits
        .iter()
        .map(|c| c.timestamp.format("%Y-%m-%d").to_string())
        .collect();

    let cutoff_30 = now - Duration::days(30);
    let cutoff_90 = now - Duration::days(90);
    let commits_last_30d = commits.iter().filter(|c| c.timestamp >= cutoff_30).count();
    let commits_last_90d = commits.iter().filter(|c| c.timestamp >= cutoff_90).count();

    // Momentum compares the last quarter's rate against the project's lifetime
    // rate: 1.0 means "as active as it has ever been on average". A repository
    // younger than the 90-day window is measured over its own lifetime instead,
    // which is the only way the comparison stays meaningful on day one.
    let lifetime_days = age_days.max(1) as f64;
    let window_days = lifetime_days.min(90.0);
    let lifetime_rate = commits.len() as f64 / lifetime_days;
    let recent_rate = commits_last_90d as f64 / window_days;
    let momentum = if lifetime_rate > 0.0 {
        recent_rate / lifetime_rate
    } else {
        0.0
    };

    let total_changes: usize = commits.iter().map(|c| c.insertions + c.deletions).sum();
    let avg_commit_size = if commits.is_empty() {
        0.0
    } else {
        total_changes as f64 / commits.len() as f64
    };

    GitStats {
        branch: git(repo, &["rev-parse", "--abbrev-ref", "HEAD"]).map(|s| s.trim().to_string()),
        is_dirty: false, // filled in below
        dirty_files: 0,
        total_commits: commits.len(),
        commits_truncated: commits.len() >= MAX_COMMITS,
        first_commit_at: first.map(|d| d.to_rfc3339()),
        last_commit_at: last.map(|d| d.to_rfc3339()),
        age_days,
        days_since_last_commit,
        active_days: active_days.len(),
        commits_last_30d,
        commits_last_90d,
        momentum,
        avg_commit_size,
        weekly_activity: weekly_activity(commits, now),
        punchcard: punchcard(commits),
        authors: author_stats(commits),
        bus_factor: bus_factor(commits),
        branches: count_lines_of(git(
            repo,
            &["for-each-ref", "--format=%(refname)", "refs/heads"],
        )),
        tags: count_lines_of(git(
            repo,
            &["for-each-ref", "--format=%(refname)", "refs/tags"],
        )),
        recent_commits: recent_commits(commits, 8),
    }
    .with_worktree_state(repo)
}

impl GitStats {
    fn with_worktree_state(mut self, repo: &Path) -> Self {
        if let Some(status) = git(repo, &["status", "--porcelain"]) {
            let dirty = status.lines().filter(|l| !l.trim().is_empty()).count();
            self.dirty_files = dirty;
            self.is_dirty = dirty > 0;
        }
        self
    }
}

fn count_lines_of(output: Option<String>) -> usize {
    output
        .map(|s| s.lines().filter(|l| !l.trim().is_empty()).count())
        .unwrap_or(0)
}

/// Commits per ISO week for the last 52 weeks, oldest first.
fn weekly_activity(commits: &[CommitRecord], now: DateTime<Utc>) -> Vec<WeekBucket> {
    const WEEKS: i64 = 52;
    let current_week_start = now - Duration::days(now.weekday().num_days_from_monday() as i64);
    let window_start = current_week_start - Duration::weeks(WEEKS - 1);

    let mut buckets: Vec<WeekBucket> = (0..WEEKS)
        .map(|i| WeekBucket {
            week_start: (window_start + Duration::weeks(i))
                .format("%Y-%m-%d")
                .to_string(),
            commits: 0,
        })
        .collect();

    for commit in commits {
        let delta = (commit.timestamp.date_naive() - window_start.date_naive()).num_days();
        if delta < 0 {
            continue;
        }
        let index = (delta / 7) as usize;
        if let Some(bucket) = buckets.get_mut(index) {
            bucket.commits += 1;
        }
    }

    buckets
}

/// 7x24 weekday/hour matrix — when this project actually gets worked on.
fn punchcard(commits: &[CommitRecord]) -> Vec<Vec<usize>> {
    let mut grid = vec![vec![0usize; 24]; 7];
    for commit in commits {
        grid[commit.local_weekday][commit.local_hour] += 1;
    }
    grid
}

fn author_stats(commits: &[CommitRecord]) -> Vec<AuthorStat> {
    struct Acc {
        names: HashMap<String, usize>,
        commits: usize,
        insertions: usize,
        deletions: usize,
        first: DateTime<Utc>,
        last: DateTime<Utc>,
    }

    let mut acc: HashMap<String, Acc> = HashMap::new();

    for commit in commits {
        let entry = acc
            .entry(commit.author_email.clone())
            .or_insert_with(|| Acc {
                names: HashMap::new(),
                commits: 0,
                insertions: 0,
                deletions: 0,
                first: commit.timestamp,
                last: commit.timestamp,
            });
        *entry.names.entry(commit.author_name.clone()).or_insert(0) += 1;
        entry.commits += 1;
        entry.insertions += commit.insertions;
        entry.deletions += commit.deletions;
        entry.first = entry.first.min(commit.timestamp);
        entry.last = entry.last.max(commit.timestamp);
    }

    let total = commits.len() as f64;
    let mut authors: Vec<AuthorStat> = acc
        .into_iter()
        .map(|(email, a)| AuthorStat {
            // Authors often commit under several spellings of the same name;
            // the most frequently used one wins.
            name: a
                .names
                .iter()
                .max_by_key(|(_, count)| **count)
                .map(|(name, _)| name.clone())
                .unwrap_or_else(|| email.clone()),
            email,
            commits: a.commits,
            insertions: a.insertions,
            deletions: a.deletions,
            share: if total > 0.0 {
                a.commits as f64 / total
            } else {
                0.0
            },
            first_commit_at: a.first.to_rfc3339(),
            last_commit_at: a.last.to_rfc3339(),
        })
        .collect();

    authors.sort_by(|a, b| b.commits.cmp(&a.commits).then(a.name.cmp(&b.name)));
    authors
}

/// How many people it takes to cover half the commits — the standard "how many
/// can we afford to lose" proxy.
fn bus_factor(commits: &[CommitRecord]) -> usize {
    let authors = author_stats(commits);
    let half = commits.len() as f64 / 2.0;
    let mut running = 0.0;
    let mut count = 0;

    for author in &authors {
        running += author.commits as f64;
        count += 1;
        if running >= half {
            break;
        }
    }

    count.max(1)
}

fn recent_commits(commits: &[CommitRecord], limit: usize) -> Vec<CommitSummary> {
    commits
        .iter()
        .take(limit)
        .map(|c| CommitSummary {
            hash: c.hash.chars().take(8).collect(),
            author: c.author_name.clone(),
            date: c.timestamp.to_rfc3339(),
            subject: c.subject.clone(),
            insertions: c.insertions,
            deletions: c.deletions,
        })
        .collect()
}
