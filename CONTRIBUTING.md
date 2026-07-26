# Contributing to Git Manager

Thank you for considering contributing to **Git Manager**!

## Development Guidelines

1. **Monorepo Architecture**: Use `pnpm` workspaces for package management. Do not install global dependencies or modify root configs unnecessarily.
2. **Code Quality**: Ensure all code passes formatting, typechecking, Vitest TypeScript tests, and Rust Cargo tests before opening a pull request:
   ```bash
   pnpm check
   ```
   CI additionally runs `cargo fmt --check` and `cargo clippy -- -D warnings`, so run
   `cargo fmt` before pushing and treat every clippy warning as an error. Note that code inside
   `#[cfg(target_os = "...")]` blocks is only compiled on that platform: a Windows-only change
   can still fail the Linux CI job.
3. **Committed Lockfiles**: Both `pnpm-lock.yaml` and `apps/desktop/src-tauri/Cargo.lock` are
   tracked on purpose. The Tauri CLI reads `Cargo.lock` to check that Rust crate and npm package
   versions match, and builds fail without it. Never add it to `.gitignore`.
4. **Commit Messages**: Follow standard conventional commits format (e.g. `feat: add custom icon upload`, `fix: path normalization on Windows`).
5. **Rust Native Safety**: Ensure all native commands validate input paths, prevent command line injection, and do not block the UI thread.
6. **No Telemetry**: Respect user privacy. No tracking, analytics, or external phone-home requests are allowed.

## Submitting Pull Requests

1. Fork the repository and create your feature branch from `main`.
2. Add comprehensive tests for new logic.
3. Submit your PR and describe the changes made.
