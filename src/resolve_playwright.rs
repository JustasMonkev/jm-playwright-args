//! Port of `resolvePlaywright.ts`.

use std::path::{Path, PathBuf};

#[derive(Default)]
pub struct ResolveOptions<'a> {
    pub cwd: Option<&'a str>,
    pub explicit_bin: Option<&'a str>,
    pub exists: Option<&'a dyn Fn(&str) -> bool>,
    pub node_path: Option<&'a str>,
    pub platform: Option<&'a str>,
}

#[derive(Debug, PartialEq)]
pub struct PlaywrightInvocation {
    pub bin: String,
    pub args: Vec<String>,
}

pub fn resolve_playwright_bin(options: &ResolveOptions) -> String {
    resolve_playwright_invocation(options).bin
}

pub fn resolve_playwright_invocation(options: &ResolveOptions) -> PlaywrightInvocation {
    if let Some(bin) = options.explicit_bin {
        return invocation(bin, vec![]);
    }

    let cwd = options
        .cwd
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    let default_exists = |path: &str| Path::new(path).exists();
    let exists = options.exists.unwrap_or(&default_exists);
    let platform = options
        .platform
        .unwrap_or(if cfg!(windows) { "win32" } else { "unix" });

    if platform == "win32" {
        let node = options.node_path.unwrap_or("node");
        for cli in ["node_modules/playwright/cli.js", "node_modules/@playwright/test/cli.js"] {
            let local_cli = join(&cwd, cli);
            if exists(&local_cli) {
                return invocation(node, vec![local_cli]);
            }
        }
        return invocation("playwright", vec![]);
    }

    let local_bin = join(&cwd, "node_modules/.bin/playwright");
    if exists(&local_bin) {
        return invocation(&local_bin, vec![]);
    }

    invocation("playwright", vec![])
}

fn invocation(bin: &str, args: Vec<String>) -> PlaywrightInvocation {
    PlaywrightInvocation { bin: bin.to_string(), args }
}

fn join(cwd: &Path, relative: &str) -> String {
    cwd.join(relative).to_string_lossy().into_owned()
}
