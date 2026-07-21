# Documentation feature — progress

Branch: `improve`. Plan: `docs/user-documentation-plan.md`.

## Done (committed)
- **9d4787a3** — Full feature: backend (`src/Documentation`), frontend
  (`client/src/documentation`), 35 PHPUnit + 30 Jest tests, `league/commonmark`
  require, disabled by default, Docs button scoped to `admin/workflows`.
  Verified live in cms.test.

## Done (Figma-exact restyle — verified live, pending commit)
Rebuilt panel/nav to match extracted Figma data exactly: icon rail (search+list),
"User docs" nav column, centered 650px content with info-icon eyebrow + 28px
title + prev/next pager, close X; exact icon SVGs inlined in DocIcon.js; exact
button glyph. 30 Jest pass; verified live at /admin/workflows (0 errors).
Also added rule /claude/12-checkpointing.md (repo /Users/mo/Sites/ai-rules).

## Figma-exact panel/nav restyle (reference)
Extracted exact data via `get_design_context` (NOT screenshots):
- Panel node `2526-4017`, Nav node `2528-4712`, Button node `2524-3992`.
- Downloaded exact icon SVGs → inlined into `components/DocIcon.js`
  (docs, info, close, list, search, caret-down, caret-right).

Target structure (from data):
- Panel = narrow **icon rail** (search + list, border-right #c8d0dd, p20 gap20)
  → toggleable **nav column** ("User docs" header #f4f6f8 + search + tree)
  → **centered content** max-width 650px, pt50.
- Content header: eyebrow (info icon + "Workflows Docs" #566b8d 14px) + title
  28px bold #303b4d; prose 15px/1.5; prev/next pager (top border #d4dbe5);
  absolute close X top-right.
- Nav tree: top-level bold 14px #43536d + caret (right=collapsed/down=expanded),
  border-top #e1e5ed between sections, py15 px20; child links regular 13px
  #0071c4 indented by depth; active parent bold #0071c4.

### Next steps
1. Add `components/DocIcon.js` (done inline paths).
2. Rewrite `DocumentationApp.js` (icon rail + nav column + centered content + close X).
3. Restyle `NavigationTree.js` + CSS to Figma tree spec.
4. `DocumentationContent.js`: eyebrow + 28px title (from file.title, strip leading
   H1 dup) + pager.
5. Rewrite `styles/documentation.scss` panel section to exact tokens.
6. Keep test class names stable (`__nav-link/__nav-folder/__search-input/__article/__mark`).
7. Build, `yarn test`, sync to cms vendor, `curl /?flush=1`, browser-verify, then commit.

### Resume/verify commands
- Build: `nvm use 20 && yarn --cwd client build`
- JS tests: `yarn --cwd client test`
- PHP tests: move `cms/app/fixtures/PageFixture.php` aside; `php8.4 vendor/bin/phpunit vendor/symbiote/silverstripe-advancedworkflow/tests/php/Documentation`; restore.
- Sync: rsync `client/`,`src/`,`_config/` → `cms/vendor/symbiote/silverstripe-advancedworkflow/`
- Web flush: `curl http://cms.test/?flush=1` (config changes need this).
- Verify: claude-browse on `http://cms.test/admin/workflows` (login admin/admin).
See memory: [[documentation-feature]], [[cms-test-phpunit]].
