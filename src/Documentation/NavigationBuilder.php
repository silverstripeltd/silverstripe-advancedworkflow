<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use SilverStripe\Core\Injector\Injectable;

/**
 * Builds a nested navigation tree from discovered documentation files.
 *
 * The tree is generated dynamically from the file paths and their metadata —
 * nothing is hardcoded — and supports arbitrarily nested folders for future
 * documentation trees. Ordering respects the optional `order` frontmatter
 * field, falling back to title for a stable, predictable sort.
 */
class NavigationBuilder
{
    use Injectable;

    public const INDEX_FILE = 'index.md';

    private const DEFAULT_ORDER = 1000;

    /**
     * @param array<int, array{relativePath: string, title: string, order: int|null}> $files
     * @return array<int, array<string, mixed>>
     */
    public function build(array $files): array
    {
        $tree = ['files' => [], 'folders' => []];

        foreach ($files as $file) {
            $this->insert($tree, explode('/', $file['relativePath']), $file);
        }

        return $this->flatten($tree, '');
    }

    /**
     * @param array{files: array<int, mixed>, folders: array<string, mixed>} $tree
     * @param array<int, string> $segments
     * @param array{relativePath: string, title: string, order: int|null} $file
     */
    private function insert(array &$tree, array $segments, array $file): void
    {
        $segment = array_shift($segments);

        if ($segments === []) {
            $tree['files'][] = ['segment' => $segment, 'file' => $file];
            return;
        }

        if (!isset($tree['folders'][$segment])) {
            $tree['folders'][$segment] = ['files' => [], 'folders' => []];
        }

        $this->insert($tree['folders'][$segment], $segments, $file);
    }

    /**
     * @param array{files: array<int, mixed>, folders: array<string, mixed>} $tree
     * @return array<int, array<string, mixed>>
     */
    private function flatten(array $tree, string $pathPrefix): array
    {
        $nodes = [];

        foreach ($tree['files'] as $entry) {
            $file = $entry['file'];
            $nodes[] = [
                'type' => 'file',
                'title' => $file['title'],
                'path' => $file['relativePath'],
                'order' => $this->orderFor($entry['segment'], $file['order']),
            ];
        }

        foreach ($tree['folders'] as $segment => $subtree) {
            $children = $this->flatten($subtree, $pathPrefix . $segment . '/');
            $nodes[] = [
                'type' => 'folder',
                'title' => $this->humanise($segment),
                'path' => $pathPrefix . $segment,
                'order' => $this->minOrder($children),
                'children' => $children,
            ];
        }

        usort($nodes, static function ($a, $b) {
            return [$a['order'], $a['title']] <=> [$b['order'], $b['title']];
        });

        return $nodes;
    }

    private function orderFor(string $segment, ?int $order): int
    {
        if ($order !== null) {
            return $order;
        }

        // An index page is the natural landing point, so it leads its level.
        return strtolower($segment) === self::INDEX_FILE ? 0 : self::DEFAULT_ORDER;
    }

    /**
     * @param array<int, array<string, mixed>> $children
     */
    private function minOrder(array $children): int
    {
        $orders = array_column($children, 'order');

        return $orders === [] ? self::DEFAULT_ORDER : (int) min($orders);
    }

    private function humanise(string $segment): string
    {
        return ucfirst(str_replace(['-', '_'], ' ', $segment));
    }
}
