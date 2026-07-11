//! Feature: env transport (port of tests/env.spec.ts)
//!   Custom args travel to Playwright as JSON in `PLAYWRIGHT_ARGS_JSON`.

#[macro_use]
mod common;

use jm_playwright_args::env::{decode_env_value, encode_env_args, ENV_KEY};
use std::collections::HashMap;

#[test]
fn encodes_custom_args_as_json_under_stable_env_key() {
    // Given custom args with string and boolean values
    // When they are encoded for the child environment
    let encoded = encode_env_args(&custom_args! { "tenant" => "acme", "debug-api" => true });

    // Then they are serialized as JSON under the stable env key
    assert_eq!(
        encoded,
        HashMap::from([(ENV_KEY.to_string(), r#"{"tenant":"acme","debug-api":true}"#.to_string())])
    );
}

#[test]
fn decodes_missing_env_as_empty_args() {
    // Given no env value
    // When it is decoded
    // Then the args are empty
    assert_eq!(decode_env_value(None), Ok(custom_args! {}));
}

#[test]
fn decodes_valid_env_json() {
    // Given a valid JSON env value
    // When it is decoded
    // Then the custom args are restored
    assert_eq!(decode_env_value(Some(r#"{"tenant":"acme"}"#)), Ok(custom_args! { "tenant" => "acme" }));
}

#[test]
fn throws_a_readable_error_for_invalid_env_json() {
    // Given a syntactically broken env value
    // When it is decoded
    // Then decoding fails with a readable error
    assert_eq!(
        decode_env_value(Some("{broken")),
        Err("PLAYWRIGHT_ARGS_JSON contains invalid JSON".to_string())
    );
}

#[test]
fn throws_a_readable_error_for_invalid_env_shapes() {
    // Given JSON values that are not valid custom args
    let invalid_shapes = ["null", "[]", r#"{"tenant":1}"#, r#"{"tag":["smoke",false]}"#, r#"{"":"acme"}"#];

    for shape in invalid_shapes {
        // When each is decoded
        // Then decoding fails with a readable error
        assert_eq!(
            decode_env_value(Some(shape)),
            Err("PLAYWRIGHT_ARGS_JSON contains invalid custom arguments".to_string()),
            "shape: {shape}"
        );
    }
}
