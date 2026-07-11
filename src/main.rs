//! The `pw-args` binary (the `cli.ts` entrypoint block).

use jm_playwright_args::cli::{run_cli, CliOptions};

fn main() {
    match run_cli(CliOptions::default()) {
        Ok(code) => std::process::exit(code),
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
}
