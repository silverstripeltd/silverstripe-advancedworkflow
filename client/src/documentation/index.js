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

const DOCS_ICON = `
  <svg class="${BUTTON_CLASS}__icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
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
