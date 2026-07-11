//! Feature: running Playwright (port of tests/runPlaywright.spec.ts)
//!   Spawns the resolved binary without a shell, merges the env,
//!   returns the child exit code and forwards termination signals.
//!
//! The original suite mocked `spawn`; here the scenarios drive real child
//! processes, which proves the same contracts end-to-end.
#![cfg(unix)]

#[macro_use]
mod common;

use common::strings;
use jm_playwright_args::run_playwright::{run_playwright, RunOptions, SignalForwarder};
use std::collections::HashMap;
use std::sync::{Mutex, MutexGuard};

fn env(entries: &[(&str, &str)]) -> HashMap<String, String> {
    entries.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect()
}

/// Signal handlers are process-global, so scenarios that spawn children
/// (and thus install/restore handlers) must not interleave.
fn spawn_lock() -> MutexGuard<'static, ()> {
    static LOCK: Mutex<()> = Mutex::new(());
    LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

#[test]
fn spawns_the_binary_with_provided_args_and_merged_env() {
    let _guard = spawn_lock();
    // Given a child that only succeeds when it sees the base env merged
    // with the custom-args env on top
    let options = RunOptions {
        bin: "/bin/sh".to_string(),
        args: strings(&[
            "-c",
            r#"test "$PLAYWRIGHT_ARGS_JSON" = '{"tenant":"acme"}' && test "$BASE_MARKER" = kept"#,
        ]),
        env: env(&[("PLAYWRIGHT_ARGS_JSON", r#"{"tenant":"acme"}"#)]),
        base_env: Some(env(&[
            ("BASE_MARKER", "kept"),
            ("PLAYWRIGHT_ARGS_JSON", "overridden-by-custom-args"),
            ("PATH", "/usr/bin:/bin"),
        ])),
    };

    // When the child runs
    // Then it saw exactly the merged environment and its exit code is returned
    assert_eq!(run_playwright(&options), Ok(0));
}

#[test]
fn passes_arguments_with_shell_metacharacters_literally() {
    let _guard = spawn_lock();
    // Given arguments full of shell metacharacters
    let options = RunOptions {
        bin: "/bin/sh".to_string(),
        args: strings(&[
            "-c",
            r#"test "$1" = 'smoke|checkout' && test "$2" = 'a & b'"#,
            "sh",
            "smoke|checkout",
            "a & b",
        ]),
        env: env(&[]),
        base_env: None,
    };

    // When the child runs (no shell wraps the invocation)
    // Then the arguments arrive uninterpreted
    assert_eq!(run_playwright(&options), Ok(0));
}

#[test]
fn returns_1_when_child_process_exits_without_an_exit_code() {
    let _guard = spawn_lock();
    // Given a child killed by a signal, so it has no exit code
    let options = RunOptions {
        bin: "/bin/sh".to_string(),
        args: strings(&["-c", "kill -9 $$"]),
        env: env(&[]),
        base_env: None,
    };

    // When the child runs
    // Then the exit code falls back to 1
    assert_eq!(run_playwright(&options), Ok(1));
}

#[test]
fn errors_when_the_child_process_cannot_be_spawned() {
    let _guard = spawn_lock();
    // Given a binary that does not exist
    let options = RunOptions {
        bin: "/definitely/not/a/real/binary".to_string(),
        args: strings(&["test"]),
        env: env(&[]),
        base_env: None,
    };

    // When the spawn is attempted
    // Then it fails with the spawn error
    assert!(run_playwright(&options).is_err());
}

#[test]
fn restores_previous_signal_handlers_after_the_child_exits() {
    let _guard = spawn_lock();
    // Given the process already has its own SIGTERM disposition
    let previous = unsafe { libc::signal(libc::SIGTERM, libc::SIG_IGN) };

    // When a child runs to completion
    let options = RunOptions {
        bin: "/bin/true".to_string(),
        args: strings(&[]),
        env: env(&[]),
        base_env: None,
    };
    assert_eq!(run_playwright(&options), Ok(0));

    // Then the caller's disposition is back in place afterwards
    let current = unsafe { libc::signal(libc::SIGTERM, previous) };
    assert_eq!(current, libc::SIG_IGN);
}

#[test]
fn forwards_termination_signals_to_child_process_until_it_exits() {
    // Given a running child process
    let forwarder = SignalForwarder::new();
    let mut kills: Vec<(i32, i32)> = vec![];
    forwarder.arm(4242);

    // When SIGTERM arrives while it runs
    forwarder.forward(libc::SIGTERM, |pid, signal| kills.push((pid, signal)));

    // And the child exits before another SIGTERM arrives
    forwarder.disarm();
    forwarder.forward(libc::SIGTERM, |pid, signal| kills.push((pid, signal)));

    // Then the signal was forwarded exactly once
    assert_eq!(kills, vec![(4242, libc::SIGTERM)]);
}
