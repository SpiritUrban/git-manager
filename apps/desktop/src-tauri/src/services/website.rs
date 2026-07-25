use std::fs;
use std::path::Path;

use serde_json::Value;

use crate::models::WebsiteDetection;
use crate::services::project_dirs::app_roots;

/// Hosts that serve source code, not a project's website. A `homepage` pointing
/// at one of these is the `npm init` default (`https://github.com/o/r#readme`),
/// which duplicates the repository link rather than naming a site.
const CODE_HOSTS: &[&str] = &[
    "github.com",
    "www.github.com",
    "gitlab.com",
    "www.gitlab.com",
    "bitbucket.org",
    "www.bitbucket.org",
    "codeberg.org",
    "sourceforge.net",
];

/// Host suffixes belonging to managed backends — a database, queue or
/// error-tracking endpoint is never the project's website, whatever key it was
/// found under. Mirrored in `packages/shared/src/url-utils.ts`, which repairs
/// values written before this check existed.
const INFRA_HOST_SUFFIXES: &[&str] = &[
    ".supabase.co",
    ".supabase.in",
    ".firebaseio.com",
    ".firebasedatabase.app",
    ".mongodb.net",
    ".documents.azure.com",
    ".amazonaws.com",
    ".upstash.io",
    ".neon.tech",
    ".planetscale.com",
    ".turso.io",
    ".cockroachlabs.cloud",
    ".clickhouse.cloud",
    ".elastic-cloud.com",
    ".sentry.io",
    ".redislabs.com",
    ".pusher.com",
    ".algolia.net",
];

/// Hosts that never identify a real deployment.
const PLACEHOLDER_HOSTS: &[&str] = &[
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "example.com",
    "www.example.com",
    "example.org",
    "example.net",
    "yourdomain.com",
    "your-domain.com",
    "domain.com",
];

/// Environment files, most authoritative first. `.env.example` is a template of
/// placeholders, so it is consulted last and only as a hint.
const ENV_FILES: &[&str] = &[".env.production", ".env.local", ".env", ".env.example"];

/// Config files that declare the deployed origin, paired with the key that holds it.
const CONFIG_KEYS: &[(&str, &str)] = &[
    ("astro.config.mjs", "site"),
    ("astro.config.ts", "site"),
    ("astro.config.js", "site"),
    ("docusaurus.config.js", "url"),
    ("docusaurus.config.ts", "url"),
    ("next-sitemap.config.js", "siteUrl"),
    ("gatsby-config.js", "siteUrl"),
    ("svelte.config.js", "url"),
];

/// Where a GitHub Pages custom domain lives.
const CNAME_LOCATIONS: &[&str] = &["CNAME", "public/CNAME", "docs/CNAME", "static/CNAME"];

/// Finds the project's public website.
///
/// Sources are tried in descending order of confidence: an explicit custom
/// domain beats an environment variable, which beats a framework config, which
/// beats `package.json`'s `homepage` — a field that in practice is either absent
/// or left at the `npm init` default. `repository_url` is passed so a homepage
/// that merely points back at the repository can be rejected.
pub fn find_website_url(root: &Path, repository_url: Option<&str>) -> Option<WebsiteDetection> {
    let roots = app_roots(root, |dir| {
        dir.join("package.json").is_file()
            || dir.join("public").is_dir()
            || dir.join("src").is_dir()
    });

    for (prefix, dir) in &roots {
        if let Some(found) = from_cname(dir, prefix) {
            return Some(found);
        }
    }

    for (prefix, dir) in &roots {
        if let Some(found) = from_env_files(dir, prefix, repository_url) {
            return Some(found);
        }
    }

    for (prefix, dir) in &roots {
        if let Some(found) = from_config_files(dir, prefix, repository_url) {
            return Some(found);
        }
    }

    for (prefix, dir) in &roots {
        if let Some(found) = from_package_json(dir, prefix, repository_url) {
            return Some(found);
        }
    }

    None
}

fn from_cname(dir: &Path, prefix: &str) -> Option<WebsiteDetection> {
    for location in CNAME_LOCATIONS {
        let path = dir.join(location);
        if !path.is_file() {
            continue;
        }
        let content = fs::read_to_string(&path).ok()?;
        let domain = content.trim().lines().next()?.trim();
        if domain.is_empty() || domain.starts_with('#') {
            continue;
        }
        // A CNAME holds a bare domain, never a scheme.
        let candidate = format!("https://{}", domain.trim_start_matches("https://"));
        if let Some(url) = usable_site_url(&candidate, None) {
            return Some(WebsiteDetection {
                url,
                source: format!("{}{}", prefix, location),
            });
        }
    }
    None
}

fn from_env_files(dir: &Path, prefix: &str, repository_url: Option<&str>) -> Option<WebsiteDetection> {
    for file in ENV_FILES {
        let path = dir.join(file);
        let Ok(content) = fs::read_to_string(&path) else {
            continue;
        };

        for line in content.lines() {
            let line = line.trim();
            // Commented-out values are previous deployments, not the current one.
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let Some((key, raw)) = line.split_once('=') else {
                continue;
            };
            let key = key.trim().trim_start_matches("export ").trim();
            if !is_site_url_key(key) {
                continue;
            }
            if let Some(url) = usable_site_url(raw, repository_url) {
                return Some(WebsiteDetection {
                    url,
                    source: format!("{}{} · {}", prefix, file, key),
                });
            }
        }
    }
    None
}

/// Qualifiers that mean "this is the public site", as a whole `_`-delimited
/// segment immediately before `URL`.
const SITE_QUALIFIERS: &[&str] = &[
    "SITE", "APP", "WEB", "WEBSITE", "HOME", "DOMAIN", "ORIGIN", "PUBLIC", "PROD", "PRODUCTION",
];

/// Segments that mark a URL as infrastructure, never the site. A connection
/// string must never end up in a user-visible field.
const NEVER_A_SITE: &[&str] = &[
    "DATABASE", "SUPABASE", "POSTGRES", "POSTGRESQL", "MYSQL", "MONGO", "MONGODB", "REDIS",
    "SMTP", "AMQP", "KAFKA", "S3", "AWS", "SENTRY", "WEBHOOK", "CALLBACK", "SECRET", "TOKEN",
    "KEY", "PASSWORD", "DSN", "PROXY",
];

/// Matches the naming every framework converged on, plus deploy-script variants
/// like `FTP_SITE_URL`.
///
/// Matching is per `_`-delimited segment, not by string suffix: `SUPABASE_URL`
/// and `DATABASE_URL` both *end with* `BASE_URL`, and treating them as the site
/// would surface a backend endpoint — or a credentialed connection string — as
/// the project's homepage.
fn is_site_url_key(key: &str) -> bool {
    let upper = key.to_ascii_uppercase();
    let segments: Vec<&str> = upper.split('_').filter(|s| !s.is_empty()).collect();

    let Some((last, head)) = segments.split_last() else {
        return false;
    };
    if *last != "URL" {
        return false;
    }
    if segments.iter().any(|s| NEVER_A_SITE.contains(s)) {
        return false;
    }

    match head.last() {
        // A bare `URL=` is the project's own address by convention.
        None => true,
        Some(qualifier) => SITE_QUALIFIERS.contains(qualifier),
    }
}

fn from_config_files(dir: &Path, prefix: &str, repository_url: Option<&str>) -> Option<WebsiteDetection> {
    for (file, key) in CONFIG_KEYS {
        let path = dir.join(file);
        let Ok(content) = fs::read_to_string(&path) else {
            continue;
        };

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("//") || !trimmed.starts_with(key) {
                continue;
            }
            // The key must be followed by a separator, so `site` does not match
            // `siteMetadata`.
            let after = trimmed[key.len()..].trim_start();
            if !after.starts_with(':') && !after.starts_with('=') {
                continue;
            }
            if let Some(url) = first_quoted_url(after).and_then(|c| usable_site_url(&c, repository_url)) {
                return Some(WebsiteDetection {
                    url,
                    source: format!("{}{} · {}", prefix, file, key),
                });
            }
        }
    }
    None
}

/// Pulls the first single- or double-quoted string out of a config fragment.
fn first_quoted_url(fragment: &str) -> Option<String> {
    for quote in ['\'', '"', '`'] {
        if let Some(start) = fragment.find(quote) {
            let rest = &fragment[start + 1..];
            if let Some(end) = rest.find(quote) {
                return Some(rest[..end].to_string());
            }
        }
    }
    None
}

fn from_package_json(dir: &Path, prefix: &str, repository_url: Option<&str>) -> Option<WebsiteDetection> {
    let content = fs::read_to_string(dir.join("package.json")).ok()?;
    let json: Value = serde_json::from_str(&content).ok()?;
    let homepage = json.get("homepage")?.as_str()?;
    let url = usable_site_url(homepage, repository_url)?;

    Some(WebsiteDetection {
        url,
        source: format!("{}package.json · homepage", prefix),
    })
}

/// Validates a candidate and returns it normalized, or `None` when it does not
/// describe a reachable public site.
pub fn usable_site_url(raw: &str, repository_url: Option<&str>) -> Option<String> {
    let trimmed = raw.trim().trim_matches(['"', '\'', '`']).trim();
    if trimmed.is_empty() {
        return None;
    }

    // CRA writes a relative path here (`"."`, `"/app"`); that is a build setting.
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        return None;
    }

    let parsed = url::Url::parse(trimmed).ok()?;
    let host = parsed.host_str()?.to_ascii_lowercase();

    if host.is_empty() || PLACEHOLDER_HOSTS.contains(&host.as_str()) {
        return None;
    }

    // Embedded credentials mean this is a connection string, not a public site.
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return None;
    }

    // github.io / gitlab.io / pages.dev ARE websites; their parent code hosts are not.
    if CODE_HOSTS.contains(&host.as_str()) {
        return None;
    }

    if INFRA_HOST_SUFFIXES.iter().any(|suffix| host.ends_with(suffix)) {
        return None;
    }

    // A homepage that restates the repository link tells us nothing new.
    if let Some(repo) = repository_url {
        if same_target(trimmed, repo) {
            return None;
        }
    }

    Some(trimmed.trim_end_matches('/').to_string())
}

/// True when two URLs point at the same page ignoring scheme, `www.`, fragments
/// and trailing slashes.
fn same_target(a: &str, b: &str) -> bool {
    fn key(raw: &str) -> Option<String> {
        let parsed = url::Url::parse(raw).ok()?;
        let host = parsed.host_str()?.trim_start_matches("www.").to_ascii_lowercase();
        let path = parsed.path().trim_end_matches('/').to_ascii_lowercase();
        Some(format!("{}{}", host, path))
    }

    match (key(a), key(b)) {
        (Some(x), Some(y)) => x == y,
        _ => false,
    }
}
