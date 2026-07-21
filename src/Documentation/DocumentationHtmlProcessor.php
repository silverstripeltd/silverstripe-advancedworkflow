<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use DOMDocument;
use DOMElement;
use SilverStripe\Core\Injector\Injectable;

/**
 * Post-processes rendered documentation HTML so links and images behave
 * correctly inside the CMS docs panel. It is host- and URL-agnostic: it only
 * annotates elements with data attributes and lets the frontend resolve the
 * actual URLs, so cached HTML never bakes in an absolute site URL.
 *
 *  - Relative images (`images/x.png`) become `data-doc-image="{resolved}"`
 *    with the src removed, so the frontend can load them through the docs
 *    image endpoint (images are not stored in CMS assets).
 *  - Relative links to `.md` files become `data-doc-path="{resolved}"` so the
 *    frontend navigates inside the panel instead of leaving the CMS.
 *  - External links get `target="_blank"` and `rel="noopener noreferrer"`.
 */
class DocumentationHtmlProcessor
{
    use Injectable;

    public const IMAGE_ATTR = 'data-doc-image';
    public const LINK_ATTR = 'data-doc-path';
    public const ANCHOR_ATTR = 'data-doc-anchor';

    private const ROOT_ID = '__doc_root';

    public function process(string $html, string $currentRelativePath): string
    {
        if (trim($html) === '') {
            return '';
        }

        $currentDir = $this->directoryOf($currentRelativePath);

        $dom = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $dom->loadHTML(
            '<?xml encoding="UTF-8"?><div id="' . self::ROOT_ID . '">' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        foreach ($dom->getElementsByTagName('img') as $img) {
            $this->processImage($img, $currentDir);
        }

        // Collect anchors first — rewriting is safe to do while iterating a
        // static list rather than the live NodeList.
        $anchors = iterator_to_array($dom->getElementsByTagName('a'));
        foreach ($anchors as $anchor) {
            $this->processLink($anchor, $currentDir);
        }

        $this->assignHeadingIds($dom);

        return $this->innerHtml($dom);
    }

    /**
     * Give each section heading a stable slug id so the navigation can link to
     * it (the panel's in-page table of contents) and internal anchors resolve.
     */
    private function assignHeadingIds(DOMDocument $dom): void
    {
        $used = [];

        foreach (['h2', 'h3'] as $tag) {
            foreach ($dom->getElementsByTagName($tag) as $heading) {
                if ($heading->getAttribute('id') !== '') {
                    continue;
                }
                $heading->setAttribute('id', $this->uniqueSlug($heading->textContent, $used));
            }
        }
    }

    /**
     * Extract the H2/H3 headings (with their slug ids) from processed HTML, so
     * the navigation can offer a per-page table of contents.
     *
     * @return array<int, array{id: string, text: string, level: int}>
     */
    public function extractHeadings(string $html): array
    {
        if (!preg_match_all('/<h([23])\s[^>]*id="([^"]+)"[^>]*>(.*?)<\/h\1>/is', $html, $matches, PREG_SET_ORDER)) {
            return [];
        }

        return array_map(static fn ($m) => [
            'id' => $m[2],
            'text' => trim(html_entity_decode(strip_tags($m[3]), ENT_QUOTES | ENT_HTML5, 'UTF-8')),
            'level' => (int) $m[1],
        ], $matches);
    }

    /**
     * @param array<string, bool> $used
     */
    private function uniqueSlug(string $text, array &$used): string
    {
        $base = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $text) ?? '', '-')) ?: 'section';
        $slug = $base;
        $n = 2;

        while (isset($used[$slug])) {
            $slug = $base . '-' . $n++;
        }

        $used[$slug] = true;

        return $slug;
    }

    private function processImage(DOMElement $img, string $currentDir): void
    {
        $src = $img->getAttribute('src');

        if (!$this->isRelative($src)) {
            return;
        }

        $img->setAttribute(self::IMAGE_ATTR, $this->resolvePath($currentDir, $src));
        $img->removeAttribute('src');
    }

    private function processLink(DOMElement $anchor, string $currentDir): void
    {
        $href = $anchor->getAttribute('href');

        if ($href === '' || str_starts_with($href, '#')) {
            return;
        }

        if ($this->isExternal($href)) {
            $anchor->setAttribute('target', '_blank');
            $anchor->setAttribute('rel', 'noopener noreferrer');
            return;
        }

        if (!$this->isRelative($href)) {
            return;
        }

        [$path, $anchorName] = $this->splitAnchor($href);

        if (!str_ends_with(strtolower($path), '.md')) {
            return;
        }

        $anchor->setAttribute(self::LINK_ATTR, $this->resolvePath($currentDir, $path));

        if ($anchorName !== '') {
            $anchor->setAttribute(self::ANCHOR_ATTR, $anchorName);
        }

        $anchor->setAttribute('href', '#');
    }

    /**
     * @return array{0: string, 1: string} [path, anchor]
     */
    private function splitAnchor(string $href): array
    {
        $hashPos = strpos($href, '#');

        if ($hashPos === false) {
            return [$href, ''];
        }

        return [substr($href, 0, $hashPos), substr($href, $hashPos + 1)];
    }

    private function isExternal(string $url): bool
    {
        return (bool) preg_match('#^([a-z][a-z0-9+.-]*:)?//#i', $url) || (bool) preg_match('#^[a-z][a-z0-9+.-]*:#i', $url);
    }

    private function isRelative(string $url): bool
    {
        if ($url === '' || str_starts_with($url, '/') || str_starts_with($url, '#')) {
            return false;
        }

        return !$this->isExternal($url);
    }

    private function directoryOf(string $relativePath): string
    {
        $dir = str_replace('\\', '/', dirname($relativePath));

        return $dir === '.' ? '' : $dir;
    }

    /**
     * Resolve a relative reference against the current file's directory and
     * normalise away any `.`/`..` segments, clamped so it can never escape the
     * user guide root.
     */
    private function resolvePath(string $currentDir, string $reference): string
    {
        $combined = $currentDir === '' ? $reference : $currentDir . '/' . $reference;
        $segments = [];

        foreach (explode('/', $combined) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }

            if ($segment === '..') {
                array_pop($segments);
                continue;
            }

            $segments[] = $segment;
        }

        return implode('/', $segments);
    }

    private function innerHtml(DOMDocument $dom): string
    {
        // With LIBXML_HTML_NOIMPLIED the wrapper div is the document element.
        $root = $dom->documentElement;

        if (!$root instanceof DOMElement) {
            return '';
        }

        $html = '';
        foreach ($root->childNodes as $child) {
            $html .= $dom->saveHTML($child);
        }

        return trim($html);
    }
}
