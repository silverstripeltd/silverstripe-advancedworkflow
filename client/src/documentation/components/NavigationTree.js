import React, { useEffect, useState } from 'react';
import DocIcon from './DocIcon';

/**
 * Recursive, collapsible documentation navigation matching the Figma "User
 * docs" tree: bold top-level sections separated by rules, blue links, triangle
 * carets (right = collapsed, down = expanded). Folders expand to child pages;
 * a page that has section headings expands to an in-page table of contents
 * (its H2/H3), so the accordion is meaningful even for flat docs.
 */
export default function NavigationTree({ nodes, activePath, onSelect, emptyLabel, files = {}, root = false }) {
  if (!nodes || nodes.length === 0) {
    return emptyLabel ? <p className="awf-docs__nav-empty">{emptyLabel}</p> : null;
  }

  const className = root ? 'awf-docs__nav awf-docs__nav--root' : 'awf-docs__nav';

  return (
    <ul className={className}>
      {nodes.map((node) => (
        <NavigationNode key={node.path} node={node} depth={0} activePath={activePath} onSelect={onSelect} files={files} />
      ))}
    </ul>
  );
}

function NavigationNode({ node, depth, activePath, onSelect, files }) {
  const isActive = node.type === 'file' && node.path === activePath;
  const headings = node.type === 'file' ? ((files[node.path] || {}).headings || []) : [];
  const containsActive = nodeContains(node, activePath);
  const [expanded, setExpanded] = useState(containsActive || (isActive && headings.length > 0));

  // Opening a page from anywhere reveals its table of contents.
  useEffect(() => {
    if (isActive && headings.length > 0) {
      setExpanded(true);
    }
  }, [isActive, headings.length]);

  // Folder: expands to child pages.
  if (node.type === 'folder') {
    return (
      <li className="awf-docs__nav-item awf-docs__nav-item--folder">
        <button
          type="button"
          className={`awf-docs__nav-folder ${containsActive ? 'is-current' : ''}`}
          aria-expanded={expanded}
          style={{ paddingLeft: indent(depth) }}
          onClick={() => setExpanded((v) => !v)}
        >
          <DocIcon name={expanded ? 'caret-down' : 'caret-right'} className="awf-docs__caret" />
          {node.title}
        </button>
        {expanded && (
          <ul className="awf-docs__nav awf-docs__nav--nested">
            {node.children.map((child) => (
              <NavigationNode key={child.path} node={child} depth={depth + 1} activePath={activePath} onSelect={onSelect} files={files} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  // File without headings: a plain link.
  if (headings.length === 0) {
    return (
      <li className="awf-docs__nav-item">
        <button
          type="button"
          className={`awf-docs__nav-link ${isActive ? 'is-active' : ''}`}
          aria-current={isActive ? 'page' : undefined}
          style={{ paddingLeft: indent(depth) }}
          onClick={() => onSelect(node.path)}
        >
          {node.title}
        </button>
      </li>
    );
  }

  // File with headings: caret toggles the in-page table of contents; the label
  // opens the page.
  return (
    <li className="awf-docs__nav-item awf-docs__nav-item--page">
      <div className="awf-docs__nav-row" style={{ paddingLeft: indent(depth) }}>
        <button
          type="button"
          className="awf-docs__nav-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse sections' : 'Expand sections'}
          onClick={() => setExpanded((v) => !v)}
        >
          <DocIcon name={expanded ? 'caret-down' : 'caret-right'} className="awf-docs__caret" />
        </button>
        <button
          type="button"
          className={`awf-docs__nav-link ${isActive ? 'is-active' : ''}`}
          aria-current={isActive ? 'page' : undefined}
          onClick={() => onSelect(node.path)}
        >
          {node.title}
        </button>
      </div>
      {expanded && (
        <ul className="awf-docs__nav awf-docs__toc">
          {headings.map((h) => (
            <li key={h.id} className="awf-docs__nav-item">
              <button
                type="button"
                className={`awf-docs__toc-link awf-docs__toc-link--h${h.level}`}
                onClick={() => onSelect(node.path, h.id)}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// Progressive indentation per nesting level (Figma steps ~20px per level).
// Depth 0 relies on the list-item padding, so it stays flush.
function indent(depth) {
  return `${depth * 1.25}rem`;
}

function nodeContains(node, path) {
  if (node.type === 'file') {
    return node.path === path;
  }
  return (node.children || []).some((child) => nodeContains(child, path));
}
