//! Feature: basic example end-to-end (port of tests/integration/basic.spec.ts)
//!   The Rust CLI drives a real `playwright test` run; the example project's
//!   config and test read the tenant through the plain-JS `index.js` reader.
//!
//! Requires `npm install` in the package root; scenarios skip when the
//! Playwright dependencies are absent.
#![cfg(unix)]

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::LazyLock;
use std::time::{SystemTime, UNIX_EPOCH};

static PACKAGE_ROOT: LazyLock<PathBuf> = LazyLock::new(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")));

fn node_env_available() -> bool {
    let available = PACKAGE_ROOT.join("node_modules/@playwright/test").exists();
    if !available {
        eprintln!("skipping: Playwright is not installed (run `npm install` first)");
    }
    available
}

#[test]
fn can_be_required_from_commonjs() {
    // Given the package root (no build step required anymore)
    if !node_env_available() {
        return;
    }
    let script = format!(
        "const api = require('{}'); console.log(typeof api.pwArg.string);",
        PACKAGE_ROOT.display()
    );

    // When the package is loaded through CommonJS require
    let output = Command::new("node").args(["-e", &script]).output().expect("node should spawn");

    // Then the typed reader API is exposed
    assert_eq!(
        String::from_utf8_lossy(&output.stdout).trim(),
        "function",
        "stderr:\n{}",
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn npm_launcher_runs_the_rust_binary() {
    // Given the compiled binary and the npm bin launcher
    if !node_env_available() {
        return;
    }

    // When the launcher is invoked the way npm's .bin shim would run it
    let output = Command::new("node")
        .args(["bin/pw-args.js", "--version"])
        .current_dir(&*PACKAGE_ROOT)
        .output()
        .expect("node should spawn");

    // Then it finds the Rust binary and forwards its output and exit code
    assert!(output.status.success(), "stderr:\n{}", String::from_utf8_lossy(&output.stderr));
    assert_eq!(String::from_utf8_lossy(&output.stdout).trim(), env!("CARGO_PKG_VERSION"));
}

#[test]
fn passes_custom_tenant_into_playwright_config_and_test() {
    // Given the basic example project with Playwright installed
    let Some(project_dir) = create_example_project() else { return };

    // When the CLI forwards a custom tenant to `playwright test`
    let (exit_code, output) = run_pw_args(&project_dir, &["--tenant=acme", "--", "test"]);

    // Then the config and the test both saw the tenant
    assert_eq!(exit_code, 0, "output:\n{output}");
    assert!(output.contains("1 passed"), "output:\n{output}");
}

#[test]
fn defaults_to_playwright_test_in_the_cli() {
    // Given the basic example project with Playwright installed
    let Some(project_dir) = create_example_project() else { return };

    // When the CLI runs without a forwarded command
    let (exit_code, output) = run_pw_args(&project_dir, &["--tenant=acme"]);

    // Then `playwright test` ran by default
    assert_eq!(exit_code, 0, "output:\n{output}");
    assert!(output.contains("1 passed"), "output:\n{output}");
}

fn run_pw_args(project_dir: &Path, args: &[&str]) -> (i32, String) {
    let output = Command::new(env!("CARGO_BIN_EXE_pw-args"))
        .args(args)
        .current_dir(project_dir)
        .output()
        .expect("pw-args should spawn");
    let _ = fs::remove_dir_all(project_dir);

    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    (output.status.code().unwrap_or(1), combined)
}

/// Mirrors `createExampleProject`: copies examples/basic into a temp dir and
/// symlinks this package plus the root Playwright install into node_modules.
fn create_example_project() -> Option<PathBuf> {
    let root = &*PACKAGE_ROOT;
    if !node_env_available() {
        return None;
    }

    let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
    let project_dir = std::env::temp_dir().join(format!("playwright-args-basic-{}-{nanos}", std::process::id()));
    copy_dir(&root.join("examples/basic"), &project_dir).unwrap();

    let node_modules = project_dir.join("node_modules");
    fs::create_dir_all(node_modules.join(".bin")).unwrap();
    fs::create_dir_all(node_modules.join("@playwright")).unwrap();

    let link = std::os::unix::fs::symlink;
    link(root.canonicalize().unwrap(), node_modules.join("jm-playwright-args")).unwrap();
    link(
        root.join("node_modules/@playwright/test").canonicalize().unwrap(),
        node_modules.join("@playwright/test"),
    )
    .unwrap();
    link(
        root.join("node_modules/playwright").canonicalize().unwrap(),
        node_modules.join("playwright"),
    )
    .unwrap();
    link(node_modules.join("@playwright/test/cli.js"), node_modules.join(".bin/playwright")).unwrap();

    Some(project_dir)
}

fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let target = to.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), &target)?;
        }
    }
    Ok(())
}
