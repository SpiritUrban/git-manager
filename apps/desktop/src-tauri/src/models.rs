use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscoveredRepo {
    pub path: String,
    pub normalized_path: String,
    pub name: String,
    pub remote_origin: Option<String>,
    pub repository_url: Option<String>,
    pub website_url: Option<String>,
    pub icon_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanProgressEvent {
    pub scanned_count: usize,
    pub current_path: String,
    pub repos_found: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanSummaryResult {
    pub found: usize,
    pub added: usize,
    pub updated: usize,
    pub missing: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
    pub repos: Vec<DiscoveredRepo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IconResolutionResult {
    pub icon_source: String,
    pub icon_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebsiteDetection {
    pub url: String,
    /// Which file the URL came from, shown so the guess is auditable.
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LaunchResult {
    pub success: bool,
    pub error: Option<String>,
}

// ---------------------------------------------------------------------------
// Project analysis
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectAnalysis {
    pub path: String,
    pub generated_at: String,
    pub duration_ms: u64,
    pub summary: RepoSummary,
    pub languages: Vec<LanguageStat>,
    pub map: MapNode,
    pub git: Option<GitStats>,
    pub stack: Vec<StackItem>,
    pub health: HealthReport,
    pub hotspots: Vec<Hotspot>,
    pub largest_files: Vec<FileSummary>,
    pub notes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RepoSummary {
    pub total_files: usize,
    pub total_dirs: usize,
    pub total_bytes: u64,
    pub total_lines: usize,
    pub code_lines: usize,
    pub comment_lines: usize,
    pub blank_lines: usize,
    pub binary_files: usize,
    pub max_depth: usize,
    pub todo_count: usize,
    pub truncated: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LanguageStat {
    pub language: String,
    pub files: usize,
    pub bytes: u64,
    pub lines: usize,
    pub share: f64,
}

/// One node of the visual project map. `weight` is the treemap area metric
/// (code lines, falling back to bytes for asset-only directories).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MapNode {
    pub name: String,
    pub path: String,
    pub kind: String,
    pub files: usize,
    pub lines: usize,
    pub bytes: u64,
    pub weight: f64,
    pub language: Option<String>,
    pub children: Vec<MapNode>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitStats {
    pub branch: Option<String>,
    pub is_dirty: bool,
    pub dirty_files: usize,
    pub total_commits: usize,
    pub commits_truncated: bool,
    pub first_commit_at: Option<String>,
    pub last_commit_at: Option<String>,
    pub age_days: i64,
    pub days_since_last_commit: i64,
    pub active_days: usize,
    pub commits_last_30d: usize,
    pub commits_last_90d: usize,
    pub momentum: f64,
    pub avg_commit_size: f64,
    pub weekly_activity: Vec<WeekBucket>,
    pub punchcard: Vec<Vec<usize>>,
    pub authors: Vec<AuthorStat>,
    pub bus_factor: usize,
    pub branches: usize,
    pub tags: usize,
    pub recent_commits: Vec<CommitSummary>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WeekBucket {
    pub week_start: String,
    pub commits: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthorStat {
    pub name: String,
    pub email: String,
    pub commits: usize,
    pub insertions: usize,
    pub deletions: usize,
    pub share: f64,
    pub first_commit_at: String,
    pub last_commit_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommitSummary {
    pub hash: String,
    pub author: String,
    pub date: String,
    pub subject: String,
    pub insertions: usize,
    pub deletions: usize,
}

/// A file that is both large and frequently changed — the classic
/// churn x complexity risk signal.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Hotspot {
    pub path: String,
    pub language: String,
    pub lines: usize,
    pub commits: usize,
    pub authors: usize,
    pub churn: usize,
    pub risk: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileSummary {
    pub path: String,
    pub language: String,
    pub lines: usize,
    pub bytes: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StackItem {
    pub name: String,
    pub category: String,
    pub evidence: String,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HealthReport {
    pub score: u32,
    pub grade: String,
    pub checks: Vec<HealthCheck>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HealthCheck {
    pub id: String,
    pub label: String,
    pub status: String,
    pub detail: String,
    pub weight: u32,
    pub earned: u32,
}
