<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Tests\Documentation;

use SilverStripe\Dev\SapphireTest;
use Symbiote\AdvancedWorkflow\Documentation\DocumentationCache;

/**
 * @phpcs:disable SlevomatCodingStandard.TypeHints.PropertyTypeHint
 */
class DocumentationCacheTest extends SapphireTest
{
    protected $usesDatabase = false;

    private string $userguide;
    private DocumentationCache $cache;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cache = new DocumentationCache();
        $this->cache->clear();

        $this->userguide = sys_get_temp_dir() . '/awf-docs-' . uniqid('', true) . '/userguide';
        mkdir($this->userguide, 0777, true);
    }

    protected function tearDown(): void
    {
        $this->cache->clear();
        array_map('unlink', glob($this->userguide . '/*') ?: []);
        @rmdir($this->userguide);
        @rmdir(dirname($this->userguide));
        parent::tearDown();
    }

    public function testGeneratesManualFromFilesystem(): void
    {
        file_put_contents($this->userguide . '/index.md', "---\ntitle: Home\n---\n\n# Home\n\nFirst version content.");

        $manual = $this->cache->getManual('en', $this->userguide);

        $this->assertArrayHasKey('index.md', $manual['files']);
        $this->assertSame('Home', $manual['files']['index.md']['title']);
        $this->assertStringContainsString('First version content', $manual['files']['index.md']['html']);
    }

    public function testCacheInvalidatesWhenContentChanges(): void
    {
        $index = $this->userguide . '/index.md';
        file_put_contents($index, "# Home\n\nAlpha.");
        $first = $this->cache->getManual('en', $this->userguide);
        $this->assertStringContainsString('Alpha', $first['files']['index.md']['html']);

        // Change the file (different length + bumped mtime => new signature).
        file_put_contents($index, "# Home\n\nBravo content is longer.");
        touch($index, time() + 5);

        $second = $this->cache->getManual('en', $this->userguide);
        $this->assertStringContainsString('Bravo', $second['files']['index.md']['html']);
        $this->assertStringNotContainsString('Alpha', $second['files']['index.md']['html']);
    }
}
