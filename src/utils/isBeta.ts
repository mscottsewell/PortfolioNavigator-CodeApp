import { isTrainingMode } from '../api';

/**
 * Detects whether the app is running as the beta web resource.
 * Checks the page URL for the beta web resource name.
 * Returns true in training mode so beta features are testable locally.
 */
export function isBeta(): boolean {
  if (isTrainingMode()) return true;

  try {
    const url = window.location.href + (window.parent?.location?.href ?? '');
    return url.includes('portfolionavigator_beta');
  } catch {
    // Cross-origin — check only own frame
    return window.location.href.includes('portfolionavigator_beta');
  }
}
