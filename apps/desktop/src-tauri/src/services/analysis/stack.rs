use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use serde_json::Value;

use crate::models::StackItem;
use crate::services::project_dirs::{app_roots, has_manifest};

/// Marker file -> (technology, category). Presence of the file is the evidence.
const FILE_MARKERS: &[(&str, &str, &str)] = &[
    ("Cargo.toml", "Rust", "language"),
    ("go.mod", "Go", "language"),
    ("pyproject.toml", "Python", "language"),
    ("requirements.txt", "Python", "language"),
    ("Pipfile", "Python", "language"),
    ("Gemfile", "Ruby", "language"),
    ("composer.json", "PHP", "language"),
    ("pom.xml", "Maven", "build"),
    ("build.gradle", "Gradle", "build"),
    ("build.gradle.kts", "Gradle", "build"),
    ("tsconfig.json", "TypeScript", "language"),
    ("Dockerfile", "Docker", "infra"),
    ("docker-compose.yml", "Docker Compose", "infra"),
    ("docker-compose.yaml", "Docker Compose", "infra"),
    ("Makefile", "Make", "build"),
    ("vercel.json", "Vercel", "infra"),
    ("netlify.toml", "Netlify", "infra"),
    ("fly.toml", "Fly.io", "infra"),
    ("serverless.yml", "Serverless", "infra"),
    ("terraform.tf", "Terraform", "infra"),
    (".gitlab-ci.yml", "GitLab CI", "ci"),
    ("azure-pipelines.yml", "Azure Pipelines", "ci"),
    ("Jenkinsfile", "Jenkins", "ci"),
    (".eslintrc.json", "ESLint", "quality"),
    ("eslint.config.js", "ESLint", "quality"),
    (".prettierrc", "Prettier", "quality"),
    ("biome.json", "Biome", "quality"),
    ("tailwind.config.js", "Tailwind CSS", "styling"),
    ("tailwind.config.ts", "Tailwind CSS", "styling"),
    ("next.config.js", "Next.js", "framework"),
    ("next.config.ts", "Next.js", "framework"),
    ("nuxt.config.ts", "Nuxt", "framework"),
    ("svelte.config.js", "SvelteKit", "framework"),
    ("astro.config.mjs", "Astro", "framework"),
    ("vite.config.ts", "Vite", "build"),
    ("vite.config.js", "Vite", "build"),
    ("webpack.config.js", "Webpack", "build"),
    ("rollup.config.js", "Rollup", "build"),
    ("prisma/schema.prisma", "Prisma", "data"),
    ("src-tauri/tauri.conf.json", "Tauri", "framework"),
];

/// npm dependency -> (display name, category). Matched on the exact package name.
const NPM_MARKERS: &[(&str, &str, &str)] = &[
    ("react", "React", "framework"),
    ("vue", "Vue", "framework"),
    ("svelte", "Svelte", "framework"),
    ("@angular/core", "Angular", "framework"),
    ("solid-js", "SolidJS", "framework"),
    ("next", "Next.js", "framework"),
    ("nuxt", "Nuxt", "framework"),
    ("astro", "Astro", "framework"),
    ("express", "Express", "backend"),
    ("fastify", "Fastify", "backend"),
    ("@nestjs/core", "NestJS", "backend"),
    ("hono", "Hono", "backend"),
    ("electron", "Electron", "framework"),
    ("@tauri-apps/api", "Tauri", "framework"),
    ("react-native", "React Native", "framework"),
    ("expo", "Expo", "framework"),
    ("typescript", "TypeScript", "language"),
    ("vite", "Vite", "build"),
    ("webpack", "Webpack", "build"),
    ("esbuild", "esbuild", "build"),
    ("turbo", "Turborepo", "build"),
    ("nx", "Nx", "build"),
    ("tailwindcss", "Tailwind CSS", "styling"),
    ("styled-components", "styled-components", "styling"),
    ("sass", "Sass", "styling"),
    ("@emotion/react", "Emotion", "styling"),
    ("jest", "Jest", "testing"),
    ("vitest", "Vitest", "testing"),
    ("mocha", "Mocha", "testing"),
    ("cypress", "Cypress", "testing"),
    ("@playwright/test", "Playwright", "testing"),
    ("@testing-library/react", "Testing Library", "testing"),
    ("prisma", "Prisma", "data"),
    ("drizzle-orm", "Drizzle", "data"),
    ("mongoose", "Mongoose", "data"),
    ("typeorm", "TypeORM", "data"),
    ("pg", "PostgreSQL", "data"),
    ("mysql2", "MySQL", "data"),
    ("redis", "Redis", "data"),
    ("sqlite3", "SQLite", "data"),
    ("graphql", "GraphQL", "data"),
    ("zustand", "Zustand", "state"),
    ("redux", "Redux", "state"),
    ("@tanstack/react-query", "TanStack Query", "state"),
    ("mobx", "MobX", "state"),
    ("socket.io", "Socket.IO", "backend"),
    ("three", "Three.js", "graphics"),
    ("d3", "D3", "graphics"),
    ("openai", "OpenAI SDK", "ai"),
    ("@anthropic-ai/sdk", "Anthropic SDK", "ai"),
    ("langchain", "LangChain", "ai"),
    ("eslint", "ESLint", "quality"),
    ("prettier", "Prettier", "quality"),
];

/// Cargo dependency -> (display name, category).
const CARGO_MARKERS: &[(&str, &str, &str)] = &[
    ("tauri", "Tauri", "framework"),
    ("axum", "Axum", "backend"),
    ("actix-web", "Actix Web", "backend"),
    ("rocket", "Rocket", "backend"),
    ("tokio", "Tokio", "runtime"),
    ("serde", "Serde", "runtime"),
    ("sqlx", "SQLx", "data"),
    ("diesel", "Diesel", "data"),
    ("reqwest", "reqwest", "runtime"),
    ("bevy", "Bevy", "graphics"),
    ("clap", "clap", "runtime"),
];

pub struct StackDetection {
    pub items: Vec<StackItem>,
    pub package_manager: Option<String>,
    pub has_ci: bool,
    pub has_docs: bool,
    pub has_license: bool,
    pub has_gitignore: bool,
    pub has_lockfile: bool,
    pub has_manifest: bool,
}

pub fn detect(root: &Path, file_paths: &[String]) -> StackDetection {
    // BTreeMap keeps the output deterministic and de-duplicated by name.
    let mut found: BTreeMap<String, StackItem> = BTreeMap::new();

    let mut add = |name: &str, category: &str, evidence: String, version: Option<String>| {
        let entry = found.entry(name.to_string()).or_insert_with(|| StackItem {
            name: name.to_string(),
            category: category.to_string(),
            evidence: evidence.clone(),
            version: version.clone(),
        });
        // A dependency manifest carries a version; a marker file does not, so a
        // later versioned hit upgrades the earlier entry.
        if entry.version.is_none() && version.is_some() {
            entry.version = version;
            entry.evidence = evidence;
        }
    };

    let roots = app_roots(root, has_manifest);

    for (prefix, dir) in &roots {
        for (marker, name, category) in FILE_MARKERS {
            if dir.join(marker).exists() {
                add(name, category, format!("{}{}", prefix, marker), None);
            }
        }

        if let Some(pkg) = read_json(&dir.join("package.json")) {
            for section in ["dependencies", "devDependencies"] {
                let Some(deps) = pkg.get(section).and_then(|v| v.as_object()) else {
                    continue;
                };
                for (dep, name, category) in NPM_MARKERS {
                    if let Some(version) = deps.get(*dep).and_then(|v| v.as_str()) {
                        add(
                            name,
                            category,
                            format!("{}package.json · {}", prefix, dep),
                            Some(clean_version(version)),
                        );
                    }
                }
            }
        }

        if let Ok(cargo) = fs::read_to_string(dir.join("Cargo.toml")) {
            for (dep, name, category) in CARGO_MARKERS {
                if cargo.lines().any(|line| {
                    let trimmed = line.trim_start();
                    trimmed.starts_with(&format!("{} ", dep))
                        || trimmed.starts_with(&format!("{}=", dep))
                        || trimmed.starts_with(&format!("{} =", dep))
                }) {
                    add(name, category, format!("{}Cargo.toml · {}", prefix, dep), None);
                }
            }
        }
    }

    let has_ci = root.join(".github/workflows").is_dir()
        || root.join(".gitlab-ci.yml").is_file()
        || root.join("azure-pipelines.yml").is_file()
        || root.join("Jenkinsfile").is_file()
        || root.join(".circleci").is_dir();

    if root.join(".github/workflows").is_dir() {
        add("GitHub Actions", "ci", ".github/workflows".to_string(), None);
    }

    let package_manager = if root.join("pnpm-lock.yaml").is_file() {
        Some("pnpm".to_string())
    } else if root.join("yarn.lock").is_file() {
        Some("yarn".to_string())
    } else if root.join("bun.lockb").is_file() || root.join("bun.lock").is_file() {
        Some("bun".to_string())
    } else if root.join("package-lock.json").is_file() {
        Some("npm".to_string())
    } else if root.join("Cargo.lock").is_file() {
        Some("cargo".to_string())
    } else if root.join("poetry.lock").is_file() {
        Some("poetry".to_string())
    } else {
        None
    };

    if let Some(pm) = &package_manager {
        add(pm, "tooling", "lockfile".to_string(), None);
    }

    let has_lockfile = package_manager.is_some();

    let mut items: Vec<StackItem> = found.into_values().collect();
    items.sort_by(|a, b| {
        category_rank(&a.category)
            .cmp(&category_rank(&b.category))
            .then(a.name.cmp(&b.name))
    });

    StackDetection {
        items,
        package_manager,
        has_ci,
        has_docs: file_paths
            .iter()
            .any(|p| p.eq_ignore_ascii_case("readme.md") || p.to_lowercase().starts_with("docs/")),
        has_license: file_paths.iter().any(|p| {
            let lower = p.to_lowercase();
            !lower.contains('/') && lower.starts_with("license")
        }),
        has_gitignore: root.join(".gitignore").is_file(),
        has_lockfile,
        // A workspace member's manifest counts: monorepos declare dependencies
        // per package, not at the root.
        has_manifest: roots.iter().any(|(_, dir)| {
            ["package.json", "Cargo.toml", "go.mod", "pyproject.toml", "composer.json"]
                .iter()
                .any(|m| dir.join(m).is_file())
        }),
    }
}

fn category_rank(category: &str) -> u8 {
    match category {
        "language" => 0,
        "framework" => 1,
        "backend" => 2,
        "runtime" => 3,
        "state" => 4,
        "data" => 5,
        "styling" => 6,
        "build" => 7,
        "testing" => 8,
        "ci" => 9,
        "infra" => 10,
        "ai" => 11,
        "graphics" => 12,
        "quality" => 13,
        _ => 14,
    }
}

fn read_json(path: &Path) -> Option<Value> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn clean_version(raw: &str) -> String {
    raw.trim_start_matches(['^', '~', '>', '=', '<', ' '])
        .trim()
        .to_string()
}

/// Counts files that look like tests, using the conventions of every ecosystem
/// this app is likely to meet.
pub fn count_test_files(file_paths: &[String]) -> usize {
    file_paths
        .iter()
        .filter(|p| {
            let lower = p.to_lowercase();
            lower.contains("__tests__/")
                || lower.contains("/tests/")
                || lower.starts_with("tests/")
                || lower.starts_with("test/")
                || lower.contains(".test.")
                || lower.contains(".spec.")
                || lower.starts_with("spec/")
                || lower.ends_with("_test.go")
                || lower.ends_with("_test.py")
                || lower.ends_with("_test.rs")
                || lower.ends_with("test.java")
        })
        .count()
}
