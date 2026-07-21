<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use SilverStripe\Core\Injector\Injectable;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

/**
 * Parses optional YAML frontmatter out of a markdown document.
 *
 * A document may begin with a delimited metadata block:
 *
 *     ---
 *     title: Workflow Actions
 *     order: 20
 *     ---
 *
 *     # Workflow Actions
 *
 * The metadata block is optional. This class is intentionally free of any
 * knowledge about *which* metadata fields matter, so new fields can be added
 * without changing it — it simply returns whatever key/values it finds.
 */
class FrontmatterParser
{
    use Injectable;

    /**
     * Matches a leading frontmatter block delimited by `---` lines. The body is
     * everything after the closing delimiter.
     */
    private const FRONTMATTER_PATTERN = '/^---[ \t]*\R(.*?)\R---[ \t]*\R?(.*)$/s';

    /**
     * @return array{metadata: array<string, mixed>, body: string}
     */
    public function parse(string $raw): array
    {
        // Normalise a UTF-8 BOM which would otherwise break delimiter matching.
        $raw = preg_replace('/^\x{FEFF}/u', '', $raw) ?? $raw;

        if (!preg_match(self::FRONTMATTER_PATTERN, $raw, $matches)) {
            return ['metadata' => [], 'body' => $raw];
        }

        return [
            'metadata' => $this->parseYaml($matches[1]),
            'body' => $matches[2],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function parseYaml(string $yaml): array
    {
        try {
            $parsed = Yaml::parse($yaml);
        } catch (ParseException) {
            // Malformed frontmatter is treated as "no metadata" rather than
            // failing the whole document — the body still renders.
            return [];
        }

        return is_array($parsed) ? $parsed : [];
    }
}
