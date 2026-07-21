import React from 'react';

/**
 * Search input shown above the navigation. Filtering itself is done by the
 * parent against the cached search index; this is a controlled input.
 */
export default function SearchBox({ value, onChange }) {
  return (
    <div className="awf-docs__search">
      <svg className="awf-docs__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        className="awf-docs__search-input"
        placeholder="Search documentation…"
        aria-label="Search documentation"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
