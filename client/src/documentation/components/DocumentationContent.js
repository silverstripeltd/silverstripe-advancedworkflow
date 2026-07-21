import React, { useEffect, useMemo, useRef } from 'react';
import { LINK_ATTR } from '../constants';
import { resolveImages } from '../lib/manual';

/**
 * Renders one documentation page. The HTML was sanitised server-side, so it is
 * safe to inject; this component resolves image placeholders, intercepts
 * internal links to navigate within the panel, and highlights search matches.
 */
export default function DocumentationContent({ file, baseUrl, locale, query, pager, onNavigate }) {
  const ref = useRef(null);

  const html = useMemo(
    () => (file ? resolveImages(file.html, baseUrl, locale) : ''),
    [file, baseUrl, locale]
  );

  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return undefined;
    }

    // Rebuild from the source HTML each pass so stale highlights never stack.
    container.innerHTML = html;
    highlight(container, query);

    const onClick = (e) => {
      const link = e.target.closest(`[${LINK_ATTR}]`);
      if (link) {
        e.preventDefault();
        onNavigate(link.getAttribute(LINK_ATTR));
      }
    };
    container.addEventListener('click', onClick);
    container.scrollTop = 0;

    return () => container.removeEventListener('click', onClick);
  }, [html, query, onNavigate]);

  if (!file) {
    return <div className="awf-docs__content awf-docs__content--empty">Select a page to read.</div>;
  }

  return (
    <div className="awf-docs__content">
      <article className="awf-docs__article" ref={ref} />
      <nav className="awf-docs__pager" aria-label="Documentation pages">
        {pager.prev ? (
          <button type="button" className="awf-docs__pager-link awf-docs__pager-link--prev" onClick={() => onNavigate(pager.prev.path)}>
            <span className="awf-docs__pager-label">Previous</span>
            <span className="awf-docs__pager-title">{pager.prev.title}</span>
          </button>
        ) : <span />}
        {pager.next && (
          <button type="button" className="awf-docs__pager-link awf-docs__pager-link--next" onClick={() => onNavigate(pager.next.path)}>
            <span className="awf-docs__pager-label">Next</span>
            <span className="awf-docs__pager-title">{pager.next.title}</span>
          </button>
        )}
      </nav>
    </div>
  );
}

/**
 * Wrap case-insensitive matches of `query` in <mark> across the container's
 * text nodes, skipping code blocks so snippets stay intact.
 */
function highlight(container, query) {
  const term = (query || '').trim();
  if (term.length < 2) {
    return;
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim() || node.parentElement.closest('code, pre, mark')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const lower = term.toLowerCase();
  const targets = [];
  let current = walker.nextNode();
  while (current) {
    if (current.nodeValue.toLowerCase().includes(lower)) {
      targets.push(current);
    }
    current = walker.nextNode();
  }

  targets.forEach((node) => wrapMatches(node, lower, term.length));
}

function wrapMatches(textNode, lowerTerm, length) {
  const text = textNode.nodeValue;
  const fragment = document.createDocumentFragment();
  let index = 0;
  let found = text.toLowerCase().indexOf(lowerTerm, index);

  while (found !== -1) {
    if (found > index) {
      fragment.appendChild(document.createTextNode(text.slice(index, found)));
    }
    const mark = document.createElement('mark');
    mark.className = 'awf-docs__mark';
    mark.textContent = text.slice(found, found + length);
    fragment.appendChild(mark);
    index = found + length;
    found = text.toLowerCase().indexOf(lowerTerm, index);
  }

  if (index < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(index)));
  }
  textNode.parentNode.replaceChild(fragment, textNode);
}
