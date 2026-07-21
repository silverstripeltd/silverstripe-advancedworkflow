// Shared constants for the documentation UI (no magic strings in components).

export const TOGGLE_EVENT = 'awf-docs:toggle';

export const MIN_PANEL_WIDTH = 480;
export const MAX_PANEL_WIDTH = 1100;
export const DEFAULT_PANEL_WIDTH = 720;

// Data attributes the server-side HTML processor adds to rendered docs.
export const IMAGE_ATTR = 'data-doc-image';
export const LINK_ATTR = 'data-doc-path';
export const ANCHOR_ATTR = 'data-doc-anchor';

/**
 * Runtime config injected by the CMS extension (Requirements::customScript).
 * Falls back to sensible defaults so the bundle is resilient if it is missing.
 */
export function getConfig() {
  const config = (typeof window !== 'undefined' && window.SS_ADVANCEDWORKFLOW_DOCS) || {};

  return {
    baseUrl: (config.baseUrl || '/documentation-admin').replace(/\/$/, ''),
  };
}
