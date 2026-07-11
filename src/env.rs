//! Port of `env.ts`.

use crate::parse_cli::CustomArgs;
use std::collections::HashMap;

pub const ENV_KEY: &str = "PLAYWRIGHT_ARGS_JSON";

pub fn encode_env_args(custom_args: &CustomArgs) -> HashMap<String, String> {
    let json = serde_json::to_string(custom_args).expect("custom args are always serializable");
    HashMap::from([(ENV_KEY.to_string(), json)])
}

/// Decodes from the real process environment (the `decodeEnvArgs()` default).
pub fn decode_env_args() -> Result<CustomArgs, String> {
    decode_env_value(std::env::var(ENV_KEY).ok().as_deref())
}

pub fn decode_env_value(value: Option<&str>) -> Result<CustomArgs, String> {
    let Some(value) = value.filter(|value| !value.is_empty()) else {
        return Ok(CustomArgs::new());
    };

    let parsed: serde_json::Value =
        serde_json::from_str(value).map_err(|_| format!("{ENV_KEY} contains invalid JSON"))?;

    let invalid = || format!("{ENV_KEY} contains invalid custom arguments");
    let args: CustomArgs = serde_json::from_value(parsed).map_err(|_| invalid())?;
    if args.keys().any(|name| name.is_empty()) {
        return Err(invalid());
    }

    Ok(args)
}
