<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use Psr\SimpleCache\CacheInterface;
use SilverStripe\Core\Injector\Injectable;
use SilverStripe\Core\Injector\Injector;

/**
 * Caches the processed documentation manual so the (relatively expensive)
 * markdown parse/render/sanitise pass does not run on every request.
 *
 * The cache key incorporates a content signature derived from the discovered
 * files' paths, sizes and modification times, so the cache is automatically
 * invalidated whenever documentation files change — as well as being cleared
 * on a normal Silverstripe flush. The cheap part (a directory scan) still runs
 * per request; only the expensive parse is cached.
 */
class DocumentationCache
{
    use Injectable;

    private const KEY_PREFIX = 'advancedworkflow_documentation_';

    /**
     * Bump when the cached manual's SHAPE changes (new fields, processing
     * changes) so a code change busts the cache even when the docs files —
     * and therefore their content signature — are unchanged.
     */
    private const CACHE_VERSION = '2';

    private ?CacheInterface $cache = null;

    /**
     * Return the manual bundle for a locale, building and caching it on a miss.
     *
     * @return array{
     *     navigation: array<int, array<string, mixed>>,
     *     files: array<string, mixed>,
     *     searchIndex: array<int, array<string, mixed>>
     * }
     */
    public function getManual(string $locale, string $userguidePath): array
    {
        $finder = DocumentationFinder::create();
        $files = $finder->find($userguidePath);
        $key = $this->cacheKey($locale, $finder->signature($files));

        $cache = $this->cache();
        $cached = $cache->get($key);

        if (is_array($cached)) {
            return $cached;
        }

        $manual = Injector::inst()->get(DocumentationManualBuilder::class)->build($files);
        $cache->set($key, $manual);

        return $manual;
    }

    public function clear(): void
    {
        $this->cache()->clear();
    }

    private function cacheKey(string $locale, string $signature): string
    {
        // Only [A-Za-z0-9_.] is safe across PSR-16 backends.
        $safeLocale = preg_replace('/[^A-Za-z0-9_]/', '_', $locale) ?? 'unknown';

        return self::KEY_PREFIX . self::CACHE_VERSION . '_' . $safeLocale . '_' . $signature;
    }

    private function cache(): CacheInterface
    {
        if (!$this->cache instanceof CacheInterface) {
            $this->cache = Injector::inst()->get(CacheInterface::class . '.advancedworkflowDocumentation');
        }

        return $this->cache;
    }
}
