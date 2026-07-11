//! Port of `runPlaywright.ts`.

use std::collections::HashMap;
use std::process::Command;
use std::sync::atomic::{AtomicI32, Ordering};

#[derive(Debug, PartialEq)]
pub struct RunOptions {
    pub bin: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    /// Replaces the inherited environment when set (test seam, like `baseEnv`).
    pub base_env: Option<HashMap<String, String>>,
}

/// Forwards termination signals to the child process until it exits.
/// The pure logic behind the SIGINT/SIGTERM handlers, kept injectable for tests.
pub struct SignalForwarder {
    pid: AtomicI32,
}

impl SignalForwarder {
    pub const fn new() -> Self {
        Self { pid: AtomicI32::new(0) }
    }

    pub fn arm(&self, pid: i32) {
        self.pid.store(pid, Ordering::SeqCst);
    }

    pub fn disarm(&self) {
        self.pid.store(0, Ordering::SeqCst);
    }

    pub fn forward(&self, signal: i32, kill: impl FnOnce(i32, i32)) {
        let pid = self.pid.load(Ordering::SeqCst);
        if pid > 0 {
            kill(pid, signal);
        }
    }
}

impl Default for SignalForwarder {
    fn default() -> Self {
        Self::new()
    }
}

static FORWARDER: SignalForwarder = SignalForwarder::new();

#[cfg(unix)]
extern "C" fn handle_signal(signal: libc::c_int) {
    // Only async-signal-safe calls are allowed here; `kill` qualifies.
    FORWARDER.forward(signal, |pid, signal| unsafe {
        libc::kill(pid, signal);
    });
}

#[cfg(unix)]
fn install_signal_handlers() {
    unsafe {
        let handler = handle_signal as *const () as libc::sighandler_t;
        libc::signal(libc::SIGINT, handler);
        libc::signal(libc::SIGTERM, handler);
    }
}

pub fn run_playwright(options: &RunOptions) -> Result<i32, String> {
    let mut command = Command::new(&options.bin);
    command.args(&options.args);
    if let Some(base_env) = &options.base_env {
        command.env_clear().envs(base_env);
    }
    command.envs(&options.env);

    // stdio is inherited by default, matching `stdio: 'inherit'`.
    let mut child = command.spawn().map_err(|error| error.to_string())?;

    #[cfg(unix)]
    {
        FORWARDER.arm(child.id() as i32);
        install_signal_handlers();
    }

    let status = child.wait().map_err(|error| error.to_string());

    #[cfg(unix)]
    FORWARDER.disarm();

    Ok(status?.code().unwrap_or(1))
}
