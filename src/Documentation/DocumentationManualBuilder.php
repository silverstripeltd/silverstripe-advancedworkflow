<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use SilverStripe\Core\Injector\Injectable;
use SilverStripe\Core\Injector\Injector;

/**
 * Composes the discrete documentation services (finder, frontmatter parser,
 * markdown renderer, HTML processor, navigation and search builders) into a
 * single "manual" bundle for one locale.
 *
 * The bundle is a plain array so it serialises cleanly into the Silverstripe
 * cache and JSON responses. It is the single payload the frontend needs:
 * navigation, per-file rendered content, and the search index.
 */
class DocumentationManualBuilder
{
    use Injectable;

    private const TITLE_FALLBACK_PATTERN = '/^\s*#\s+(.+?)\s*$/m';

    /**
     * @param array<int, array{relativePath: string, absolutePath: string}> $files
     * @return array{
     *     navigation: array<int, array<string, mixed>>,
     *     files: array<string, array{path: string, title: string, order: int|null, html: string}>,
     *     searchIndex: array<int, array{path: string, title: string, searchText: string}>
     * }
     */
    public function build(array $files): array
    {
        $frontmatter = FrontmatterParser::create();
        $renderer = Injector::inst()->get(MarkdownRenderer::class);
        $processor = DocumentationHtmlProcessor::create();

        $parsedFiles = [];
        $navFiles = [];

        foreach ($files as $file) {
            $raw = @file_get_contents($file['absolutePath']);

            if ($raw === false) {
                // Unreadable file — skip rather than break the whole manual.
                continue;
            }

            $parsed = $frontmatter->parse($raw);
            $relative = $file['relativePath'];
            $title = $this->resolveTitle($parsed['metadata'], $parsed['body'], $relative);
            $order = $this->resolveOrder($parsed['metadata']);

            $html = $processor->process($renderer->render($parsed['body']), $relative);

            $parsedFiles[$relative] = [
                'path' => $relative,
                'title' => $title,
                'order' => $order,
                'html' => $html,
            ];

            $navFiles[] = ['relativePath' => $relative, 'title' => $title, 'order' => $order];
        }

        return [
            'navigation' => NavigationBuilder::create()->build($navFiles),
            'files' => $parsedFiles,
            'searchIndex' => SearchIndexBuilder::create()->build(array_values($parsedFiles)),
        ];
    }

    /**
     * @param array<string, mixed> $metadata
     */
    private function resolveTitle(array $metadata, string $body, string $relativePath): string
    {
        if (isset($metadata['title']) && is_scalar($metadata['title']) && (string) $metadata['title'] !== '') {
            return (string) $metadata['title'];
        }

        // Fall back to the first level-1 heading, then a humanised filename.
        if (preg_match(self::TITLE_FALLBACK_PATTERN, $body, $matches)) {
            return trim($matches[1]);
        }

        $name = basename($relativePath, '.md');

        return ucfirst(str_replace(['-', '_'], ' ', $name));
    }

    /**
     * @param array<string, mixed> $metadata
     */
    private function resolveOrder(array $metadata): ?int
    {
        return isset($metadata['order']) && is_numeric($metadata['order'])
            ? (int) $metadata['order']
            : null;
    }
}
