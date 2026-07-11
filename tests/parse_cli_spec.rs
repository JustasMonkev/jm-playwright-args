//! Feature: CLI parsing (port of tests/parseCli.spec.ts)
//!   Everything before `--` is parsed as custom arguments,
//!   everything after is forwarded unchanged to Playwright.

#[macro_use]
mod common;

use common::strings;
use jm_playwright_args::parse_cli::{parse_cli, ParsedCli};

fn parse(argv: &[&str]) -> Result<ParsedCli, String> {
    parse_cli(&strings(argv))
}

#[test]
fn splits_custom_args_from_playwright_args_at_delimiter() {
    // Given a command line with custom args, the delimiter and Playwright args
    // When it is parsed
    let parsed = parse(&["--tenant=acme", "--build-path=dist", "--", "test", "--project=chromium"]);

    // Then custom and Playwright args are split at the delimiter
    assert_eq!(
        parsed,
        Ok(ParsedCli {
            custom_args: custom_args! { "tenant" => "acme", "build-path" => "dist" },
            playwright_args: strings(&["test", "--project=chromium"]),
        })
    );
}

#[test]
fn defaults_to_playwright_test_when_no_playwright_command_is_provided() {
    // Given a command line without a delimiter
    // When it is parsed
    let parsed = parse(&["--tenant=acme"]);

    // Then the Playwright command defaults to `test`
    assert_eq!(
        parsed,
        Ok(ParsedCli {
            custom_args: custom_args! { "tenant" => "acme" },
            playwright_args: strings(&["test"]),
        })
    );
}

#[test]
fn keeps_repeated_custom_args_as_arrays() {
    // Given the same custom arg passed twice
    // When it is parsed
    let parsed = parse(&["--tag=smoke", "--tag=checkout", "--", "test"]);

    // Then both values are kept as a list
    assert_eq!(
        parsed,
        Ok(ParsedCli {
            custom_args: custom_args! { "tag" => ["smoke", "checkout"] },
            playwright_args: strings(&["test"]),
        })
    );
}

#[test]
fn supports_boolean_custom_flags() {
    // Given a bare flag with no value
    // When it is parsed
    let parsed = parse(&["--debug-api", "--", "test"]);

    // Then the flag becomes a boolean true
    assert_eq!(
        parsed,
        Ok(ParsedCli {
            custom_args: custom_args! { "debug-api" => true },
            playwright_args: strings(&["test"]),
        })
    );
}

#[test]
fn keeps_explicit_false_values_as_strings_for_typed_readers() {
    // Given a flag with an explicit `false` value
    // When it is parsed
    let parsed = parse(&["--debug-api=false", "--", "test"]);

    // Then the value stays a string so typed readers can interpret it
    assert_eq!(
        parsed,
        Ok(ParsedCli {
            custom_args: custom_args! { "debug-api" => "false" },
            playwright_args: strings(&["test"]),
        })
    );
}

#[test]
fn keeps_empty_values_and_values_containing_equals_signs() {
    // Given values that are empty or contain `=`
    // When they are parsed
    let parsed = parse(&["--empty=", "--token=a=b=c", "--", "test"]);

    // Then only the first `=` separates name from value
    assert_eq!(
        parsed,
        Ok(ParsedCli {
            custom_args: custom_args! { "empty" => "", "token" => "a=b=c" },
            playwright_args: strings(&["test"]),
        })
    );
}

#[test]
fn keeps_repeated_flags_as_arrays() {
    // Given a bare flag repeated with an explicit value
    // When it is parsed
    let parsed = parse(&["--debug-api", "--debug-api=false", "--", "test"]);

    // Then both occurrences are kept as strings in a list
    assert_eq!(
        parsed,
        Ok(ParsedCli {
            custom_args: custom_args! { "debug-api" => ["true", "false"] },
            playwright_args: strings(&["test"]),
        })
    );
}

#[test]
fn defaults_delimiter_only_input_to_playwright_test() {
    // Given only the delimiter
    // When it is parsed
    let parsed = parse(&["--"]);

    // Then there are no custom args and the command defaults to `test`
    assert_eq!(
        parsed,
        Ok(ParsedCli {
            custom_args: custom_args! {},
            playwright_args: strings(&["test"]),
        })
    );
}

#[test]
fn rejects_positional_custom_args_before_delimiter() {
    // Given a positional argument before the delimiter
    // When it is parsed
    // Then parsing fails with a readable error
    assert_eq!(
        parse(&["tenant=acme", "--", "test"]),
        Err("Custom argument must start with \"--\": tenant=acme".to_string())
    );
}

#[test]
fn rejects_empty_custom_arg_names() {
    // Given an argument with an empty name
    // When it is parsed
    // Then parsing fails with a readable error
    assert_eq!(
        parse(&["--=value", "--", "test"]),
        Err("Custom argument name cannot be empty".to_string())
    );
}
