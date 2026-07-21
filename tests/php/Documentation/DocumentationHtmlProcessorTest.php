<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Tests\Documentation;

use SilverStripe\Dev\SapphireTest;
use Symbiote\AdvancedWorkflow\Documentation\DocumentationHtmlProcessor;

/**
 * @phpcs:disable SlevomatCodingStandard.TypeHints.PropertyTypeHint
 */
class DocumentationHtmlProcessorTest extends SapphireTest
{
    protected $usesDatabase = false;

    private DocumentationHtmlProcessor $processor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->processor = new DocumentationHtmlProcessor();
    }

    public function testRelativeImageBecomesDataAttribute(): void
    {
        $out = $this->processor->process('<p><img src="images/workflow.png" alt="x"></p>', 'index.md');

        $this->assertStringContainsString('data-doc-image="images/workflow.png"', $out);
        $this->assertStringNotContainsString('src="images/workflow.png"', $out);
    }

    public function testImagePathResolvedAgainstCurrentFolder(): void
    {
        $out = $this->processor->process('<img src="_images/d.png">', 'advanced/nested.md');

        $this->assertStringContainsString('data-doc-image="advanced/_images/d.png"', $out);
    }

    public function testInternalMarkdownLinkTagged(): void
    {
        $out = $this->processor->process('<a href="actions.md">Actions</a>', 'index.md');

        $this->assertStringContainsString('data-doc-path="actions.md"', $out);
        $this->assertStringContainsString('href="#"', $out);
    }

    public function testInternalLinkWithAnchorAndParentPath(): void
    {
        $out = $this->processor->process('<a href="../actions.md#config">A</a>', 'advanced/nested.md');

        $this->assertStringContainsString('data-doc-path="actions.md"', $out);
        $this->assertStringContainsString('data-doc-anchor="config"', $out);
    }

    public function testExternalLinkOpensInNewTab(): void
    {
        $out = $this->processor->process('<a href="https://example.com">x</a>', 'index.md');

        $this->assertStringContainsString('target="_blank"', $out);
        $this->assertStringContainsString('rel="noopener noreferrer"', $out);
    }

    public function testAnchorOnlyLinkUntouched(): void
    {
        $out = $this->processor->process('<a href="#section">x</a>', 'index.md');

        $this->assertStringNotContainsString('data-doc-path', $out);
        $this->assertStringContainsString('href="#section"', $out);
    }
}
