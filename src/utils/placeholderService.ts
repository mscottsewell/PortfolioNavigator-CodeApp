/** Name-based detection of the "No Service or Initiative Assigned" placeholder */

const PLACEHOLDER_PATTERN = /^\*{0,2}No Service or Initiative Assigned\*{0,2}$/i;

/**
 * Returns true if the given service name matches the well-known placeholder
 * used when a resource has not yet been assigned a real service or initiative.
 * Handles the name with or without surrounding ** characters.
 */
export function isPlaceholderService(serviceName: string | undefined | null): boolean {
  if (!serviceName) return false;
  return PLACEHOLDER_PATTERN.test(serviceName.trim());
}
