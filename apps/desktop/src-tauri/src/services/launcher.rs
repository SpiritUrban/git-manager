use std::path::Path;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NEW_CONSOLE: u32 = 0x00000010;

/// Editors ship a `.cmd` shim on Windows — `code.cmd`, `cursor.cmd` — but Rust
/// only appends `.exe` when it searches PATH, so spawning the bare name fails
/// with "program not found" even though the editor is installed and on PATH.
pub fn windows_shim_candidates(program: &str) -> Vec<String> {
    if cfg!(target_os = "windows") {
        vec![format!("{program}.cmd"), format!("{program}.bat")]
    } else {
        Vec::new()
    }
}

/// Runs `program`, and on Windows retries the shim names when the executable
/// itself was not found. Any other failure is reported as-is rather than
/// retried, so a permission or crash error is not disguised as a missing tool.
fn spawn_program(program: &str, args: &[String]) -> std::io::Result<()> {
    let attempt = |name: &str| Command::new(name).args(args).spawn().map(|_| ());

    match attempt(program) {
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            for candidate in windows_shim_candidates(program) {
                if let Ok(()) = attempt(&candidate) {
                    return Ok(());
                }
            }
            Err(err)
        }
        other => other,
    }
}

pub fn launch_editor(
    profile: &str,
    custom_exec: &str,
    custom_args: &[String],
    target_path: &str,
) -> Result<(), String> {
    let path_obj = Path::new(target_path);
    if !path_obj.exists() {
        return Err(format!("Target directory does not exist: {}", target_path));
    }

    let (program, label) = match profile {
        "code-insiders" => ("code-insiders", "VS Code Insiders"),
        "cursor" => ("cursor", "Cursor"),
        "custom" => {
            if custom_exec.trim().is_empty() {
                return Err("Custom editor executable is not configured.".to_string());
            }
            (custom_exec, "custom editor")
        }
        // "code" and anything unrecognised fall back to VS Code.
        _ => ("code", "VS Code"),
    };

    let args: Vec<String> = if profile == "custom" && !custom_args.is_empty() {
        custom_args
            .iter()
            .map(|arg| arg.replace("{path}", target_path))
            .collect()
    } else {
        vec![target_path.to_string()]
    };

    spawn_program(program, &args)
        .map_err(|e| format!("Failed to launch {} ({}): {}", label, program, e))
}

pub fn launch_terminal(
    profile: &str,
    custom_exec: &str,
    custom_args: &[String],
    target_path: &str,
) -> Result<(), String> {
    let path_obj = Path::new(target_path);
    if !path_obj.exists() {
        return Err(format!("Target directory does not exist: {}", target_path));
    }

    #[cfg(target_os = "windows")]
    {
        match profile {
            "wt" | "auto" => {
                let wt_res = Command::new("cmd.exe")
                    .creation_flags(CREATE_NEW_CONSOLE)
                    .arg("/c")
                    .arg("start")
                    .arg("")
                    .arg("wt.exe")
                    .arg("-d")
                    .arg(target_path)
                    .spawn();

                if wt_res.is_ok() {
                    return Ok(());
                }

                Command::new("powershell.exe")
                    .creation_flags(CREATE_NEW_CONSOLE)
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!("Set-Location -LiteralPath '{}'", target_path))
                    .spawn()
                    .map_err(|e| format!("Failed to launch terminal: {}", e))?;
            }
            "powershell" => {
                Command::new("powershell.exe")
                    .creation_flags(CREATE_NEW_CONSOLE)
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!("Set-Location -LiteralPath '{}'", target_path))
                    .spawn()
                    .map_err(|e| format!("Failed to launch PowerShell: {}", e))?;
            }
            "cmd" => {
                Command::new("cmd.exe")
                    .creation_flags(CREATE_NEW_CONSOLE)
                    .arg("/k")
                    .arg(format!("cd /d \"{}\"", target_path))
                    .spawn()
                    .map_err(|e| format!("Failed to launch CMD: {}", e))?;
            }
            "custom" => {
                if custom_exec.trim().is_empty() {
                    return Err("Custom terminal executable is not configured.".to_string());
                }
                let mut cmd = Command::new(custom_exec);
                cmd.creation_flags(CREATE_NEW_CONSOLE);
                cmd.current_dir(target_path);
                for arg in custom_args {
                    cmd.arg(arg.replace("{path}", target_path));
                }
                cmd.spawn().map_err(|e| {
                    format!("Failed to launch custom terminal ({}) : {}", custom_exec, e)
                })?;
            }
            _ => {
                Command::new("powershell.exe")
                    .creation_flags(CREATE_NEW_CONSOLE)
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!("Set-Location -LiteralPath '{}'", target_path))
                    .spawn()
                    .map_err(|e| format!("Failed to launch terminal: {}", e))?;
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        match profile {
            "iterm" => {
                Command::new("open")
                    .arg("-a")
                    .arg("iTerm")
                    .arg(target_path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch iTerm: {}", e))?;
            }
            "custom" => {
                if custom_exec.trim().is_empty() {
                    return Err("Custom terminal executable is not configured.".to_string());
                }
                let mut cmd = Command::new(custom_exec);
                cmd.current_dir(target_path);
                for arg in custom_args {
                    cmd.arg(arg.replace("{path}", target_path));
                }
                cmd.spawn()
                    .map_err(|e| format!("Failed to launch custom terminal: {}", e))?;
            }
            _ => {
                Command::new("open")
                    .arg("-a")
                    .arg("Terminal")
                    .arg(target_path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch Terminal: {}", e))?;
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        match profile {
            "konsole" => {
                Command::new("konsole")
                    .arg("--workdir")
                    .arg(target_path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch Konsole: {}", e))?;
            }
            "kitty" => {
                Command::new("kitty")
                    .arg("--directory")
                    .arg(target_path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch Kitty: {}", e))?;
            }
            "alacritty" => {
                Command::new("alacritty")
                    .arg("--working-directory")
                    .arg(target_path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch Alacritty: {}", e))?;
            }
            "custom" => {
                if custom_exec.trim().is_empty() {
                    return Err("Custom terminal executable is not configured.".to_string());
                }
                let mut cmd = Command::new(custom_exec);
                cmd.current_dir(target_path);
                for arg in custom_args {
                    cmd.arg(arg.replace("{path}", target_path));
                }
                cmd.spawn()
                    .map_err(|e| format!("Failed to launch custom terminal: {}", e))?;
            }
            _ => {
                Command::new("gnome-terminal")
                    .arg("--working-directory")
                    .arg(target_path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch gnome-terminal: {}", e))?;
            }
        }
    }

    Ok(())
}

pub fn launch_dev_server(
    profile: &str,
    custom_exec: &str,
    custom_args: &[String],
    target_path: &str,
) -> Result<(), String> {
    let path_obj = Path::new(target_path);
    if !path_obj.exists() {
        return Err(format!("Target directory does not exist: {}", target_path));
    }

    // The macOS and Linux paths below always use the system terminal, so the
    // profile and custom-command settings only take effect on Windows for now.
    #[cfg(not(target_os = "windows"))]
    let _ = (profile, custom_exec, custom_args);

    // Determine package manager dev command from lockfiles or package.json
    let dev_cmd = if path_obj.join("pnpm-lock.yaml").exists() {
        "pnpm dev"
    } else if path_obj.join("yarn.lock").exists() {
        "yarn dev"
    } else if path_obj.join("bun.lockb").exists() || path_obj.join("bun.lock").exists() {
        "bun run dev"
    } else {
        "npm run dev"
    };

    #[cfg(target_os = "windows")]
    {
        match profile {
            "wt" | "auto" => {
                let wt_res = Command::new("cmd.exe")
                    .creation_flags(CREATE_NEW_CONSOLE)
                    .arg("/c")
                    .arg("start")
                    .arg("")
                    .arg("wt.exe")
                    .arg("-d")
                    .arg(target_path)
                    .arg("powershell.exe")
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(dev_cmd)
                    .spawn();

                if wt_res.is_ok() {
                    return Ok(());
                }

                Command::new("powershell.exe")
                    .creation_flags(CREATE_NEW_CONSOLE)
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!(
                        "Set-Location -LiteralPath '{}'; {}",
                        target_path, dev_cmd
                    ))
                    .spawn()
                    .map_err(|e| format!("Failed to launch dev server: {}", e))?;
            }
            "powershell" => {
                Command::new("powershell.exe")
                    .creation_flags(CREATE_NEW_CONSOLE)
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!(
                        "Set-Location -LiteralPath '{}'; {}",
                        target_path, dev_cmd
                    ))
                    .spawn()
                    .map_err(|e| format!("Failed to launch dev server: {}", e))?;
            }
            "cmd" => {
                Command::new("cmd.exe")
                    .creation_flags(CREATE_NEW_CONSOLE)
                    .arg("/k")
                    .arg(format!("cd /d \"{}\" && {}", target_path, dev_cmd))
                    .spawn()
                    .map_err(|e| format!("Failed to launch dev server: {}", e))?;
            }
            "custom" => {
                if custom_exec.trim().is_empty() {
                    return Err("Custom terminal executable is not configured.".to_string());
                }
                let mut cmd = Command::new(custom_exec);
                cmd.creation_flags(CREATE_NEW_CONSOLE);
                cmd.current_dir(target_path);
                for arg in custom_args {
                    cmd.arg(arg.replace("{path}", target_path));
                }
                cmd.spawn()
                    .map_err(|e| format!("Failed to launch custom dev server: {}", e))?;
            }
            _ => {
                Command::new("powershell.exe")
                    .creation_flags(CREATE_NEW_CONSOLE)
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!(
                        "Set-Location -LiteralPath '{}'; {}",
                        target_path, dev_cmd
                    ))
                    .spawn()
                    .map_err(|e| format!("Failed to launch dev server: {}", e))?;
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "tell application \"Terminal\" to do script \"cd \\\"{}\\\" && {}\"",
            target_path, dev_cmd
        );
        Command::new("osascript")
            .arg("-e")
            .arg(script)
            .spawn()
            .map_err(|e| format!("Failed to launch dev server: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("gnome-terminal")
            .arg("--working-directory")
            .arg(target_path)
            .arg("--")
            .arg("bash")
            .arg("-c")
            .arg(format!("{}; exec bash", dev_cmd))
            .spawn()
            .map_err(|e| format!("Failed to launch dev server: {}", e))?;
    }

    Ok(())
}

pub fn open_folder(target_path: &str) -> Result<(), String> {
    let path_obj = Path::new(target_path);
    if !path_obj.exists() {
        return Err(format!("Target directory does not exist: {}", target_path));
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg(target_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(target_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(target_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}
