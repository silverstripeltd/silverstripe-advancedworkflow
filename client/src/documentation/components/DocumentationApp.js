import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Offcanvas, OffcanvasBody } from 'reactstrap';
import NavigationTree from './NavigationTree';
import SearchBox from './SearchBox';
import DocumentationContent from './DocumentationContent';
import { getConfig, TOGGLE_EVENT, MIN_PANEL_WIDTH, MAX_PANEL_WIDTH, DEFAULT_PANEL_WIDTH } from '../constants';
import { fetchManual, flattenFiles, searchPaths, filterNavigation } from '../lib/manual';

/**
 * The documentation panel: a resizable, right-hand slide-in (reactstrap
 * Offcanvas) with a search + navigation column and a content column. Opens in
 * response to the toolbar button's toggle event; the manual is fetched lazily
 * on first open and then cached in state.
 */
export default function DocumentationApp() {
  const { baseUrl } = getConfig();

  const [isOpen, setIsOpen] = useState(false);
  const [manual, setManual] = useState(null);
  const [status, setStatus] = useState('idle');
  const [activePath, setActivePath] = useState(null);
  const [query, setQuery] = useState('');
  const [width, setWidth] = useState(DEFAULT_PANEL_WIDTH);

  const close = useCallback(() => setIsOpen(false), []);

  // Toolbar button toggles the panel via a decoupled DOM event.
  useEffect(() => {
    const toggle = () => setIsOpen((open) => !open);
    document.addEventListener(TOGGLE_EVENT, toggle);
    return () => document.removeEventListener(TOGGLE_EVENT, toggle);
  }, []);

  // Lazily load the manual the first time the panel opens.
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
      <div className="awf-docs__header">
        <span className="awf-docs__eyebrow">Documentation</span>
        <button type="button" className="awf-docs__close" aria-label="Close documentation" onClick={close}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <OffcanvasBody className="awf-docs__body">
        {status === 'loading' && <p className="awf-docs__status">Loading documentation…</p>}
        {status === 'error' && <p className="awf-docs__status awf-docs__status--error">Documentation could not be loaded.</p>}
        {status === 'ready' && manual && (
          <div className="awf-docs__layout">
            <aside className="awf-docs__sidebar">
              <SearchBox value={query} onChange={setQuery} />
              <NavigationTree
                nodes={navigation}
                activePath={activePath}
                onSelect={navigate}
                emptyLabel={matchingPaths ? 'No matches' : ''}
              />
            </aside>
            <DocumentationContent
              file={activeFile}
              baseUrl={baseUrl}
              locale={manual.locale}
              query={query}
              pager={pager}
              onNavigate={navigate}
            />
          </div>
        )}
      </OffcanvasBody>
    </Offcanvas>
  );
}

/**
 * A drag handle on the panel's left edge that resizes its width (clamped).
 */
function ResizeHandle({ width, setWidth }) {
  const startRef = useRef({ x: 0, width });

  const onMouseDown = (e) => {
    startRef.current = { x: e.clientX, width };

    const onMove = (move) => {
      // Dragging left (smaller clientX) widens a right-anchored panel.
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
