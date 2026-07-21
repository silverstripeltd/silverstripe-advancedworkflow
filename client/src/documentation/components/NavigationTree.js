import React, { useState } from 'react';

/**
 * Recursive, collapsible documentation navigation. Folders expand/collapse;
 * files select. Generated entirely from the manual's navigation tree, so it
 * supports arbitrary nesting.
 */
export default function NavigationTree({ nodes, activePath, onSelect, emptyLabel }) {
  if (!nodes || nodes.length === 0) {
    return emptyLabel ? <p className="awf-docs__nav-empty">{emptyLabel}</p> : null;
  }

  return (
    <ul className="awf-docs__nav">
      {nodes.map((node) => (
        <NavigationNode
          key={node.path}
          node={node}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

function NavigationNode({ node, activePath, onSelect }) {
  const containsActive = nodeContains(node, activePath);
  const [expanded, setExpanded] = useState(containsActive);

  if (node.type === 'folder') {
    return (
      <li className="awf-docs__nav-item awf-docs__nav-item--folder">
        <button
          type="button"
          className="awf-docs__nav-folder"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className={`awf-docs__caret ${expanded ? 'is-open' : ''}`} aria-hidden="true" />
          {node.title}
        </button>
        {expanded && (
          <ul className="awf-docs__nav awf-docs__nav--nested">
            {node.children.map((child) => (
              <NavigationNode key={child.path} node={child} activePath={activePath} onSelect={onSelect} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const isActive = node.path === activePath;
  return (
    <li className="awf-docs__nav-item">
      <button
        type="button"
        className={`awf-docs__nav-link ${isActive ? 'is-active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => onSelect(node.path)}
      >
        {node.title}
      </button>
    </li>
  );
}

function nodeContains(node, path) {
  if (node.type === 'file') {
    return node.path === path;
  }
  return (node.children || []).some((child) => nodeContains(child, path));
}
