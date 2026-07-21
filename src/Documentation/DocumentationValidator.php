<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use Psr\Log\LoggerInterface;
use SilverStripe\Core\Injector\Injectable;
use SilverStripe\Core\Injector\Injector;

/**
 * Validates that a documentation locale folder has the minimum structure the
 * feature requires before it will activate:
 *
 *     {userguidePath}/index.md   (exists and is readable)
 *
 * A failed validation is a developer/configuration problem (missing content),
 * so it is logged as a warning and reported back so the caller can keep the
 * feature — and its UI — switched off.
 */
class DocumentationValidator
{
    use Injectable;

    public const INDEX_FILE = 'index.md';

    /**
     * @return array{valid: bool, errors: array<int, string>}
     */
    public function validate(string $userguidePath): array
    {
        $errors = [];

        if (!is_dir($userguidePath)) {
            $errors[] = sprintf('User guide folder does not exist: %s', $userguidePath);
            return $this->result($errors);
        }

        $indexPath = $userguidePath . DIRECTORY_SEPARATOR . self::INDEX_FILE;

        if (!is_file($indexPath)) {
            $errors[] = sprintf('Required documentation index is missing: %s', $indexPath);
        } elseif (!is_readable($indexPath)) {
            $errors[] = sprintf('Documentation index is not readable: %s', $indexPath);
        }

        return $this->result($errors);
    }

    /**
     * @param array<int, string> $errors
     * @return array{valid: bool, errors: array<int, string>}
     */
    private function result(array $errors): array
    {
        if ($errors !== []) {
            Injector::inst()->get(LoggerInterface::class)->warning(
                'Documentation feature is enabled but its structure is invalid; the docs UI will stay hidden. '
                . implode(' ', $errors)
            );
        }

        return ['valid' => $errors === [], 'errors' => $errors];
    }
}
