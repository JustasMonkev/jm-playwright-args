//! Port of `helper.ts`.

use crate::parse_cli::ArgValue;

pub fn parse_boolean_value(value: &ArgValue) -> Option<bool> {
    match value {
        ArgValue::Bool(value) => Some(*value),
        ArgValue::Str(value) if value == "true" => Some(true),
        ArgValue::Str(value) if value == "false" => Some(false),
        _ => None,
    }
}
