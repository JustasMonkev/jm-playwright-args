//! Port of `cli.ts`. The `isCliEntry` machinery has no Rust equivalent:
//! a binary is always its own entrypoint.

use crate::env::encode_env_args;
use crate::parse_cli::parse_cli;
use crate::resolve_playwright::{resolve_playwright_invocation, ResolveOptions};
use crate::run_playwright::{run_playwright, RunOptions};

pub const HELP_TEXT: &str = "Usage: pw-args [custom args] -- [playwright args]

Everything before \"--\" is parsed as custom arguments and forwarded to
Playwright config and tests via the PLAYWRIGHT_ARGS_JSON env variable.
Everything after \"--\" is passed unchanged to the Playwright CLI.

Options:
  -h, --help     Show this help and exit.
  -v, --version  Print the package version and exit.

Examples:
  pw-args --tenant=acme -- test --project=chromium
  pw-args --tag=smoke --tag=checkout -- test --grep @checkout
";

pub const PACKAGE_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Default)]
pub struct CliOptions<'a> {
    pub argv: Option<Vec<String>>,
    pub cwd: Option<&'a str>,
    pub exists: Option<&'a dyn Fn(&str) -> bool>,
    pub node_path: Option<&'a str>,
    pub platform: Option<&'a str>,
    pub run_playwright: Option<&'a mut dyn FnMut(RunOptions) -> Result<i32, String>>,
    pub stdout: Option<&'a mut dyn FnMut(&str)>,
}

pub fn run_cli(options: CliOptions) -> Result<i32, String> {
    let argv = options
        .argv
        .unwrap_or_else(|| std::env::args().skip(1).collect());
    let mut default_stdout = |line: &str| println!("{line}");
    let stdout = options.stdout.unwrap_or(&mut default_stdout);

    let delimiter_index = argv.iter().position(|arg| arg == "--");
    let custom_argv = &argv[..delimiter_index.unwrap_or(argv.len())];

    if custom_argv.iter().any(|arg| arg == "--help" || arg == "-h") {
        stdout(HELP_TEXT);
        return Ok(0);
    }

    if custom_argv.iter().any(|arg| arg == "--version" || arg == "-v") {
        stdout(PACKAGE_VERSION);
        return Ok(0);
    }

    let parsed = parse_cli(&argv)?;
    let playwright = resolve_playwright_invocation(&ResolveOptions {
        cwd: options.cwd,
        explicit_bin: None,
        exists: options.exists,
        node_path: options.node_path,
        platform: options.platform,
    });

    let run = RunOptions {
        bin: playwright.bin,
        args: [playwright.args, parsed.playwright_args].concat(),
        env: encode_env_args(&parsed.custom_args),
        base_env: None,
    };

    match options.run_playwright {
        Some(runner) => runner(run),
        None => run_playwright(&run),
    }
}
