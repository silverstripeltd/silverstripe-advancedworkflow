# CMS User Documentation Feature Implementation Plan

## Goal

Implement an opt-in CMS user documentation feature.

This implementation is **not creating the final standalone documentation module yet**. However, all implementation
decisions must allow this functionality to be extracted into its own module in the future.

The implementation should demonstrate how this feature could become a reusable documentation module with minimal
changes.

All documentation-related code, services, frontend components, templates, and assets must be isolated.

---

# Architecture Requirements

The implementation must be extraction-ready.

Avoid placing documentation-specific logic into unrelated CMS classes.

The following areas should be isolated:

- Documentation discovery
- Documentation validation
- Locale handling
- Markdown parsing
- Frontmatter parsing
- Cache management
- Search indexing
- CMS UI components
- Documentation rendering

The implementation should allow these parts to be moved into a standalone module later.

---

# Module Configuration

The documentation feature must be controlled through module configuration.

The feature must not be enabled by default.

Example configuration:

```yaml
Documentation:
  enabled: true
```

Requirements:

- Configuration must default to disabled.
- Documentation functionality should only initialise when enabled.
- CMS UI elements must not be registered when disabled.
- Documentation scanning, parsing, caching, and indexing must not run when disabled.

---

## Disabled Behaviour

Example:

```yaml
Documentation:
  enabled: false
```

Result:

- No Docs button appears in CMS.
- No documentation services initialise.
- No documentation cache is generated.
- No documentation files are scanned.

---

## Enabled Behaviour

Example:

```yaml
Documentation:
  enabled: true
```

When enabled:

1. Validate documentation structure.
2. Detect CMS locale.
3. Load documentation from the correct locale folder.
4. Generate or load documentation cache.
5. Generate or load search index.
6. Register CMS documentation UI.

---

## Future Configuration Support

The configuration structure should allow future expansion.

Example:

```yaml
Documentation:
  enabled: true
  default_locale: en
  sections:
    userguide:
      enabled: true
    developer:
      enabled: false
```

Only `enabled` is required initially.

---

# Documentation Storage Structure

Documentation is stored inside the module filesystem.

Example:

```
docs/
├── en/
│   ├── index.md
│   ├── userguide/
│   │   ├── index.md
│   │   ├── workflow.md
│   │   ├── workflow-actions.md
│   │   ├── workflow-transitions.md
│   │   ├── workflow-configuration.md
│   │   ├── workflow-configuration-actions.md
│   │   └── images/
│   │       └── workflow.png
│   │
│   └── developer/
│       ├── index.md
│       ├── workflow.md
│       └── images/
```

Documentation is not stored in the CMS database.

The system reads markdown files directly from the module `docs` folder.

---

# Documentation Locale Support

Documentation must support CMS multilingual functionality.

When loading documentation:

1. Detect the current CMS locale.
2. Attempt to load:

```
docs/{locale}/userguide/
```

3. If unavailable, fallback to:

```
docs/en/userguide/
```

Example:

CMS locale:

```
fr
```

Attempt:

```
docs/fr/userguide/
```

Fallback:

```
docs/en/userguide/
```

The system should support additional languages by simply adding new locale folders.

---

# Documentation Enablement Validation

The feature is enabled only when:

1. Module configuration has documentation enabled.
2. Documentation folder exists.
3. Required documentation structure exists.

Minimum required structure:

```
docs/{locale}/userguide/index.md
```

Validation must check:

- docs folder exists
- locale folder exists
- userguide folder exists
- index.md exists
- markdown files are readable

If validation fails:

- Documentation button is hidden.
- Documentation services are disabled.
- A useful developer warning should be logged.

---

# Documentation Scope

The module supports both:

```
userguide/
developer/
```

However, the CMS documentation panel currently exposes only:

```
userguide/
```

The purpose of the CMS documentation panel is to help CMS users understand the interface they are currently using.

Developer documentation exists for future expansion but should not be displayed in the UI at this stage.

Do not implement developer documentation navigation.

---

# Documentation Metadata (Frontmatter)

Markdown files should support optional frontmatter metadata.

Example:

```md
---
title: Workflow Actions
order: 20
description: Configure workflow actions
---

# Workflow Actions
```

Initial supported metadata:

| Field | Purpose                    |
|-------|----------------------------|
| title | Display name in navigation |
| order | Navigation ordering        |

The metadata system should be designed so additional fields can be added later without architectural changes.

Possible future metadata:

```yaml
---
title: Workflow Actions
order: 20
category: Workflow
permissions:
  - ADMIN
---
```

---

# Documentation Discovery

Documentation files must be discovered dynamically.

The navigation must not be hardcoded.

The system should:

- Recursively discover markdown files.
- Parse frontmatter metadata.
- Build navigation structure.
- Respect ordering.
- Support future nested folders.

Documentation source:

```
docs/{locale}/userguide/
```

---

# Documentation Loading and Caching

Documentation should be loaded from the filesystem.

To improve performance:

- Parse documentation only when required.
- Cache processed documentation using Silverstripe cache.
- Avoid filesystem reads on every request.

The cache should contain:

- File list.
- Metadata.
- Parsed content.
- Searchable text.
- Navigation structure.

Example:

```json
{
    "files": [
        {
            "path": "workflow-actions.md",
            "title": "Workflow Actions",
            "order": 20,
            "content": "...",
            "searchText": "..."
        }
    ]
}
```

Cache should be invalidated when:

- Documentation files change.
- Module version changes.
- Cache is manually cleared.

---

# Search Implementation

Search should use a generated JSON search index.

The index is generated when documentation cache is built.

Search is performed client-side using the cached index.

Requirements:

- Search markdown content, not filenames only.
- Case insensitive.
- Support partial matches.

Example:

Search:

```
approval
```

Should match:

```
workflow-actions.md
```

if content contains:

```
Approval action configuration
```

Search results:

- Filter documentation navigation.
- Highlight matching results.
- Highlight matching text in rendered content.

---

# Image Handling

Documentation images live inside the documentation folder.

Example:

```
workflow.md

images/
└── workflow.png
```

Markdown:

```md
![Workflow](images/workflow.png)
```

The renderer must resolve relative image paths automatically.

Images are not stored in CMS assets.

---

# Markdown Rendering

Documentation content must support:

- Headings
- Paragraphs
- Lists
- Tables
- Code blocks
- Inline code
- Images
- Internal links
- External links

Example internal link:

```md
[Workflow Actions](workflow-actions.md)
```

Internal links should navigate inside the documentation panel.

External links should:

- Open in a new browser tab.
- Not navigate away from CMS.

---

# Markdown Security

Markdown content must be sanitised before rendering.

Requirements:

- Allow safe HTML where required.
- Remove unsafe HTML.
- Prevent JavaScript execution.
- Prevent XSS attacks.

Use an allow-list based HTML sanitiser.

---

# CMS UI Integration

## Documentation Button

When documentation is enabled and documentation structure is valid:

Display a button in the CMS top-right toolbar.

Design:

Figma:
https://www.figma.com/design/rMGY4EECDgjFfo0HhWDC6M/Silverstripe-CMS?node-id=2511-1993

Requirements:

- Blue button.
- Label: `Docs`.
- Only visible when documentation is available.
- Hidden when documentation is disabled or invalid.

Claude Code should use Figma MCP to inspect the latest design.

---

# Documentation Panel

When the Docs button is clicked:

Open a slide-in documentation panel.

Design:

Figma:
https://www.figma.com/design/rMGY4EECDgjFfo0HhWDC6M/Silverstripe-CMS?node-id=2526-4017

Requirements:

- Slide-in panel.
- Resizable width.
- Closable.
- Close button in top-right corner.
- Clicking outside the panel closes it.
- Content area has independent scrolling.
- Panel should not block normal CMS behaviour when closed.

---

# Panel Layout

```
---------------------------------
| Search     |                  |
---------------------------------
| Navigation | Documentation    |
|            |                  |
| File list  | Markdown content |
|            |                  |
---------------------------------
```

---

# Documentation Navigation

Left side navigation:

Design:

Figma:
https://www.figma.com/design/rMGY4EECDgjFfo0HhWDC6M/Silverstripe-CMS?node-id=2528-4712

Requirements:

- Display documentation file list.
- Generated dynamically.
- Support folders.
- Expand/collapse folders.
- Independent scrolling.
- Selecting a file loads its content.

---

# Documentation Search UI

Search is located above the navigation.

Design:

Figma:
https://www.figma.com/design/rMGY4EECDgjFfo0HhWDC6M/Silverstripe-CMS?node-id=2528-4712

Requirements:

- Search documentation content.
- Filter navigation results.
- Highlight matching files.
- Highlight matches in content.

---

# Content Display Area

The right side displays rendered documentation.

Requirements:

- Render markdown correctly.
- Support headings, lists, code blocks, tables, images.
- Support internal navigation.
- Support external links.
- Independent scrolling.
- Match Figma design.

Design:

Figma:
https://www.figma.com/design/rMGY4EECDgjFfo0HhWDC6M/Silverstripe-CMS?node-id=2526-4017

---

# Testing Requirements

## Backend Tests

Test:

- Configuration disabled behaviour.
- Documentation discovery.
- Missing documentation folders.
- Invalid documentation structure.
- Locale detection.
- English fallback.
- Frontmatter parsing.
- Cache generation.
- Cache invalidation.
- Search index generation.

---

## Frontend Tests

Test:

- Docs button visibility.
- Panel opening.
- Panel closing.
- Click outside closing.
- Resize behaviour.
- Navigation loading.
- Search filtering.
- Highlighting.
- Markdown rendering.
- Internal links.

---

# Claude Code Sub-Agent Recommendation

Use separate sub-agents for implementation.

## Agent 1: Documentation Backend

Responsibilities:

- Module configuration.
- Documentation discovery.
- Locale handling.
- Validation.
- Markdown parsing.
- Frontmatter parsing.
- Silverstripe cache integration.
- Search index generation.
- Backend tests.

---

## Agent 2: CMS Frontend UI

Responsibilities:

- CMS toolbar Docs button.
- Slide-in panel.
- Navigation tree.
- Search interface.
- Markdown viewer.
- Figma implementation.

---

## Agent 3: QA and Review

Responsibilities:

- Review architecture.
- Verify extraction readiness.
- Identify missing edge cases.
- Add automated tests.
- Review security.
- Review performance.

---

# Before Implementation

Claude Code must:

1. Review existing CMS architecture.
2. Identify correct CMS extension points.
3. Identify frontend framework/components used by CMS.
4. Review Figma designs using MCP.
5. Propose implementation approach before writing code.
6. Confirm implementation remains extraction-ready.
