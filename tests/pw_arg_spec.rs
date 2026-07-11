//! Feature: pwArg helper (port of tests/pwArg.spec.ts)
//!   Typed readers over the custom args received from the CLI.

#[macro_use]
mod common;

use common::strings;
use jm_playwright_args::PwArg;

#[test]
fn reads_string_args_with_defaults() {
    // Given a tenant arg
    let pw_arg = PwArg::new(custom_args! { "tenant" => "acme" });

    // When strings are read with and without a default
    // Then present args win and defaults fill the gaps
    assert_eq!(pw_arg.string("tenant", None), Ok("acme".to_string()));
    assert_eq!(pw_arg.string("missing", Some("local")), Ok("local".to_string()));
}

#[test]
fn reads_number_args_and_rejects_non_numeric_values() {
    // Given numeric and non-numeric string args
    let pw_arg = PwArg::new(custom_args! { "retries" => "2", "broken" => "x" });

    // When they are read as numbers
    // Then numeric strings parse and other values fail
    assert_eq!(pw_arg.number("retries", None), Ok(2.0));
    assert_eq!(
        pw_arg.number("broken", None),
        Err("Custom argument \"broken\" must be a number".to_string())
    );
}

#[test]
fn rejects_bare_boolean_flags_as_number_args() {
    // Given a bare flag
    let pw_arg = PwArg::new(custom_args! { "count" => true });

    // When it is read as a number
    // Then reading fails
    assert_eq!(
        pw_arg.number("count", None),
        Err("Custom argument \"count\" must be a number".to_string())
    );
}

#[test]
fn reads_boolean_args_from_flags_and_string_values() {
    // Given a bare flag and an explicit string value
    let pw_arg = PwArg::new(custom_args! { "debug-api" => true, "headed" => "false" });

    // When they are read as booleans
    // Then both forms are understood
    assert_eq!(pw_arg.boolean("debug-api", None), Ok(true));
    assert_eq!(pw_arg.boolean("headed", None), Ok(false));
}

#[test]
fn rejects_invalid_boolean_string_values() {
    // Given a non-boolean string value
    let pw_arg = PwArg::new(custom_args! { "headed" => "yes" });

    // When it is read as a boolean
    // Then reading fails
    assert_eq!(
        pw_arg.boolean("headed", None),
        Err("Custom argument \"headed\" must be a boolean".to_string())
    );
}

#[test]
fn reads_repeated_args_as_arrays() {
    // Given a repeated arg and a scalar arg
    let pw_arg = PwArg::new(custom_args! { "tag" => ["smoke", "checkout"], "single" => "one" });

    // When they are read as arrays
    // Then lists come back whole and scalars are wrapped
    assert_eq!(pw_arg.array("tag", None), strings(&["smoke", "checkout"]));
    assert_eq!(pw_arg.array("single", None), strings(&["one"]));
}

#[test]
fn uses_the_last_repeated_value_for_scalar_readers() {
    // Given repeated values for every scalar type
    let pw_arg = PwArg::new(custom_args! {
        "tenant" => ["preview", "prod"],
        "retries" => ["1", "3"],
        "headed" => ["true", "false"],
    });

    // When they are read as scalars
    // Then the last value wins
    assert_eq!(pw_arg.string("tenant", None), Ok("prod".to_string()));
    assert_eq!(pw_arg.number("retries", None), Ok(3.0));
    assert_eq!(pw_arg.boolean("headed", None), Ok(false));
}

#[test]
fn returns_defensive_copies_for_raw_and_array_values() {
    // Given a repeated arg
    let pw_arg = PwArg::new(custom_args! { "tag" => ["smoke"] });

    // When the raw view and the array value are mutated by the caller
    let mut raw = pw_arg.raw();
    if let Some(jm_playwright_args::ArgValue::List(tags)) = raw.get_mut("tag") {
        tags.push("mutated".to_string());
    }
    let mut tags = pw_arg.array("tag", None);
    tags.push("mutated-again".to_string());

    // Then the stored args stay untouched
    assert_eq!(pw_arg.array("tag", None), strings(&["smoke"]));
}

#[test]
fn returns_defensive_copies_for_array_defaults() {
    // Given a default list and no stored arg
    let default_tags = strings(&["local"]);
    let pw_arg = PwArg::new(custom_args! {});

    // When the returned default is mutated by the caller
    let mut tags = pw_arg.array("tag", Some(&default_tags));
    tags.push("mutated".to_string());

    // Then the original default stays untouched
    assert_eq!(default_tags, strings(&["local"]));
    assert_eq!(pw_arg.array("tag", Some(&default_tags)), strings(&["local"]));
}

#[test]
fn exposes_raw_args_and_has_checks() {
    // Given a tenant arg
    let pw_arg = PwArg::new(custom_args! { "tenant" => "acme" });

    // When the raw view and presence checks are used
    // Then they reflect the stored args
    assert_eq!(pw_arg.raw(), custom_args! { "tenant" => "acme" });
    assert!(pw_arg.has("tenant"));
    assert!(!pw_arg.has("missing"));
}

#[test]
fn throws_when_required_args_are_missing() {
    // Given no args
    let pw_arg = PwArg::new(custom_args! {});

    // When a required string is read
    // Then reading fails
    assert_eq!(
        pw_arg.string("tenant", None),
        Err("Custom argument \"tenant\" is required".to_string())
    );
}
