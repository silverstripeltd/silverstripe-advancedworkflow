<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SilverStripe\Core\Injector\Injectable;
use SplFileInfo;

/**
 * Recursively discovers markdown files under a user guide folder.
 *
 * Discovery is dynamic — navigation is never hardcoded — and returns
 * lightweight descriptors (relative path plus mtime/size for cache
 * signatures). Nested folders are supported so future documentation trees
 * work without changes here.
 */
class DocumentationFinder
{
    use Injectable;

    private const MARKDOWN_EXTENSION = 'md';

    /**
     * @return array<int, array{relativePath: string, absolutePath: string, mtime: int, size: int}>
     */
    public function find(string $userguidePath): array
    {
        if (!is_dir($userguidePath)) {
            return [];
        }

        $root = rtrim($userguidePath, '/\\');
        $files = [];

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        /** @var SplFileInfo $file */
        foreach ($iterator as $file) {
            if (!$file->isFile() || strtolower($file->getExtension()) !== self::MARKDOWN_EXTENSION) {
                continue;
            }

            $absolute = $file->getPathname();
            $files[] = [
                'relativePath' => $this->toRelative($root, $absolute),
                'absolutePath' => $absolute,
                'mtime' => (int) $file->getMTime(),
                'size' => (int) $file->getSize(),
            ];
        }

        // Deterministic ordering keeps cache signatures stable across platforms.
        usort($files, static fn ($a, $b) => strcmp($a['relativePath'], $b['relativePath']));

        return $files;
    }

    /**
     * A content signature that changes whenever any markdown file is added,
     * removed, or modified — used as part of the cache key so edits invalidate
     * the cache without an expensive parse on every request.
     *
     * @param array<int, array{relativePath: string, mtime: int, size: int}> $files
     */
    public function signature(array $files): string
    {
        $parts = array_map(
            static fn ($f) => sprintf('%s:%d:%d', $f['relativePath'], $f['mtime'], $f['size']),
            $files
        );

        return substr(hash('sha256', implode('|', $parts)), 0, 16);
    }

    private function toRelative(string $root, string $absolute): string
    {
        $relative = ltrim(substr($absolute, strlen($root)), '/\\');

        // Normalise to forward slashes so relative paths are portable.
        return str_replace('\\', '/', $relative);
    }
}
