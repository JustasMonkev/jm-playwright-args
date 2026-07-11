//! Shared support for the BDD-style specs.
#![allow(dead_code, unused_macros)]

/// Builds `CustomArgs` from `"name" => value` pairs, like an object literal.
macro_rules! custom_args {
    ($($name:expr => $value:expr),* $(,)?) => {{
        #[allow(unused_mut)]
        let mut args = jm_playwright_args::CustomArgs::new();
        $(args.insert($name.to_string(), jm_playwright_args::ArgValue::from($value));)*
        args
    }};
}

pub fn strings(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| value.to_string()).collect()
}
