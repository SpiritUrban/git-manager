# Technical Architecture — Git Manager

Git Manager is built as a cross-platform monorepo leveraging **Tauri v2**, **Rust**, **React**, **TypeScript**, **Tailwind CSS**, and **SQLite**.

---

## 🏛️ System Overview

```text
+-------------------------------------------------------------------+
|                        React Frontend (UI)                        |
|   (Zustand Stores, dnd-kit Drag&Drop, Lucide Icons, Design System)|
+-------------------------------------------------------------------+
                                 |  Tauri IPC (Commands & Events)
                                 v
+-------------------------------------------------------------------+
|                        Rust Core Backend                          |
|   (File Traverser, Git/JSON Parsers, Launcher, Favicon Cache)    |
+-------------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------+
|                    SQLite Database (Local)                        |
|       (projects, groups, tags, project_tags, scan_roots, settings)|
+-------------------------------------------------------------------+
```

---

## 🔒 Frontend / Native Boundary

1. **React Responsibility**: Manages UI state, user input forms, active views, optimistic drag-and-drop state, and toast notifications.
2. **Rust Native Responsibility**: Performs multithreaded filesystem traversal, path normalization, Git remote origin extraction, controlled IDE/terminal launching, and safe HTTP reqwest fetching of website icons.
3. **Command Execution Safety**:
   - String concatenation and shell flags (`shell=true`) are strictly forbidden.
   - External executables are launched via structured process calls: `Command::new(exec).args(args_array)`.
   - Web URLs are strictly validated to allow only `http://` and `https://` schemes.

---

## 🗄️ Database Schema & Migrations

Local data persistence is handled via `tauri-plugin-sql` using SQLite (`git_manager.db`).

```sql
CREATE TABLE groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER NOT NULL,
    is_collapsed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    normalized_path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    group_id TEXT,
    manual_position INTEGER NOT NULL DEFAULT 0,
    website_url TEXT,
    repository_url TEXT,
    remote_origin TEXT,
    icon_source TEXT,
    icon_cache_path TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    is_missing INTEGER NOT NULL DEFAULT 0,
    last_opened_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);

CREATE TABLE project_tags (
    project_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (project_id, tag_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE scan_roots (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    normalized_path TEXT NOT NULL UNIQUE,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## 🔍 Scanning Engine

1. **Multithreaded Traversal**: Implemented in Rust using `walkdir` / `ignore` crates.
2. **Directory Filtering**: Automatically skips standard output directories (`node_modules`, `target`, `.next`, `dist`, `build`, etc.) and does not follow symbolic links.
3. **Repository Identification**: A directory is recognized as a Git repository if it contains a `.git` folder or `.git` worktree file.
4. **Metadata Extraction**: Reads `displayName`/`name` and `homepage` from `package.json`, and extracts `[remote "origin"]` URL from `.git/config`.
5. **Missing Project Handling**: Repositories no longer found during rescan are marked as `is_missing = 1` rather than being deleted from the user database.

---

## 🎨 Icon Resolution Pipeline

Icons are determined according to the following priority:
1. Manually assigned custom icon (if set by user).
2. Local favicon found within project folder (`favicon.ico`, `public/favicon.svg`, `src-tauri/icons/icon.png`, etc.).
3. Remote favicon downloaded via Rust `reqwest` client (with 5-second timeout, 2MB size limit, content-type verification, cached in local app cache folder).
4. Fallback 2-letter uppercase initials derived from project name.

---

## 🔮 Future Extension Points

The codebase is structured into feature services to seamlessly integrate future Git actions:
- `services/git.rs` → Extend for `git status`, `git branch`, and uncommitted changes count.
- `commands/git.rs` → IPC handlers for commit/push/pull workflows.
- `components/ProjectCard.tsx` → Render branch badge and worktree diff summaries.
