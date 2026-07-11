//! Port of `parseCli.ts`.

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

/// A custom argument value: `--flag` (bool), `--name=value` (string) or repeats (list).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ArgValue {
    Bool(bool),
    Str(String),
    List(Vec<String>),
}

impl ArgValue {
    /// Mirrors JavaScript `String(value)` coercion.
    pub fn into_string(self) -> String {
        match self {
            ArgValue::Bool(value) => value.to_string(),
            ArgValue::Str(value) => value,
            ArgValue::List(values) => values.join(","),
        }
    }
}

impl From<&str> for ArgValue {
    fn from(value: &str) -> Self {
        ArgValue::Str(value.to_string())
    }
}

impl From<bool> for ArgValue {
    fn from(value: bool) -> Self {
        ArgValue::Bool(value)
    }
}

impl<const N: usize> From<[&str; N]> for ArgValue {
    fn from(values: [&str; N]) -> Self {
        ArgValue::List(values.iter().map(|value| value.to_string()).collect())
    }
}

/// Insertion-ordered map, matching JavaScript object key order.
pub type CustomArgs = IndexMap<String, ArgValue>;

#[derive(Debug, PartialEq)]
pub struct ParsedCli {
    pub custom_args: CustomArgs,
    pub playwright_args: Vec<String>,
}

pub fn parse_cli(argv: &[String]) -> Result<ParsedCli, String> {
    let delimiter_index = argv.iter().position(|arg| arg == "--");
    let custom_argv = &argv[..delimiter_index.unwrap_or(argv.len())];
    let forwarded = delimiter_index.map_or(&[] as &[String], |index| &argv[index + 1..]);

    Ok(ParsedCli {
        custom_args: parse_custom_args(custom_argv)?,
        playwright_args: if forwarded.is_empty() {
            vec!["test".to_string()]
        } else {
            forwarded.to_vec()
        },
    })
}

fn parse_custom_args(argv: &[String]) -> Result<CustomArgs, String> {
    let mut result = CustomArgs::new();

    for arg in argv {
        let without_prefix = arg
            .strip_prefix("--")
            .ok_or_else(|| format!("Custom argument must start with \"--\": {arg}"))?;

        let (name, value) = match without_prefix.split_once('=') {
            None => (without_prefix, ArgValue::Bool(true)),
            Some((name, value)) => (name, ArgValue::Str(value.to_string())),
        };

        if name.is_empty() {
            return Err("Custom argument name cannot be empty".to_string());
        }

        match result.get_mut(name) {
            None => {
                result.insert(name.to_string(), value);
            }
            Some(ArgValue::List(previous)) => previous.push(value.into_string()),
            Some(previous) => {
                let first = std::mem::replace(previous, ArgValue::Bool(true)).into_string();
                *previous = ArgValue::List(vec![first, value.into_string()]);
            }
        }
    }

    Ok(result)
}
