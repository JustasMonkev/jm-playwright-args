//! Feature: public API (port of tests/smoke.spec.ts)

use jm_playwright_args::pw_arg;

#[test]
fn exports_the_pw_arg_singleton() {
    // Given the public API
    // When the singleton accessor is called twice
    let first = pw_arg();
    let second = pw_arg();

    // Then the reader API is available on one shared instance
    assert!(!first.has("missing"));
    assert!(std::ptr::eq(first, second));
}
