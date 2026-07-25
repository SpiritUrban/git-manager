use super::stack::StackDetection;
use crate::models::{GitStats, HealthCheck, HealthReport, RepoSummary};

/// Inputs the score is computed from. Every field is something the analyzer
/// already measured — the scorer itself touches no disk.
pub struct HealthInput<'a> {
    pub summary: &'a RepoSummary,
    pub stack: &'a StackDetection,
    pub git: Option<&'a GitStats>,
    pub test_files: usize,
    pub oversized_files: usize,
}

struct Rule {
    id: &'static str,
    label: &'static str,
    weight: u32,
}

const RULES: &[Rule] = &[
    Rule {
        id: "readme",
        label: "Documentation",
        weight: 10,
    },
    Rule {
        id: "license",
        label: "License",
        weight: 6,
    },
    Rule {
        id: "gitignore",
        label: ".gitignore",
        weight: 5,
    },
    Rule {
        id: "manifest",
        label: "Dependency manifest",
        weight: 5,
    },
    Rule {
        id: "lockfile",
        label: "Pinned dependencies",
        weight: 6,
    },
    Rule {
        id: "tests",
        label: "Automated tests",
        weight: 15,
    },
    Rule {
        id: "ci",
        label: "CI pipeline",
        weight: 10,
    },
    Rule {
        id: "activity",
        label: "Recent activity",
        weight: 15,
    },
    Rule {
        id: "clean",
        label: "Clean working tree",
        weight: 8,
    },
    Rule {
        id: "bus_factor",
        label: "Bus factor",
        weight: 8,
    },
    Rule {
        id: "file_size",
        label: "File size discipline",
        weight: 7,
    },
    Rule {
        id: "debt",
        label: "TODO density",
        weight: 5,
    },
];

/// Scores the repository out of 100 across twelve weighted checks. Each check
/// reports its own status and reasoning so the number is never a black box.
pub fn score(input: HealthInput) -> HealthReport {
    let mut checks: Vec<HealthCheck> = Vec::new();

    let mut push = |id: &str, earned_ratio: f64, status: &str, detail: String| {
        let rule = RULES
            .iter()
            .find(|r| r.id == id)
            .expect("unknown health rule");
        checks.push(HealthCheck {
            id: rule.id.to_string(),
            label: rule.label.to_string(),
            status: status.to_string(),
            detail,
            weight: rule.weight,
            earned: (rule.weight as f64 * earned_ratio).round() as u32,
        });
    };

    let s = input.stack;

    push(
        "readme",
        if s.has_docs { 1.0 } else { 0.0 },
        if s.has_docs { "good" } else { "warning" },
        if s.has_docs {
            "README or docs/ present".to_string()
        } else {
            "No README — newcomers have nothing to start from".to_string()
        },
    );

    push(
        "license",
        if s.has_license { 1.0 } else { 0.0 },
        if s.has_license { "good" } else { "info" },
        if s.has_license {
            "LICENSE file present".to_string()
        } else {
            "No LICENSE — reuse terms are undefined".to_string()
        },
    );

    push(
        "gitignore",
        if s.has_gitignore { 1.0 } else { 0.0 },
        if s.has_gitignore { "good" } else { "warning" },
        if s.has_gitignore {
            ".gitignore present".to_string()
        } else {
            "No .gitignore — build output risks being committed".to_string()
        },
    );

    push(
        "manifest",
        if s.has_manifest { 1.0 } else { 0.0 },
        if s.has_manifest { "good" } else { "info" },
        if s.has_manifest {
            "Dependencies declared in a manifest".to_string()
        } else {
            "No dependency manifest found".to_string()
        },
    );

    push(
        "lockfile",
        if s.has_lockfile { 1.0 } else { 0.0 },
        if s.has_lockfile { "good" } else { "warning" },
        match &s.package_manager {
            Some(pm) => format!("Lockfile present ({})", pm),
            None => "No lockfile — installs are not reproducible".to_string(),
        },
    );

    let test_ratio = match input.test_files {
        0 => 0.0,
        1..=4 => 0.5,
        5..=19 => 0.8,
        _ => 1.0,
    };
    push(
        "tests",
        test_ratio,
        if input.test_files == 0 {
            "critical"
        } else if test_ratio < 1.0 {
            "warning"
        } else {
            "good"
        },
        match input.test_files {
            0 => "No test files detected".to_string(),
            n => format!("{} test file{} detected", n, if n == 1 { "" } else { "s" }),
        },
    );

    push(
        "ci",
        if s.has_ci { 1.0 } else { 0.0 },
        if s.has_ci { "good" } else { "warning" },
        if s.has_ci {
            "CI configuration present".to_string()
        } else {
            "No CI pipeline — nothing verifies pushes".to_string()
        },
    );

    // Activity decays over a year: fresh for a month, half-credit at a quarter,
    // nothing once a repository has been untouched for twelve months.
    let (activity_ratio, activity_status, activity_detail) = match input.git {
        Some(git) => {
            let days = git.days_since_last_commit;
            let ratio = match days {
                d if d <= 30 => 1.0,
                d if d <= 90 => 0.7,
                d if d <= 180 => 0.45,
                d if d <= 365 => 0.2,
                _ => 0.0,
            };
            let status = match days {
                d if d <= 90 => "good",
                d if d <= 365 => "warning",
                _ => "critical",
            };
            (ratio, status, format!("Last commit {} days ago", days))
        }
        None => (0.0, "info", "No git history available".to_string()),
    };
    push("activity", activity_ratio, activity_status, activity_detail);

    let (clean_ratio, clean_status, clean_detail) = match input.git {
        Some(git) if !git.is_dirty => (1.0, "good", "Working tree is clean".to_string()),
        Some(git) => {
            let ratio = if git.dirty_files > 20 { 0.0 } else { 0.4 };
            let status = if git.dirty_files > 20 {
                "warning"
            } else {
                "info"
            };
            (
                ratio,
                status,
                format!("{} uncommitted change(s)", git.dirty_files),
            )
        }
        None => (0.0, "info", "No git history available".to_string()),
    };
    push("clean", clean_ratio, clean_status, clean_detail);

    let (bus_ratio, bus_status, bus_detail) = match input.git {
        Some(git) => {
            let ratio = match git.bus_factor {
                0 | 1 => 0.25,
                2 => 0.7,
                _ => 1.0,
            };
            let status = if git.bus_factor <= 1 {
                "warning"
            } else {
                "good"
            };
            (
                ratio,
                status,
                format!(
                    "{} author(s) cover half the commits, {} total",
                    git.bus_factor,
                    git.authors.len()
                ),
            )
        }
        None => (0.0, "info", "No git history available".to_string()),
    };
    push("bus_factor", bus_ratio, bus_status, bus_detail);

    // Files above 1000 lines are the usual refactoring candidates; the check
    // measures how much of the codebase sits in them.
    let oversized_share = if input.summary.total_files > 0 {
        input.oversized_files as f64 / input.summary.total_files as f64
    } else {
        0.0
    };
    let size_ratio = (1.0 - oversized_share * 12.0).clamp(0.0, 1.0);
    push(
        "file_size",
        size_ratio,
        if size_ratio > 0.8 {
            "good"
        } else if size_ratio > 0.4 {
            "warning"
        } else {
            "critical"
        },
        format!("{} file(s) over 1000 lines", input.oversized_files),
    );

    // One marker per 200 lines of code is the point where the score bottoms out.
    let todo_density = if input.summary.code_lines > 0 {
        input.summary.todo_count as f64 / input.summary.code_lines as f64
    } else {
        0.0
    };
    let debt_ratio = (1.0 - todo_density * 200.0).clamp(0.0, 1.0);
    push(
        "debt",
        debt_ratio,
        if debt_ratio > 0.7 { "good" } else { "warning" },
        format!("{} TODO/FIXME marker(s)", input.summary.todo_count),
    );

    let earned: u32 = checks.iter().map(|c| c.earned).sum();
    let total: u32 = checks.iter().map(|c| c.weight).sum();
    let score = if total > 0 {
        ((earned as f64 / total as f64) * 100.0).round() as u32
    } else {
        0
    };

    HealthReport {
        score,
        grade: grade_for(score).to_string(),
        checks,
    }
}

fn grade_for(score: u32) -> &'static str {
    match score {
        90..=100 => "A",
        75..=89 => "B",
        60..=74 => "C",
        45..=59 => "D",
        _ => "E",
    }
}
