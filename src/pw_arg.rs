//! Port of `pwArg.ts`.

use crate::env::decode_env_args;
use crate::helper::parse_boolean_value;
use crate::parse_cli::{ArgValue, CustomArgs};
use std::sync::LazyLock;

/// Typed reader over custom arguments (the `createPwArg` return value).
pub struct PwArg {
    args: CustomArgs,
}

/// Process-wide singleton, lazily initialized once from `PLAYWRIGHT_ARGS_JSON`
/// (the `export const pwArg = createPwArg()` equivalent).
static PW_ARG: LazyLock<PwArg> =
    LazyLock::new(|| PwArg::from_env().unwrap_or_else(|error| panic!("{error}")));

pub fn pw_arg() -> &'static PwArg {
    &PW_ARG
}

impl PwArg {
    pub fn new(args: CustomArgs) -> Self {
        Self { args }
    }

    pub fn from_env() -> Result<Self, String> {
        Ok(Self::new(decode_env_args()?))
    }

    pub fn raw(&self) -> CustomArgs {
        self.args.clone()
    }

    pub fn has(&self, name: &str) -> bool {
        self.args.contains_key(name)
    }

    pub fn string(&self, name: &str, default: Option<&str>) -> Result<String, String> {
        match self.scalar_value(name)? {
            Some(value) => Ok(value.into_string()),
            None => default.map(str::to_string).ok_or_else(|| required(name)),
        }
    }

    pub fn number(&self, name: &str, default: Option<f64>) -> Result<f64, String> {
        let Some(value) = self.scalar_value(name)? else {
            return default.ok_or_else(|| required(name));
        };
        let ArgValue::Str(value) = value else {
            return Err(number_error(name));
        };

        let parsed: f64 = value.trim().parse().map_err(|_| number_error(name))?;
        if !parsed.is_finite() {
            return Err(number_error(name));
        }
        Ok(parsed)
    }

    pub fn boolean(&self, name: &str, default: Option<bool>) -> Result<bool, String> {
        let value = match self.scalar_value(name)? {
            Some(value) => value,
            None => return default.ok_or_else(|| required(name)),
        };

        parse_boolean_value(&value).ok_or_else(|| format!("Custom argument \"{name}\" must be a boolean"))
    }

    pub fn array(&self, name: &str, default: Option<&[String]>) -> Vec<String> {
        match self.args.get(name) {
            None => default.unwrap_or_default().to_vec(),
            Some(ArgValue::List(values)) => values.clone(),
            Some(value) => vec![value.clone().into_string()],
        }
    }

    /// The last repeated value wins for scalar readers; `Ok(None)` means missing.
    fn scalar_value(&self, name: &str) -> Result<Option<ArgValue>, String> {
        match self.args.get(name) {
            None => Ok(None),
            Some(ArgValue::List(values)) => match values.last() {
                Some(last) => Ok(Some(ArgValue::Str(last.clone()))),
                None => Err(required(name)),
            },
            Some(value) => Ok(Some(value.clone())),
        }
    }
}

fn required(name: &str) -> String {
    format!("Custom argument \"{name}\" is required")
}

fn number_error(name: &str) -> String {
    format!("Custom argument \"{name}\" must be a number")
}
