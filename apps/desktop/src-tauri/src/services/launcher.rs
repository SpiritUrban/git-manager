use std::process::Command;
use std::path::Path;

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

    match profile {
        "code" => {
            Command::new("code")
                .arg(target_path)
                .spawn()
                .map_err(|e| format!("Failed to launch VS Code: {}", e))?;
        }
        "code-insiders" => {
            Command::new("code-insiders")
                .arg(target_path)
                .spawn()
                .map_err(|e| format!("Failed to launch VS Code Insiders: {}", e))?;
        }
        "cursor" => {
            Command::new("cursor")
                .arg(target_path)
                .spawn()
                .map_err(|e| format!("Failed to launch Cursor: {}", e))?;
        }
        "custom" => {
            if custom_exec.trim().is_empty() {
                return Err("Custom editor executable is not configured.".to_string());
            }
            let mut cmd = Command::new(custom_exec);
            if custom_args.is_empty() {
                cmd.arg(target_path);
            } else {
                for arg in custom_args {
                    let replaced = arg.replace("{path}", target_path);
                    cmd.arg(replaced);
                }
            }
            cmd.spawn()
                .map_err(|e| format!("Failed to launch custom editor ({}) : {}", custom_exec, e))?;
        }
        _ => {
            // Default fallback to VS Code
            Command::new("code")
                .arg(target_path)
                .spawn()
                .map_err(|e| format!("Failed to launch default editor: {}", e))?;
        }
    }

    Ok(())
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
                let res = Command::new("wt.exe")
                    .arg("-d")
                    .arg(target_path)
                    .spawn();
                if res.is_ok() {
                    return Ok(());
                }
                // Fallback to powershell if wt fails
                Command::new("powershell.exe")
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!("Set-Location -LiteralPath '{}'", target_path))
                    .spawn()
                    .map_err(|e| format!("Failed to launch terminal: {}", e))?;
            }
            "powershell" => {
                Command::new("powershell.exe")
                    .arg("-NoExit")
                    .arg("-Command")
                    .arg(format!("Set-Location -LiteralPath '{}'", target_path))
                    .spawn()
                    .map_err(|e| format!("Failed to launch PowerShell: {}", e))?;
            }
            "cmd" => {
                Command::new("cmd.exe")
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
                cmd.current_dir(target_path);
                for arg in custom_args {
                    cmd.arg(arg.replace("{path}", target_path));
                }
                cmd.spawn()
                    .map_err(|e| format!("Failed to launch custom terminal ({}) : {}", custom_exec, e))?;
            }
            _ => {
                Command::new("wt.exe")
                    .arg("-d")
                    .arg(target_path)
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
