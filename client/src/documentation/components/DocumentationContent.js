import React, { useEffect, useMemo, useRef } from 'react';
import DocIcon from './DocIcon';
import { LINK_ATTR, PANEL_EYEBROW } from '../constants';
import { resolveImages } from '../lib/manual';

/**
 * Renders one documentation page to match the Figma content column: a centred
 * 650px column with an eyebrow (info icon + section label), a large page title,
 * the rendered body, and a previous/next pager. The body HTML was sanitised
 * server-side, so it is safe to inject; this component resolves image
 * placeholders, intercepts internal links, and highlights search matches.
 */
export default function DocumentationContent({ file, baseUrl, locale, query, heading, pager, onNavigate }) {
  const ref = useRef(null);

  // The page title is shown as the heading, so drop a duplicate leading H1
  // from the body, then resolve image placeholders to real endpoint URLs.
  const html = useMemo(
    () => (file ? resolveImages(stripLeadingHeading(file.html), baseUrl, locale) : ''),
    [file, baseUrl, locale]
  );

  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return undefined;
    }

    container.innerHTML = html;
    highlight(container, query);

    // Jump to a requested section, or reset to the top on a fresh page.
    const scroller = container.closest('.awf-docs__main');
    if (heading) {
      const target = container.querySelector(`[id="${heading}"]`);
      if (target) {
        target.scrollIntoView({ block: 'start' });
      }
    } else if (scroller) {
      scroller.scrollTop = 0;
    }

    const onClick = (e) => {
      const link = e.target.closest(`[${LINK_ATTR}]`);
      if (link) {
        e.preventDefault();
        onNavigate(link.getAttribute(LINK_ATTR));
      }
    };
    container.addEventListener('click', onClick);

    return () => container.removeEventListener('click', onClick);
  }, [html, query, heading, onNavigate]);

  if (!file) {
    return <div className="awf-docs__content awf-docs__content--empty">Select a page to read.</div>;
  }

  return (
    <div className="awf-docs__content">
      <div className="awf-docs__doc">
        <header className="awf-docs__doc-header">
          <span className="awf-docs__eyebrow">
            <DocIcon name="info" className="awf-docs__eyebrow-icon" />
            {PANEL_EYEBROW}
          </span>
          <h1 className="awf-docs__doc-title">{file.title}</h1>
        </header>

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
    </div>
  );
}

/**
 * Remove a leading H1 (the page's own title) so it is not shown twice — the
 * title is rendered from metadata in the header.
 */
function stripLeadingHeading(html) {
  return (html || '').replace(/^\s*<h1[^>]*>.*?<\/h1>\s*/is, '');
}

/**
 * Wrap case-insensitive matches of `query` in <mark> across text nodes,
 * skipping code blocks so snippets stay intact.
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
