<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use SilverStripe\Core\Injector\Injectable;

/**
 * Resolves which documentation locale folder should be used for a request.
 *
 * The CMS locale (e.g. "fr_FR") is matched against the available documentation
 * locale folders, most-specific first, then falls back to the configured
 * default locale. The resolver is filesystem-aware only through a predicate so
 * it stays trivially testable and free of Silverstripe coupling.
 */
class LocaleResolver
{
    use Injectable;

    /**
     * @param string $requestedLocale The active CMS locale, e.g. "fr_FR" or "fr".
     * @param string $defaultLocale The configured fallback locale, e.g. "en".
     * @param callable(string): bool $localeExists Returns true when a locale folder is usable.
     * @return array{locale: string, requested: string, usedFallback: bool}
     */
    public function resolve(string $requestedLocale, string $defaultLocale, callable $localeExists): array
    {
        foreach ($this->candidates($requestedLocale) as $candidate) {
            if ($localeExists($candidate)) {
                return [
                    'locale' => $candidate,
                    'requested' => $requestedLocale,
                    'usedFallback' => $candidate !== $requestedLocale,
                ];
            }
        }

        return [
            'locale' => $defaultLocale,
            'requested' => $requestedLocale,
            'usedFallback' => true,
        ];
    }

    /**
     * Locale candidates in priority order: the exact locale, then its language
     * part (fr_FR -> fr). Duplicates are removed while preserving order.
     *
     * @return array<int, string>
     */
    private function candidates(string $requestedLocale): array
    {
        $candidates = [$requestedLocale];

        if (str_contains($requestedLocale, '_')) {
            $candidates[] = strtok($requestedLocale, '_');
        }

        return array_values(array_unique(array_filter($candidates)));
    }
}
