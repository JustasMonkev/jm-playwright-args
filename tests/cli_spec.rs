//! Feature: the pw-args CLI (port of tests/cli.spec.ts)
//!   Parses custom args, resolves Playwright and forwards the exit code.
//!
//! The `isCliEntry` scenarios are not ported: a Rust binary is always its
//! own entrypoint, so the import-vs-execute distinction does not exist.

#[macro_use]
mod common;

use common::strings;
use jm_playwright_args::cli::{run_cli, CliOptions, PACKAGE_VERSION};
use jm_playwright_args::env::ENV_KEY;
use jm_playwright_args::run_playwright::RunOptions;
use std::collections::HashMap;

fn tenant_env() -> HashMap<String, String> {
    HashMap::from([(ENV_KEY.to_string(), r#"{"tenant":"acme"}"#.to_string())])
}

#[test]
fn parses_custom_args_resolves_playwright_and_returns_child_exit_code() {
    // Given a fake Playwright runner that exits with code 7
    let mut calls: Vec<RunOptions> = vec![];
    let mut runner = |options: RunOptions| -> Result<i32, String> {
        calls.push(options);
        Ok(7)
    };
    let exists = |_: &str| false;

    // When the CLI runs with custom and Playwright args
    let exit_code = run_cli(CliOptions {
        argv: Some(strings(&["--tenant=acme", "--", "test", "--project=chromium"])),
        cwd: Some("/repo"),
        exists: Some(&exists),
        run_playwright: Some(&mut runner),
        ..Default::default()
    });

    // Then the child exit code is returned and Playwright got the encoded env
    assert_eq!(exit_code, Ok(7));
    assert_eq!(
        calls,
        vec![RunOptions {
            bin: "playwright".to_string(),
            args: strings(&["test", "--project=chromium"]),
            env: tenant_env(),
            base_env: None,
        }]
    );
}

#[test]
fn defaults_to_playwright_test_when_no_forwarded_command_is_present() {
    // Given a fake Playwright runner
    let mut calls: Vec<RunOptions> = vec![];
    let mut runner = |options: RunOptions| -> Result<i32, String> {
        calls.push(options);
        Ok(0)
    };
    let exists = |_: &str| false;

    // When the CLI runs without a delimiter
    run_cli(CliOptions {
        argv: Some(strings(&["--tenant=acme"])),
        cwd: Some("/repo"),
        exists: Some(&exists),
        run_playwright: Some(&mut runner),
        ..Default::default()
    })
    .unwrap();

    // Then the Playwright command defaults to `test`
    assert_eq!(calls[0].args, strings(&["test"]));
}

#[test]
fn uses_node_to_run_the_local_playwright_cli_on_windows() {
    // Given a windows project with a local playwright cli.js
    let mut calls: Vec<RunOptions> = vec![];
    let mut runner = |options: RunOptions| -> Result<i32, String> {
        calls.push(options);
        Ok(0)
    };
    let exists = |path: &str| path == "C:\\repo/node_modules/playwright/cli.js";

    // When the CLI runs
    run_cli(CliOptions {
        argv: Some(strings(&["--tenant=acme", "--", "test", "--grep", "smoke|checkout"])),
        cwd: Some("C:\\repo"),
        exists: Some(&exists),
        node_path: Some("C:\\node\\node.exe"),
        platform: Some("win32"),
        run_playwright: Some(&mut runner),
        ..Default::default()
    })
    .unwrap();

    // Then node runs the cli.js with the forwarded args
    assert_eq!(
        calls,
        vec![RunOptions {
            bin: "C:\\node\\node.exe".to_string(),
            args: strings(&["C:\\repo/node_modules/playwright/cli.js", "test", "--grep", "smoke|checkout"]),
            env: tenant_env(),
            base_env: None,
        }]
    );
}

#[test]
fn prints_help_and_skips_playwright_when_help_is_passed() {
    // Given a fake runner and a captured stdout
    let mut ran = false;
    let mut runner = |_: RunOptions| -> Result<i32, String> {
        ran = true;
        Ok(0)
    };
    let mut lines: Vec<String> = vec![];
    let mut stdout = |line: &str| lines.push(line.to_string());

    // When the CLI runs with --help
    let exit_code = run_cli(CliOptions {
        argv: Some(strings(&["--help"])),
        run_playwright: Some(&mut runner),
        stdout: Some(&mut stdout),
        ..Default::default()
    });

    // Then it prints usage and never starts Playwright
    assert_eq!(exit_code, Ok(0));
    assert!(!ran);
    assert!(lines[0].contains("Usage: pw-args"));
}

#[test]
fn prints_version_and_skips_playwright_when_version_is_passed() {
    // Given a fake runner and a captured stdout
    let mut ran = false;
    let mut runner = |_: RunOptions| -> Result<i32, String> {
        ran = true;
        Ok(0)
    };
    let mut lines: Vec<String> = vec![];
    let mut stdout = |line: &str| lines.push(line.to_string());

    // When the CLI runs with --version
    let exit_code = run_cli(CliOptions {
        argv: Some(strings(&["--version"])),
        run_playwright: Some(&mut runner),
        stdout: Some(&mut stdout),
        ..Default::default()
    });

    // Then it prints the package version and never starts Playwright
    assert_eq!(exit_code, Ok(0));
    assert!(!ran);
    assert_eq!(lines, vec![PACKAGE_VERSION.to_string()]);
}

#[test]
fn forwards_help_and_version_flags_after_the_delimiter_to_playwright() {
    // Given a fake runner and a captured stdout
    let mut calls: Vec<RunOptions> = vec![];
    let mut runner = |options: RunOptions| -> Result<i32, String> {
        calls.push(options);
        Ok(0)
    };
    let mut lines: Vec<String> = vec![];
    let mut stdout = |line: &str| lines.push(line.to_string());
    let exists = |_: &str| false;

    // When --help and --version appear after the delimiter
    for flag in ["--help", "--version"] {
        run_cli(CliOptions {
            argv: Some(strings(&["--tenant=acme", "--", "test", flag])),
            cwd: Some("/repo"),
            exists: Some(&exists),
            run_playwright: Some(&mut runner),
            stdout: Some(&mut stdout),
            ..Default::default()
        })
        .unwrap();
    }

    // Then nothing is printed and the flags reach Playwright unchanged
    assert!(lines.is_empty());
    assert_eq!(calls[0].args, strings(&["test", "--help"]));
    assert_eq!(calls[1].args, strings(&["test", "--version"]));
}
