import React, { useState } from 'react';
import DocIcon from './DocIcon';

/**
 * Recursive, collapsible documentation navigation matching the Figma "User
 * docs" tree: bold top-level sections separated by rules, blue child links
 * indented by depth, triangle carets (right = collapsed, down = expanded).
 * Generated entirely from the manual's navigation tree, so it supports
 * arbitrary nesting.
 */
export default function NavigationTree({ nodes, activePath, onSelect, emptyLabel, root = false }) {
  if (!nodes || nodes.length === 0) {
    return emptyLabel ? <p className="awf-docs__nav-empty">{emptyLabel}</p> : null;
  }

  const className = root ? 'awf-docs__nav awf-docs__nav--root' : 'awf-docs__nav';

  return (
    <ul className={className}>
      {nodes.map((node) => (
        <NavigationNode
          key={node.path}
          node={node}
          depth={0}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

function NavigationNode({ node, depth, activePath, onSelect }) {
  const containsActive = nodeContains(node, activePath);
  const [expanded, setExpanded] = useState(containsActive);

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
              <NavigationNode key={child.path} node={child} depth={depth + 1} activePath={activePath} onSelect={onSelect} />
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
        style={{ paddingLeft: indent(depth) }}
        onClick={() => onSelect(node.path)}
      >
        {node.title}
      </button>
    </li>
  );
}

// Progressive indentation per nesting level (Figma steps ~20px per level).
function indent(depth) {
  return `${0.75 + depth * 1.25}rem`;
}

function nodeContains(node, path) {
  if (node.type === 'file') {
    return node.path === path;
  }
  return (node.children || []).some((child) => nodeContains(child, path));
}
