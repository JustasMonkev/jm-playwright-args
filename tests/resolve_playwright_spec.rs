//! Feature: Playwright resolution (port of tests/resolvePlaywright.spec.ts)
//!   Finds the Playwright binary to invoke, preferring local installs.

use jm_playwright_args::resolve_playwright::{
    resolve_playwright_bin, resolve_playwright_invocation, PlaywrightInvocation, ResolveOptions,
};

fn invocation(bin: &str, args: &[&str]) -> PlaywrightInvocation {
    PlaywrightInvocation {
        bin: bin.to_string(),
        args: args.iter().map(|arg| arg.to_string()).collect(),
    }
}

#[test]
fn returns_the_explicit_path_when_provided() {
    // Given an explicit binary path
    // When the invocation is resolved
    // Then the explicit path is used as-is
    assert_eq!(
        resolve_playwright_invocation(&ResolveOptions {
            explicit_bin: Some("/repo/node_modules/.bin/playwright"),
            ..Default::default()
        }),
        invocation("/repo/node_modules/.bin/playwright", &[])
    );
}

#[test]
fn prefers_local_node_modules_binary_path_under_cwd() {
    // Given a local .bin/playwright under the cwd
    let exists = |path: &str| path == "/repo/node_modules/.bin/playwright";

    // When the invocation is resolved on a unix platform
    // Then the local binary is used
    assert_eq!(
        resolve_playwright_invocation(&ResolveOptions {
            cwd: Some("/repo"),
            exists: Some(&exists),
            platform: Some("darwin"),
            ..Default::default()
        }),
        invocation("/repo/node_modules/.bin/playwright", &[])
    );
}

#[test]
fn runs_the_local_playwright_cli_through_node_on_windows() {
    // Given a local playwright cli.js on windows
    let exists = |path: &str| path == "C:\\repo/node_modules/playwright/cli.js";

    // When the invocation is resolved
    // Then node runs the cli.js directly
    assert_eq!(
        resolve_playwright_invocation(&ResolveOptions {
            cwd: Some("C:\\repo"),
            exists: Some(&exists),
            node_path: Some("C:\\node\\node.exe"),
            platform: Some("win32"),
            ..Default::default()
        }),
        invocation("C:\\node\\node.exe", &["C:\\repo/node_modules/playwright/cli.js"])
    );
}

#[test]
fn falls_back_to_playwright_test_cli_on_windows() {
    // Given only the @playwright/test cli.js on windows
    let exists = |path: &str| path == "C:\\repo/node_modules/@playwright/test/cli.js";

    // When the invocation is resolved
    // Then node runs the @playwright/test cli.js
    assert_eq!(
        resolve_playwright_invocation(&ResolveOptions {
            cwd: Some("C:\\repo"),
            exists: Some(&exists),
            node_path: Some("C:\\node\\node.exe"),
            platform: Some("win32"),
            ..Default::default()
        }),
        invocation("C:\\node\\node.exe", &["C:\\repo/node_modules/@playwright/test/cli.js"])
    );
}

#[test]
fn falls_back_to_playwright_when_no_local_binary_exists() {
    // Given no local install
    let exists = |_: &str| false;

    // When the invocation is resolved
    // Then the bare `playwright` command is used
    assert_eq!(
        resolve_playwright_invocation(&ResolveOptions {
            cwd: Some("/repo"),
            exists: Some(&exists),
            ..Default::default()
        }),
        invocation("playwright", &[])
    );
}

#[test]
fn returns_the_executable_part_of_the_invocation() {
    // Given a local .bin/playwright under the cwd
    let exists = |path: &str| path == "/repo/node_modules/.bin/playwright";

    // When only the binary is resolved
    // Then the executable part is returned
    assert_eq!(
        resolve_playwright_bin(&ResolveOptions {
            cwd: Some("/repo"),
            exists: Some(&exists),
            platform: Some("linux"),
            ..Default::default()
        }),
        "/repo/node_modules/.bin/playwright"
    );
}
