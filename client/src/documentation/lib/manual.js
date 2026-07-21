// Pure helpers for the documentation manual: fetching, URL building, nav
// flattening, and client-side search. Kept framework-free so they are simple
// to unit test.

import { IMAGE_ATTR } from '../constants';

export function fetchManual(baseUrl) {
  return fetch(`${baseUrl}/manual`, { credentials: 'same-origin' })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))));
}

export function imageUrl(baseUrl, locale, path) {
  return `${baseUrl}/image?locale=${encodeURIComponent(locale)}&path=${encodeURIComponent(path)}`;
}

/**
 * Depth-first list of file nodes in navigation order — used for the
 * previous/next pager and as the default selection.
 */
export function flattenFiles(navigation) {
  const files = [];
  const walk = (nodes) => {
    (nodes || []).forEach((node) => {
      if (node.type === 'file') {
        files.push(node);
      } else if (node.children) {
        walk(node.children);
      }
    });
  };
  walk(navigation);
  return files;
}

/**
 * Case-insensitive, partial-match search over the generated index. Matches
 * page title OR body text. Returns a Set of matching file paths.
 */
export function searchPaths(searchIndex, query) {
  const term = (query || '').trim().toLowerCase();
  if (term === '') {
    return null; // null => "no active search"
  }

  const matches = new Set();
  (searchIndex || []).forEach((entry) => {
    const haystack = `${entry.title} ${entry.searchText}`.toLowerCase();
    if (haystack.includes(term)) {
      matches.add(entry.path);
    }
  });
  return matches;
}

/**
 * Prune the navigation tree to only branches containing a matching file.
 * Folders are kept when any descendant matches so the path stays navigable.
 */
export function filterNavigation(navigation, matchingPaths) {
  if (matchingPaths === null) {
    return navigation;
  }

  const prune = (nodes) => (nodes || []).reduce((kept, node) => {
    if (node.type === 'file') {
      if (matchingPaths.has(node.path)) {
        kept.push(node);
      }
      return kept;
    }

    const children = prune(node.children);
    if (children.length) {
      kept.push({ ...node, children });
    }
    return kept;
  }, []);

  return prune(navigation);
}

/**
 * Resolve the `data-doc-image` placeholders the server left in the HTML to real
 * image endpoint URLs, in a detached container. Returns an HTML string safe to
 * inject (the source HTML was already sanitised server-side).
 */
export function resolveImages(html, baseUrl, locale) {
  if (!html || !html.includes(IMAGE_ATTR)) {
    return html;
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll(`[${IMAGE_ATTR}]`).forEach((img) => {
    img.setAttribute('src', imageUrl(baseUrl, locale, img.getAttribute(IMAGE_ATTR)));
  });
  return template.innerHTML;
}
