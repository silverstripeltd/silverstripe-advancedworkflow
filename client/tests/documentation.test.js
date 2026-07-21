import {
  flattenFiles,
  searchPaths,
  filterNavigation,
  resolveImages,
} from '../src/documentation/lib/manual';

const navigation = [
  { type: 'file', title: 'Overview', path: 'index.md', order: 0 },
  {
    type: 'folder',
    title: 'Advanced',
    path: 'advanced',
    order: 10,
    children: [
      { type: 'file', title: 'Nested', path: 'advanced/nested.md', order: 10 },
      { type: 'file', title: 'Transitions', path: 'advanced/transitions.md', order: 20 },
    ],
  },
  { type: 'file', title: 'Actions', path: 'actions.md', order: 20 },
];

const searchIndex = [
  { path: 'index.md', title: 'Overview', searchText: 'welcome to the guide' },
  { path: 'actions.md', title: 'Actions', searchText: 'configure the approval action' },
  { path: 'advanced/nested.md', title: 'Nested', searchText: 'nothing relevant here' },
];

describe('flattenFiles', () => {
  it('returns files depth-first in navigation order', () => {
    expect(flattenFiles(navigation).map((f) => f.path)).toEqual([
      'index.md',
      'advanced/nested.md',
      'advanced/transitions.md',
      'actions.md',
    ]);
  });
});

describe('searchPaths', () => {
  it('returns null for an empty query (no active search)', () => {
    expect(searchPaths(searchIndex, '')).toBeNull();
    expect(searchPaths(searchIndex, '   ')).toBeNull();
  });

  it('matches title or body, case-insensitively and partially', () => {
    const matches = searchPaths(searchIndex, 'APPROV');
    expect([...matches]).toEqual(['actions.md']);
  });

  it('matches on title too', () => {
    const matches = searchPaths(searchIndex, 'overview');
    expect(matches.has('index.md')).toBe(true);
  });

  it('returns an empty set when nothing matches', () => {
    expect([...searchPaths(searchIndex, 'zzznothing')]).toEqual([]);
  });
});

describe('filterNavigation', () => {
  it('returns the full tree when there is no active search', () => {
    expect(filterNavigation(navigation, null)).toBe(navigation);
  });

  it('keeps only branches containing a match, preserving folder ancestors', () => {
    const filtered = filterNavigation(navigation, new Set(['advanced/nested.md']));

    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe('folder');
    expect(filtered[0].children.map((c) => c.path)).toEqual(['advanced/nested.md']);
  });

  it('drops folders with no matching descendants', () => {
    const filtered = filterNavigation(navigation, new Set(['actions.md']));

    expect(filtered.map((n) => n.path)).toEqual(['actions.md']);
  });
});

describe('resolveImages', () => {
  it('leaves HTML without image placeholders untouched', () => {
    const html = '<p>No images here</p>';
    expect(resolveImages(html, '/documentation-admin', 'en')).toBe(html);
  });
});
