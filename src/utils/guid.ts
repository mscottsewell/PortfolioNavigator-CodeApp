/* ── GUID validation ── */

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates that a string is a well-formed GUID. Throws if not. */
export function assertGuid(value: string, label = 'ID'): string {
  if (!GUID_REGEX.test(value)) {
    throw new Error(`Invalid GUID for ${label}: "${value}"`);
  }
  return value;
}

/** Returns true if the string is a well-formed GUID. */
export function isValidGuid(value: string): boolean {
  return GUID_REGEX.test(value);
}
