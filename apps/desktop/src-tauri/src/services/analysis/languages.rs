/// Comment syntax family used by the line classifier.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommentStyle {
    /// `//` line comments, `/* */` blocks — C, Rust, JS, Java, Go, ...
    CFamily,
    /// `#` line comments, no blocks worth tracking — Python, Ruby, shell, YAML.
    Hash,
    /// `--` line comments, `--[[ ]]` blocks — SQL, Lua, Haskell.
    Dash,
    /// `<!-- -->` blocks only — HTML, XML, Markdown.
    Markup,
    /// No comment concept — JSON, plain text, lockfiles.
    None,
}

pub struct LanguageSpec {
    pub name: &'static str,
    pub comment: CommentStyle,
    /// Source code, as opposed to config/markup/data. Only code counts toward
    /// the "code lines" headline and the hotspot metric.
    pub is_code: bool,
}

const fn lang(name: &'static str, comment: CommentStyle, is_code: bool) -> LanguageSpec {
    LanguageSpec {
        name,
        comment,
        is_code,
    }
}

/// Extension -> language. Ordered roughly by how often it shows up in the wild;
/// lookup is a linear scan over a small table, which is cheaper than a hash map
/// at this size.
const BY_EXTENSION: &[(&str, LanguageSpec)] = &[
    ("ts", lang("TypeScript", CommentStyle::CFamily, true)),
    ("tsx", lang("TypeScript", CommentStyle::CFamily, true)),
    ("mts", lang("TypeScript", CommentStyle::CFamily, true)),
    ("cts", lang("TypeScript", CommentStyle::CFamily, true)),
    ("js", lang("JavaScript", CommentStyle::CFamily, true)),
    ("jsx", lang("JavaScript", CommentStyle::CFamily, true)),
    ("mjs", lang("JavaScript", CommentStyle::CFamily, true)),
    ("cjs", lang("JavaScript", CommentStyle::CFamily, true)),
    ("rs", lang("Rust", CommentStyle::CFamily, true)),
    ("py", lang("Python", CommentStyle::Hash, true)),
    ("pyi", lang("Python", CommentStyle::Hash, true)),
    ("go", lang("Go", CommentStyle::CFamily, true)),
    ("java", lang("Java", CommentStyle::CFamily, true)),
    ("kt", lang("Kotlin", CommentStyle::CFamily, true)),
    ("kts", lang("Kotlin", CommentStyle::CFamily, true)),
    ("swift", lang("Swift", CommentStyle::CFamily, true)),
    ("c", lang("C", CommentStyle::CFamily, true)),
    ("h", lang("C", CommentStyle::CFamily, true)),
    ("cpp", lang("C++", CommentStyle::CFamily, true)),
    ("cc", lang("C++", CommentStyle::CFamily, true)),
    ("cxx", lang("C++", CommentStyle::CFamily, true)),
    ("hpp", lang("C++", CommentStyle::CFamily, true)),
    ("cs", lang("C#", CommentStyle::CFamily, true)),
    ("php", lang("PHP", CommentStyle::CFamily, true)),
    ("rb", lang("Ruby", CommentStyle::Hash, true)),
    ("dart", lang("Dart", CommentStyle::CFamily, true)),
    ("ex", lang("Elixir", CommentStyle::Hash, true)),
    ("exs", lang("Elixir", CommentStyle::Hash, true)),
    ("scala", lang("Scala", CommentStyle::CFamily, true)),
    ("hs", lang("Haskell", CommentStyle::Dash, true)),
    ("lua", lang("Lua", CommentStyle::Dash, true)),
    ("zig", lang("Zig", CommentStyle::CFamily, true)),
    ("vue", lang("Vue", CommentStyle::Markup, true)),
    ("svelte", lang("Svelte", CommentStyle::Markup, true)),
    ("astro", lang("Astro", CommentStyle::Markup, true)),
    ("sh", lang("Shell", CommentStyle::Hash, true)),
    ("bash", lang("Shell", CommentStyle::Hash, true)),
    ("zsh", lang("Shell", CommentStyle::Hash, true)),
    ("fish", lang("Shell", CommentStyle::Hash, true)),
    ("ps1", lang("PowerShell", CommentStyle::Hash, true)),
    ("psm1", lang("PowerShell", CommentStyle::Hash, true)),
    ("bat", lang("Batch", CommentStyle::None, true)),
    ("cmd", lang("Batch", CommentStyle::None, true)),
    ("sql", lang("SQL", CommentStyle::Dash, true)),
    ("prisma", lang("Prisma", CommentStyle::CFamily, true)),
    ("graphql", lang("GraphQL", CommentStyle::Hash, true)),
    ("gql", lang("GraphQL", CommentStyle::Hash, true)),
    ("proto", lang("Protobuf", CommentStyle::CFamily, true)),
    ("css", lang("CSS", CommentStyle::CFamily, false)),
    ("scss", lang("SCSS", CommentStyle::CFamily, false)),
    ("sass", lang("SCSS", CommentStyle::CFamily, false)),
    ("less", lang("Less", CommentStyle::CFamily, false)),
    ("html", lang("HTML", CommentStyle::Markup, false)),
    ("htm", lang("HTML", CommentStyle::Markup, false)),
    ("xml", lang("XML", CommentStyle::Markup, false)),
    ("svg", lang("SVG", CommentStyle::Markup, false)),
    ("md", lang("Markdown", CommentStyle::Markup, false)),
    ("mdx", lang("Markdown", CommentStyle::Markup, false)),
    ("rst", lang("reStructuredText", CommentStyle::None, false)),
    ("txt", lang("Text", CommentStyle::None, false)),
    ("json", lang("JSON", CommentStyle::None, false)),
    ("jsonc", lang("JSON", CommentStyle::CFamily, false)),
    ("yaml", lang("YAML", CommentStyle::Hash, false)),
    ("yml", lang("YAML", CommentStyle::Hash, false)),
    ("toml", lang("TOML", CommentStyle::Hash, false)),
    ("ini", lang("INI", CommentStyle::Hash, false)),
    ("env", lang("Dotenv", CommentStyle::Hash, false)),
    ("csv", lang("CSV", CommentStyle::None, false)),
];

/// Whole filenames that carry more signal than their extension.
const BY_FILENAME: &[(&str, LanguageSpec)] = &[
    ("dockerfile", lang("Dockerfile", CommentStyle::Hash, false)),
    ("makefile", lang("Makefile", CommentStyle::Hash, false)),
    ("gemfile", lang("Ruby", CommentStyle::Hash, true)),
    ("rakefile", lang("Ruby", CommentStyle::Hash, true)),
    (".gitignore", lang("Config", CommentStyle::Hash, false)),
    (".gitattributes", lang("Config", CommentStyle::Hash, false)),
    (".editorconfig", lang("Config", CommentStyle::Hash, false)),
    (".npmrc", lang("Config", CommentStyle::Hash, false)),
    ("license", lang("Text", CommentStyle::None, false)),
];

/// Extensions that are always binary/asset — never opened for line counting.
const BINARY_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "webp", "avif", "ico", "icns", "bmp", "tiff", "psd", "ai", "mp3",
    "wav", "ogg", "flac", "m4a", "mp4", "mov", "avi", "mkv", "webm", "woff", "woff2", "ttf", "otf",
    "eot", "zip", "gz", "tar", "rar", "7z", "bz2", "xz", "pdf", "doc", "docx", "xls", "xlsx",
    "ppt", "pptx", "exe", "dll", "so", "dylib", "bin", "dat", "db", "sqlite", "sqlite3", "wasm",
    "pyc", "class", "jar", "o", "a", "lib", "pdb", "node",
];

pub enum Classification {
    Text(&'static LanguageSpec),
    Binary(&'static str),
}

/// Classifies a file by name. Returns the language spec for text files, or the
/// asset bucket name for binaries.
pub fn classify(file_name: &str) -> Classification {
    let lower = file_name.to_ascii_lowercase();

    if let Some((_, spec)) = BY_FILENAME.iter().find(|(n, _)| *n == lower) {
        return Classification::Text(spec);
    }

    let ext = lower.rsplit_once('.').map(|(_, e)| e).unwrap_or("");

    if BINARY_EXTENSIONS.contains(&ext) {
        return Classification::Binary(asset_bucket(ext));
    }

    if let Some((_, spec)) = BY_EXTENSION.iter().find(|(e, _)| *e == ext) {
        return Classification::Text(spec);
    }

    // `.gitignore`-style dotfiles land here with ext == the whole name.
    if lower.starts_with('.') && !lower[1..].contains('.') {
        const DOTFILE: LanguageSpec = lang("Config", CommentStyle::Hash, false);
        return Classification::Text(&DOTFILE);
    }

    Classification::Binary("Other")
}

fn asset_bucket(ext: &str) -> &'static str {
    match ext {
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "avif" | "ico" | "icns" | "bmp" | "tiff"
        | "psd" | "ai" => "Images",
        "mp3" | "wav" | "ogg" | "flac" | "m4a" => "Audio",
        "mp4" | "mov" | "avi" | "mkv" | "webm" => "Video",
        "woff" | "woff2" | "ttf" | "otf" | "eot" => "Fonts",
        "zip" | "gz" | "tar" | "rar" | "7z" | "bz2" | "xz" => "Archives",
        "pdf" | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" => "Documents",
        _ => "Binaries",
    }
}

/// Splits a text file into blank / comment / code lines. The comment tracking is
/// deliberately shallow — it does not parse strings, so a `//` inside a literal
/// counts as a comment. Good enough for a ratio, cheap enough for a whole repo.
pub fn count_lines(content: &str, style: CommentStyle) -> (usize, usize, usize) {
    let mut blanks = 0usize;
    let mut comments = 0usize;
    let mut code = 0usize;
    let mut in_block = false;

    let (block_open, block_close, line_prefixes): (&str, &str, &[&str]) = match style {
        CommentStyle::CFamily => ("/*", "*/", &["//"]),
        CommentStyle::Hash => ("", "", &["#"]),
        CommentStyle::Dash => ("--[[", "]]", &["--"]),
        CommentStyle::Markup => ("<!--", "-->", &[]),
        CommentStyle::None => ("", "", &[]),
    };

    for raw in content.lines() {
        let line = raw.trim();

        if line.is_empty() {
            blanks += 1;
            continue;
        }

        if in_block {
            comments += 1;
            if !block_close.is_empty() && line.contains(block_close) {
                in_block = false;
            }
            continue;
        }

        if !block_open.is_empty() && line.starts_with(block_open) {
            comments += 1;
            if !line.contains(block_close) {
                in_block = true;
            }
            continue;
        }

        if line_prefixes.iter().any(|p| line.starts_with(p)) {
            comments += 1;
            continue;
        }

        code += 1;
    }

    (code, comments, blanks)
}

/// Counts TODO/FIXME/HACK/XXX markers — a rough debt signal.
pub fn count_todo_markers(content: &str) -> usize {
    const MARKERS: [&str; 4] = ["TODO", "FIXME", "HACK", "XXX"];
    content
        .lines()
        .filter(|line| MARKERS.iter().any(|m| line.contains(m)))
        .count()
}
