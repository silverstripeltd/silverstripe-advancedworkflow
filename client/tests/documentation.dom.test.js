/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import NavigationTree from '../src/documentation/components/NavigationTree';
import SearchBox from '../src/documentation/components/SearchBox';
import DocumentationContent from '../src/documentation/components/DocumentationContent';

// Silence React 18 act-environment flag noise.
global.IS_REACT_ACT_ENVIRONMENT = true;

function render(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, root };
}

const NAV = [
  { type: 'file', title: 'Overview', path: 'index.md', order: 0 },
  {
    type: 'folder',
    title: 'Advanced',
    path: 'advanced',
    order: 10,
    children: [{ type: 'file', title: 'Nested', path: 'advanced/nested.md', order: 10 }],
  },
];

describe('NavigationTree', () => {
  it('marks the active file and selects on click', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <NavigationTree nodes={NAV} activePath="index.md" onSelect={onSelect} emptyLabel="" />
    );

    const overview = [...container.querySelectorAll('.awf-docs__nav-link')].find((b) => b.textContent === 'Overview');
    expect(overview.classList.contains('is-active')).toBe(true);

    act(() => overview.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onSelect).toHaveBeenCalledWith('index.md');
  });

  it('collapses folders until expanded', () => {
    const { container } = render(
      <NavigationTree nodes={NAV} activePath="index.md" onSelect={jest.fn()} emptyLabel="" />
    );

    // The folder does not contain the active file, so it starts collapsed.
    expect(container.textContent).not.toContain('Nested');

    const folder = container.querySelector('.awf-docs__nav-folder');
    act(() => folder.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('Nested');
  });
});

describe('NavigationTree accordion (page headings)', () => {
  const files = {
    'index.md': { headings: [{ id: 'intro', text: 'Intro', level: 2 }, { id: 'setup', text: 'Setup', level: 2 }] },
  };
  const pages = [{ type: 'file', title: 'Overview', path: 'index.md', order: 0 }];

  it('expands a page to its headings and navigates to a heading', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <NavigationTree nodes={pages} activePath={null} onSelect={onSelect} emptyLabel="" files={files} />
    );

    expect(container.textContent).not.toContain('Intro');
    act(() => container.querySelector('.awf-docs__nav-toggle').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('Intro');

    const toc = [...container.querySelectorAll('.awf-docs__toc-link')].find((b) => b.textContent === 'Setup');
    act(() => toc.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onSelect).toHaveBeenCalledWith('index.md', 'setup');
  });

  it('selects the page when its label is clicked', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <NavigationTree nodes={pages} activePath={null} onSelect={onSelect} emptyLabel="" files={files} />
    );
    act(() => container.querySelector('.awf-docs__nav-link').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onSelect).toHaveBeenCalledWith('index.md');
  });
});

describe('SearchBox', () => {
  it('reports input changes', () => {
    const onChange = jest.fn();
    const { container } = render(<SearchBox value="" onChange={onChange} />);
    const input = container.querySelector('.awf-docs__search-input');

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => {
      setter.call(input, 'approval');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith('approval');
  });

  it('renders a close button that fires onClose', () => {
    const onClose = jest.fn();
    const { container } = render(<SearchBox value="" onChange={jest.fn()} onClose={onClose} />);
    const close = container.querySelector('.awf-docs__search-close');
    expect(close).not.toBeNull();
    act(() => close.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onClose).toHaveBeenCalled();
  });

  it('omits the close button when no onClose is given', () => {
    const { container } = render(<SearchBox value="" onChange={jest.fn()} />);
    expect(container.querySelector('.awf-docs__search-close')).toBeNull();
  });
});

describe('DocumentationContent', () => {
  const file = {
    path: 'index.md',
    title: 'Overview',
    html: '<p><img data-doc-image="images/x.png" alt="x">'
      + '<a data-doc-path="actions.md" href="#">Actions</a> approval details here</p>',
  };
  const pager = { prev: null, next: null };

  it('resolves image placeholders to the image endpoint', () => {
    const { container } = render(
      <DocumentationContent file={file} baseUrl="/documentation-admin" locale="en" query="" pager={pager} onNavigate={jest.fn()} />
    );

    const img = container.querySelector('.awf-docs__article img');
    expect(img.getAttribute('src')).toBe('/documentation-admin/image?locale=en&path=images%2Fx.png');
  });

  it('intercepts internal links for in-panel navigation', () => {
    const onNavigate = jest.fn();
    const { container } = render(
      <DocumentationContent file={file} baseUrl="/documentation-admin" locale="en" query="" pager={pager} onNavigate={onNavigate} />
    );

    const link = container.querySelector('.awf-docs__article [data-doc-path]');
    act(() => link.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onNavigate).toHaveBeenCalledWith('actions.md');
  });

  it('highlights search matches in the content', () => {
    const { container } = render(
      <DocumentationContent file={file} baseUrl="/documentation-admin" locale="en" query="approval" pager={pager} onNavigate={jest.fn()} />
    );

    const mark = container.querySelector('.awf-docs__article .awf-docs__mark');
    expect(mark).not.toBeNull();
    expect(mark.textContent.toLowerCase()).toBe('approval');
  });
});
