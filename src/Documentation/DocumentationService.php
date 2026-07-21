<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use SilverStripe\Control\Controller;
use SilverStripe\Control\Director;
use SilverStripe\Core\Config\Configurable;
use SilverStripe\Core\Injector\Injectable;
use SilverStripe\Core\Injector\Injector;
use SilverStripe\Core\Manifest\ModuleLoader;
use SilverStripe\i18n\i18n;
use Symbiote\AdvancedWorkflow\Documentation\Control\DocumentationController;

/**
 * Entry point and configuration surface for the CMS user documentation
 * feature. This is the one class the rest of the CMS talks to; everything
 * else (discovery, parsing, caching, rendering) is delegated so the whole
 * feature can be lifted into a standalone module by moving this namespace.
 *
 * The feature is opt-in: it does nothing at all unless `enabled` is set to
 * true AND the documentation structure validates.
 */
class DocumentationService
{
    use Injectable;
    use Configurable;

    /**
     * Master switch. The feature must never be enabled by default.
     */
    private static bool $enabled = false;

    /**
     * Locale used when the CMS locale has no matching documentation folder.
     */
    private static string $default_locale = 'en';

    /**
     * Admin URL prefixes the Docs button is shown on. Empty means "everywhere".
     * For this module the docs are scoped to the Workflows admin section.
     *
     * @var array<int, string>
     */
    private static array $visible_paths = ['admin/workflows'];

    /**
     * The Composer name of the module that ships the documentation. Used to
     * locate the docs folder; override (or set `base_path`) when extracting to
     * a standalone module.
     */
    private static string $module_name = 'symbiote/silverstripe-advancedworkflow';

    /**
     * Absolute path to the documentation root, overriding module resolution.
     * Primarily a testing seam.
     */
    private static ?string $base_path = null;

    private static string $docs_dir = 'docs';

    private static string $userguide_dir = 'userguide';

    /**
     * Whether the feature is both switched on and backed by valid content.
     */
    public function isEnabled(): bool
    {
        if (!static::config()->get('enabled')) {
            return false;
        }

        $resolved = $this->resolveLocale();
        $validation = DocumentationValidator::create()->validate($this->userguidePath($resolved['locale']));

        return $validation['valid'];
    }

    /**
     * The full manual bundle for the active locale, or null when the feature
     * is unavailable.
     *
     * @return array<string, mixed>|null
     */
    public function getManual(): ?array
    {
        if (!$this->isEnabled()) {
            return null;
        }

        $resolved = $this->resolveLocale();
        $manual = Injector::inst()->get(DocumentationCache::class)
            ->getManual($resolved['locale'], $this->userguidePath($resolved['locale']));

        return array_merge($resolved, $manual);
    }

    /**
     * Minimal configuration handed to the frontend bundle.
     *
     * @return array<string, mixed>
     */
    public function getClientConfig(): array
    {
        return [
            'enabled' => true,
            'baseUrl' => Controller::join_links(Director::baseURL(), DocumentationController::ROUTE),
        ];
    }

    /**
     * Whether the Docs button should appear for the given admin URL (relative
     * to the site base, e.g. "admin/workflows/..."). An empty `visible_paths`
     * config makes it visible on every admin screen.
     */
    public function isVisibleForPath(string $relativeUrl): bool
    {
        $prefixes = static::config()->get('visible_paths');

        if (empty($prefixes)) {
            return true;
        }

        $path = trim(strtok($relativeUrl, '?'), '/');

        foreach ($prefixes as $prefix) {
            $prefix = trim((string) $prefix, '/');

            if ($prefix !== '' && ($path === $prefix || str_starts_with($path, $prefix . '/'))) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{locale: string, requested: string, usedFallback: bool}
     */
    public function resolveLocale(): array
    {
        return LocaleResolver::create()->resolve(
            i18n::get_locale(),
            static::config()->get('default_locale'),
            fn (string $candidate): bool => is_dir($this->userguidePath($candidate))
        );
    }

    public function userguidePath(string $locale): string
    {
        return $this->docsRoot()
            . DIRECTORY_SEPARATOR . $locale
            . DIRECTORY_SEPARATOR . static::config()->get('userguide_dir');
    }

    public function docsRoot(): string
    {
        $basePath = static::config()->get('base_path');

        if ($basePath) {
            return rtrim($basePath, '/\\');
        }

        return $this->modulePath() . DIRECTORY_SEPARATOR . static::config()->get('docs_dir');
    }

    private function modulePath(): string
    {
        $module = ModuleLoader::inst()
            ->getManifest()
            ->getModule(static::config()->get('module_name'));

        return $module ? $module->getPath() : Director::baseFolder();
    }
}
