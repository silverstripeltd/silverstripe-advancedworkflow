<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Tests\Documentation;

use SilverStripe\Core\Config\Config;
use SilverStripe\Dev\SapphireTest;
use SilverStripe\i18n\i18n;
use Symbiote\AdvancedWorkflow\Documentation\DocumentationService;

/**
 * @phpcs:disable SlevomatCodingStandard.TypeHints.PropertyTypeHint
 */
class DocumentationServiceTest extends SapphireTest
{
    protected $usesDatabase = false;

    private function configure(string $fixture, bool $enabled = true, string $defaultLocale = 'en'): DocumentationService
    {
        Config::modify()->set(DocumentationService::class, 'enabled', $enabled);
        Config::modify()->set(DocumentationService::class, 'default_locale', $defaultLocale);
        Config::modify()->set(DocumentationService::class, 'base_path', __DIR__ . '/fixtures/' . $fixture);

        return DocumentationService::create();
    }

    public function testDisabledFeatureDoesNothing(): void
    {
        $service = $this->configure('valid', enabled: false);

        $this->assertFalse($service->isEnabled());
        $this->assertNull($service->getManual());
    }

    public function testEnabledWithValidStructure(): void
    {
        i18n::set_locale('en_US');
        $service = $this->configure('valid');

        $this->assertTrue($service->isEnabled());

        $manual = $service->getManual();
        $this->assertIsArray($manual);
        $this->assertSame('en', $manual['locale']);
        $this->assertArrayHasKey('navigation', $manual);
        $this->assertArrayHasKey('files', $manual);
        $this->assertArrayHasKey('searchIndex', $manual);
        $this->assertArrayHasKey('index.md', $manual['files']);
    }

    public function testInvalidStructureKeepsFeatureOff(): void
    {
        $service = $this->configure('missing-index');

        $this->assertFalse($service->isEnabled());
        $this->assertNull($service->getManual());
    }

    public function testLocaleDetectionUsesMatchingFolder(): void
    {
        // fr_FR has no exact folder, but the language part "fr" does.
        i18n::set_locale('fr_FR');
        $service = $this->configure('valid');

        $resolved = $service->resolveLocale();
        $this->assertSame('fr', $resolved['locale']);
    }

    public function testVisibilityIsScopedToConfiguredPaths(): void
    {
        $service = $this->configure('valid');
        Config::modify()->set(DocumentationService::class, 'visible_paths', ['admin/workflows']);

        $this->assertTrue($service->isVisibleForPath('admin/workflows'));
        $this->assertTrue($service->isVisibleForPath('admin/workflows/edit/5'));
        $this->assertTrue($service->isVisibleForPath('admin/workflows?flush=1'));
        $this->assertFalse($service->isVisibleForPath('admin/pages'));
        $this->assertFalse($service->isVisibleForPath('admin/workflows-other'));
    }

    public function testEmptyVisiblePathsMeansEverywhere(): void
    {
        $service = $this->configure('valid');
        Config::modify()->set(DocumentationService::class, 'visible_paths', []);

        $this->assertTrue($service->isVisibleForPath('admin/pages'));
    }

    public function testFallsBackToDefaultLocale(): void
    {
        i18n::set_locale('de_DE');
        $service = $this->configure('valid');

        $resolved = $service->resolveLocale();
        $this->assertSame('en', $resolved['locale']);
        $this->assertTrue($resolved['usedFallback']);
    }
}
