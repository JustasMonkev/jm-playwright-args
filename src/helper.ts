export function parseBooleanValue(value: string | boolean): boolean | undefined {
  if (typeof value === 'boolean') return value;

  if (value === 'true') return true;
  if (value === 'false') return false;

  return undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
