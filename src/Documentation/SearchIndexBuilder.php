<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use SilverStripe\Core\Injector\Injectable;

/**
 * Builds the client-side search index from the parsed documentation.
 *
 * The index is generated when the documentation cache is built and searched
 * entirely client-side. It indexes the rendered text content — not just
 * filenames — so a query like "approval" matches a page whose body mentions
 * it. Matching itself (case-insensitive, partial) happens in the browser.
 */
class SearchIndexBuilder
{
    use Injectable;

    /**
     * @param array<int, array{path: string, title: string, html: string}> $files
     * @return array<int, array{path: string, title: string, searchText: string}>
     */
    public function build(array $files): array
    {
        $index = [];

        foreach ($files as $file) {
            $index[] = [
                'path' => $file['path'],
                'title' => $file['title'],
                'searchText' => $this->toPlainText($file['html']),
            ];
        }

        return $index;
    }

    private function toPlainText(string $html): string
    {
        $text = strip_tags($html);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        // Collapse all whitespace runs into single spaces for compact indexing.
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return trim($text);
    }
}
