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
pub struct LaunchResult {
    pub success: bool,
    pub error: Option<String>,
}
