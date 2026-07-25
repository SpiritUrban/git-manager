use std::fs;
use std::path::{Path, PathBuf};

use crate::services::website::{find_website_url, usable_site_url};

/// Builds a throwaway repository layout under the OS temp dir.
struct Fixture {
    root: PathBuf,
}

impl Fixture {
    fn new(name: &str) -> Self {
        let root = std::env::temp_dir().join(format!("gm-website-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).expect("create fixture root");
        Fixture { root }
    }

    fn write(&self, rel: &str, content: &str) -> &Self {
        let path = self.root.join(rel);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("create fixture dir");
        }
        fs::write(path, content).expect("write fixture file");
        self
    }

    fn path(&self) -> &Path {
        &self.root
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

#[test]
fn rejects_the_npm_init_homepage_default() {
    // `npm init` writes the repository's own README as the homepage. It names no
    // website and would make the globe button duplicate the repository button.
    assert_eq!(
        usable_site_url(
            "https://github.com/SpiritUrban/cheknis#readme",
            Some("https://github.com/SpiritUrban/cheknis")
        ),
        None
    );
}

#[test]
fn rejects_code_hosts_placeholders_and_relative_paths() {
    assert_eq!(usable_site_url("https://github.com/owner/repo", None), None);
    assert_eq!(usable_site_url("http://localhost:3000", None), None);
    assert_eq!(usable_site_url("https://example.com", None), None);
    assert_eq!(usable_site_url(".", None), None);
    assert_eq!(usable_site_url("/subpath", None), None);
    assert_eq!(usable_site_url("", None), None);
}

#[test]
fn accepts_real_sites_including_pages_hosts() {
    assert_eq!(
        usable_site_url("https://my-transfer.com.ua", None).as_deref(),
        Some("https://my-transfer.com.ua")
    );
    // github.io is a website even though github.com is not.
    assert_eq!(
        usable_site_url("https://spiriturban.github.io/books-online/", None).as_deref(),
        Some("https://spiriturban.github.io/books-online")
    );
    assert_eq!(
        usable_site_url("  \"https://site.dev\"  ", None).as_deref(),
        Some("https://site.dev")
    );
}

#[test]
fn reads_the_site_url_out_of_an_env_file() {
    let fixture = Fixture::new("env");
    fixture.write("package.json", r#"{"name":"app"}"#).write(
        ".env",
        "# (old host) FTP_SITE_URL=https://vitaliy-dev.tech\n\
         SECRET_TOKEN=abc123\n\
         FTP_SITE_URL=https://my-transfer.com.ua\n",
    );

    let found = find_website_url(fixture.path(), None).expect("should detect the site");
    assert_eq!(found.url, "https://my-transfer.com.ua");
    assert!(found.source.contains(".env"));
}

#[test]
fn never_mistakes_an_infrastructure_url_for_the_site() {
    // SUPABASE_URL and DATABASE_URL both end with the string "BASE_URL"; matching
    // by suffix rather than by segment surfaced a backend endpoint as the site.
    let fixture = Fixture::new("infra");
    fixture.write("package.json", r#"{"name":"app"}"#).write(
        ".env.local",
        "NEXT_PUBLIC_SUPABASE_URL=https://lrodjzakzfqgdcjazdty.supabase.co\n\
         DATABASE_URL=https://user:secret@db.example-host.dev/app\n\
         SENTRY_URL=https://sentry.example-host.dev\n\
         API_URL=https://api.example-host.dev\n",
    );

    assert!(find_website_url(fixture.path(), None).is_none());
}

#[test]
fn still_accepts_a_site_url_alongside_infrastructure_keys() {
    let fixture = Fixture::new("infra-mixed");
    fixture.write("package.json", r#"{"name":"app"}"#).write(
        ".env.local",
        "NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co\n\
         NEXT_PUBLIC_APP_URL=https://real-site.example-host.dev\n",
    );

    let found = find_website_url(fixture.path(), None).expect("should detect the site");
    assert_eq!(found.url, "https://real-site.example-host.dev");
}

#[test]
fn rejects_urls_carrying_credentials() {
    assert_eq!(
        usable_site_url("https://admin:hunter2@internal.example-host.dev", None),
        None
    );
}

#[test]
fn rejects_managed_backend_hosts_under_any_key() {
    // Even a correctly-named key must not yield a database endpoint.
    let fixture = Fixture::new("infra-host");
    fixture.write("package.json", r#"{"name":"app"}"#).write(
        ".env",
        "NEXT_PUBLIC_SITE_URL=https://lrodjzakzfqgdcjazdty.supabase.co\n",
    );

    assert!(find_website_url(fixture.path(), None).is_none());
    assert_eq!(usable_site_url("https://project.supabase.co", None), None);
    assert_eq!(usable_site_url("https://cluster.mongodb.net", None), None);
    assert_eq!(usable_site_url("https://org.sentry.io", None), None);
}

#[test]
fn ignores_commented_and_localhost_env_values() {
    let fixture = Fixture::new("env-noise");
    fixture
        .write("package.json", r#"{"name":"app"}"#)
        .write(".env.example", "NEXT_PUBLIC_SITE_URL=http://localhost:3000\n")
        .write(".env", "# NEXT_PUBLIC_SITE_URL=https://commented-out.dev\n");

    assert!(find_website_url(fixture.path(), None).is_none());
}

#[test]
fn prefers_a_custom_domain_over_everything_else() {
    let fixture = Fixture::new("cname");
    fixture
        .write("CNAME", "my-transfer.com.ua\n")
        .write(".env", "SITE_URL=https://staging.example-app.dev\n")
        .write("package.json", r#"{"homepage":"https://other.dev"}"#);

    let found = find_website_url(fixture.path(), None).expect("should detect the site");
    assert_eq!(found.url, "https://my-transfer.com.ua");
    assert_eq!(found.source, "CNAME");
}

#[test]
fn finds_the_site_declared_in_a_nested_app() {
    let fixture = Fixture::new("monorepo");
    fixture
        .write("package.json", r#"{"name":"root","private":true}"#)
        .write("apps/web/package.json", r#"{"homepage":"https://app.example-site.dev"}"#);

    let found = find_website_url(fixture.path(), None).expect("should detect the site");
    assert_eq!(found.url, "https://app.example-site.dev");
    assert!(found.source.starts_with("apps/web/"));
}

#[test]
fn reads_the_site_key_out_of_a_framework_config() {
    let fixture = Fixture::new("astro");
    fixture.write("package.json", r#"{"name":"app"}"#).write(
        "astro.config.mjs",
        "export default defineConfig({\n  site: 'https://docs.example-site.dev',\n  base: '/',\n});\n",
    );

    let found = find_website_url(fixture.path(), None).expect("should detect the site");
    assert_eq!(found.url, "https://docs.example-site.dev");
    assert!(found.source.contains("astro.config.mjs"));
}

#[test]
fn returns_nothing_when_the_project_declares_no_site() {
    let fixture = Fixture::new("bare");
    fixture.write("package.json", r#"{"name":"lib","version":"1.0.0"}"#);

    assert!(find_website_url(fixture.path(), None).is_none());
}
