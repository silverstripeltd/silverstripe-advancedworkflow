import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Offcanvas } from 'reactstrap';
import DocIcon from './DocIcon';
import NavigationTree from './NavigationTree';
import SearchBox from './SearchBox';
import DocumentationContent from './DocumentationContent';
import {
  getConfig, TOGGLE_EVENT, NAV_TITLE,
  MIN_PANEL_WIDTH, MAX_PANEL_WIDTH, DEFAULT_PANEL_WIDTH,
} from '../constants';
import { fetchManual, flattenFiles, searchPaths, filterNavigation } from '../lib/manual';

/**
 * The documentation panel, laid out to match the Figma design: a narrow icon
 * rail (search + navigation toggle), a collapsible "User docs" navigation
 * column, and a centred content column. It is a resizable right-hand slide-in
 * (reactstrap Offcanvas) opened by the toolbar button's toggle event; the
 * manual is fetched lazily on first open and cached in state.
 */
export default function DocumentationApp() {
  const { baseUrl } = getConfig();

  const [isOpen, setIsOpen] = useState(false);
  const [manual, setManual] = useState(null);
  const [status, setStatus] = useState('idle');
  const [activePath, setActivePath] = useState(null);
  const [query, setQuery] = useState('');
  const [width, setWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [navOpen, setNavOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const toggle = () => setIsOpen((open) => !open);
    document.addEventListener(TOGGLE_EVENT, toggle);
    return () => document.removeEventListener(TOGGLE_EVENT, toggle);
  }, []);

  useEffect(() => {
    if (!isOpen || status !== 'idle') {
      return;
    }
    setStatus('loading');
    fetchManual(baseUrl)
      .then((data) => {
        setManual(data);
        const files = flattenFiles(data.navigation);
        setActivePath(files.length ? files[0].path : null);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [isOpen, status, baseUrl]);

  const matchingPaths = manual ? searchPaths(manual.searchIndex, query) : null;
  const navigation = manual ? filterNavigation(manual.navigation, matchingPaths) : [];
  const files = manual ? flattenFiles(manual.navigation) : [];
  const activeIndex = files.findIndex((f) => f.path === activePath);
  const activeFile = manual && activePath ? manual.files[activePath] : null;

  const pager = {
    prev: activeIndex > 0 ? files[activeIndex - 1] : null,
    next: activeIndex >= 0 && activeIndex < files.length - 1 ? files[activeIndex + 1] : null,
  };

  const navigate = useCallback((path) => {
    setActivePath(path);
    setQuery('');
    setSearchOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    setNavOpen(true);
    setSearchOpen(true);
  }, []);

  return (
    <Offcanvas
      isOpen={isOpen}
      toggle={close}
      direction="end"
      className="awf-docs"
      style={{ width: `${width}px`, maxWidth: '100%' }}
      aria-label="Documentation"
    >
      <ResizeHandle width={width} setWidth={setWidth} />
      <button type="button" className="awf-docs__close" aria-label="Close documentation" onClick={close}>
        <DocIcon name="close" />
      </button>

      <div className="awf-docs__shell">
        <div className="awf-docs__rail">
          <button
            type="button"
            className={`awf-docs__rail-btn ${searchOpen ? 'is-active' : ''}`}
            aria-label="Search documentation"
            aria-pressed={searchOpen}
            onClick={openSearch}
          >
            <DocIcon name="search" />
          </button>
          <button
            type="button"
            className={`awf-docs__rail-btn ${navOpen ? 'is-active' : ''}`}
            aria-label="Toggle navigation"
            aria-pressed={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <DocIcon name="list" />
          </button>
        </div>

        {navOpen && status === 'ready' && (
          <aside className="awf-docs__nav-col">
            <div className="awf-docs__nav-head">
              <span className="awf-docs__nav-title">{NAV_TITLE}</span>
              <button
                type="button"
                className="awf-docs__nav-search-btn"
                aria-label="Search documentation"
                onClick={openSearch}
              >
                <DocIcon name="search" />
              </button>
            </div>
            {searchOpen && <SearchBox value={query} onChange={setQuery} />}
            <div className="awf-docs__nav-scroll">
              <NavigationTree
                nodes={navigation}
                activePath={activePath}
                onSelect={navigate}
                emptyLabel={matchingPaths ? 'No matches' : ''}
                root
              />
            </div>
          </aside>
        )}

        <div className="awf-docs__main">
          {status === 'loading' && <p className="awf-docs__status">Loading documentation…</p>}
          {status === 'error' && (
            <p className="awf-docs__status awf-docs__status--error">Documentation could not be loaded.</p>
          )}
          {status === 'ready' && (
            <DocumentationContent
              file={activeFile}
              baseUrl={baseUrl}
              locale={manual.locale}
              query={query}
              pager={pager}
              onNavigate={navigate}
            />
          )}
        </div>
      </div>
    </Offcanvas>
  );
}

/**
 * Drag handle on the panel's left edge to resize its width (clamped).
 */
function ResizeHandle({ width, setWidth }) {
  const startRef = useRef({ x: 0, width });

  const onMouseDown = (e) => {
    startRef.current = { x: e.clientX, width };

    const onMove = (move) => {
      const delta = startRef.current.x - move.clientX;
      const next = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startRef.current.width + delta));
      setWidth(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('awf-docs-resizing');
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.classList.add('awf-docs-resizing');
    e.preventDefault();
  };

  return (
    <div
      className="awf-docs__resize"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize documentation panel"
      onMouseDown={onMouseDown}
    />
  );
}
