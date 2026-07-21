import jQuery from 'jquery';
import React from 'react';
import ReactDom from 'react-dom';
import DocumentationApp from './components/DocumentationApp';
import { TOGGLE_EVENT } from './constants';
import './styles/documentation.scss';

// The isolated documentation UI bootstrap. It does two decoupled things:
//   1. Injects a "Docs" button into the CMS north toolbar on every admin
//      screen (re-injected across PJAX navigation via entwine `onmatch`).
//   2. Mounts the React documentation panel once onto a body-level root.
// The button and panel communicate through a DOM CustomEvent, so a PJAX
// re-render of the toolbar never touches the mounted React tree.

const BUTTON_CLASS = 'awf-docs-button';
const PANEL_ROOT_ID = 'awf-docs-root';
// The north header is a flex row on every admin screen. Its class differs
// between the section view (`.cms-content-header.north`) and the record edit
// view (`.toolbar--north.cms-content-header`), but both carry
// `.cms-content-header`. Appending the button here — after the breadcrumbs
// and any tabs — keeps it pinned to the far right in both layouts.
const TOOLBAR_SELECTOR = '.cms-content-header';

// Exact Docs glyph from Figma (button node 2524:3992 "Other icons / Mask").
const DOCS_ICON = `
  <svg class="${BUTTON_CLASS}__icon" width="18" height="18" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
    <path d="M7 0C10.864 0 14 3.136 14 7C14 10.864 10.864 14 7 14C3.136 14 0 10.864 0 7C0 3.136 3.136 0 7 0ZM7 1.40039C3.913 1.40039 1.40039 3.913 1.40039 7C1.40039 10.087 3.913 12.5996 7 12.5996C10.087 12.5996 12.5996 10.087 12.5996 7C12.5996 3.913 10.087 1.40039 7 1.40039ZM7.7334 5.70801C8.0729 5.70801 8.44238 5.97995 8.44238 6.25195C8.44212 6.37557 8.33362 6.6106 8.24023 6.79688L6.64062 9.82617C6.57924 9.93751 6.59399 10.0116 6.70117 10.0117C6.91767 10.0117 7.76438 9.52942 8.15039 9.23242C8.33383 9.23242 8.48824 9.36886 8.44238 9.5293C7.84146 10.1727 6.47135 10.9998 5.20898 11C4.80779 11 4.50046 10.655 4.5 10.5068C4.5 10.3698 4.56062 10.2206 4.68262 9.97461L6.28516 6.89551C6.33158 6.79666 6.332 6.72289 6.25586 6.72266C5.99386 6.72266 5.13127 7.24226 4.88477 7.42676C4.69888 7.40267 4.57619 7.24184 4.63867 7.12988C5.46966 6.31449 6.91793 5.70806 7.7334 5.70801ZM8.39648 3C8.91953 3.00016 9.25856 3.26046 9.25879 3.72852C9.25879 4.27402 8.79639 4.73145 8.08789 4.73145C7.51862 4.73141 7.17988 4.42265 7.17969 4.02734C7.17919 3.48284 7.68748 3 8.39648 3Z"></path>
  </svg>`;

function injectButton(container) {
  // Document-wide guard: only one Docs button, even if several headers match.
  if (document.querySelector(`.${BUTTON_CLASS}`)) {
    return;
  }

  const $container = jQuery(container);

  const label = window.SS_ADVANCEDWORKFLOW_DOCS?.label || 'Docs';
  const $button = jQuery(
    `<button type="button" class="${BUTTON_CLASS}">${DOCS_ICON}<span>${label}</span></button>`
  );

  $button.on('click', (e) => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
  });

  // Always the last child of the north toolbar, after the breadcrumbs and any
  // tabs strip, pinned right via CSS. The host class lets us keep the row from
  // wrapping the button underneath the tabs.
  $container.addClass('awf-docs-host').append($button);
}

function ensurePanel() {
  if (document.getElementById(PANEL_ROOT_ID)) {
    return;
  }

  const root = document.createElement('div');
  root.id = PANEL_ROOT_ID;
  document.body.appendChild(root);

  ReactDom.render(<DocumentationApp />, root);
}

jQuery.entwine('ss.documentation', ($) => {
  $(TOOLBAR_SELECTOR).entwine({
    onmatch() {
      ensurePanel();
      injectButton(this[0]);
    },
  });
});
