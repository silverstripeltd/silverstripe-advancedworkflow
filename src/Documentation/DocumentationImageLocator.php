<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use SilverStripe\Core\Injector\Injectable;

/**
 * Resolves a requested documentation image to a real file on disk, confined to
 * a user guide folder. Kept separate from the controller so the (security
 * critical) path-traversal and file-type rules are unit-testable in isolation.
 */
class DocumentationImageLocator
{
    use Injectable;

    /**
     * Allowed image extensions mapped to the Content-Type used to serve them.
     */
    public const MIME_TYPES = [
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',
    ];

    /**
     * @return array{path: string, mimeType: string}|null Null when the request
     *     is invalid, escapes the folder, is missing, or is not an allowed type.
     */
    public function locate(string $userguidePath, string $requestedPath): ?array
    {
        if ($requestedPath === '' || str_contains($requestedPath, "\0") || str_starts_with($requestedPath, '/')) {
            return null;
        }

        $base = realpath($userguidePath);
        $candidate = realpath($userguidePath . DIRECTORY_SEPARATOR . $requestedPath);

        if ($base === false || $candidate === false || !is_file($candidate)) {
            return null;
        }

        // Must live strictly inside the user guide folder (blocks ../ escapes,
        // symlink escapes, and the folder itself).
        if (!str_starts_with($candidate, $base . DIRECTORY_SEPARATOR)) {
            return null;
        }

        $extension = strtolower(pathinfo($candidate, PATHINFO_EXTENSION));

        if (!isset(self::MIME_TYPES[$extension])) {
            return null;
        }

        return ['path' => $candidate, 'mimeType' => self::MIME_TYPES[$extension]];
    }
}
