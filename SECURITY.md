# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Principles in Git Manager

- **Local Storage Only**: All project paths, local database items, and user preferences are strictly stored locally in SQLite within your user application data folder.
- **No Unsanitized Shell Execution**: Execution of code editors, terminal emulators, and browsers uses strict binary parameter arrays rather than string concatenation or shell execution.
- **Strict Protocol Validation**: Only `http` and `https` URL protocols are allowed to be opened in external web browsers.
- **Signed Updates**: Every release bundle is signed with an Ed25519 key, and the installed app refuses any update whose signature does not match the public key compiled into it. This is independent of Windows Authenticode and Apple notarization, which the project does not currently have — see [docs/UNSIGNED_BUILDS.md](docs/UNSIGNED_BUILDS.md).

## Reporting a Vulnerability

If you discover a security vulnerability within Git Manager, please do not report it in public issues. Send a detailed vulnerability report to the repository maintainers via GitHub private security advisories or directly to the repository administrator.
