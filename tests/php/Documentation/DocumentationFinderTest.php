<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Tests\Documentation;

use SilverStripe\Dev\SapphireTest;
use Symbiote\AdvancedWorkflow\Documentation\DocumentationFinder;

/**
 * @phpcs:disable SlevomatCodingStandard.TypeHints.PropertyTypeHint
 */
class DocumentationFinderTest extends SapphireTest
{
    protected $usesDatabase = false;

    private DocumentationFinder $finder;
    private string $userguide;

    protected function setUp(): void
    {
        parent::setUp();
        $this->finder = new DocumentationFinder();
        $this->userguide = __DIR__ . '/fixtures/valid/en/userguide';
    }

    public function testDiscoversMarkdownRecursivelyIgnoringOtherFiles(): void
    {
        $paths = array_column($this->finder->find($this->userguide), 'relativePath');

        $this->assertContains('index.md', $paths);
        $this->assertContains('actions.md', $paths);
        $this->assertContains('advanced/nested.md', $paths);
        // Images (non-markdown) must not be discovered.
        $this->assertNotContains('advanced/_images/diagram.png', $paths);
    }

    public function testMissingFolderReturnsEmpty(): void
    {
        $this->assertSame([], $this->finder->find($this->userguide . '/nope'));
    }

    public function testSignatureIsStableAndChangeSensitive(): void
    {
        $files = $this->finder->find($this->userguide);
        $sig1 = $this->finder->signature($files);
        $this->assertSame($sig1, $this->finder->signature($files));

        // A changed mtime/size must alter the signature (drives cache invalidation).
        $files[0]['mtime'] += 1;
        $this->assertNotSame($sig1, $this->finder->signature($files));
    }
}
