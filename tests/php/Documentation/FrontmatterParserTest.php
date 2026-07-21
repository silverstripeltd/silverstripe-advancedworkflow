<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Tests\Documentation;

use SilverStripe\Dev\SapphireTest;
use Symbiote\AdvancedWorkflow\Documentation\FrontmatterParser;

/**
 * @phpcs:disable SlevomatCodingStandard.TypeHints.PropertyTypeHint
 */
class FrontmatterParserTest extends SapphireTest
{
    protected $usesDatabase = false;

    private FrontmatterParser $parser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->parser = new FrontmatterParser();
    }

    public function testParsesFrontmatterAndBody(): void
    {
        $result = $this->parser->parse("---\ntitle: Workflow Actions\norder: 20\n---\n\n# Heading\n\nBody text.");

        $this->assertSame('Workflow Actions', $result['metadata']['title']);
        $this->assertSame(20, $result['metadata']['order']);
        $this->assertStringContainsString('# Heading', $result['body']);
        $this->assertStringNotContainsString('title:', $result['body']);
    }

    public function testDocumentWithoutFrontmatter(): void
    {
        $result = $this->parser->parse("# Just a heading\n\nNo metadata here.");

        $this->assertSame([], $result['metadata']);
        $this->assertStringContainsString('# Just a heading', $result['body']);
    }

    public function testMalformedFrontmatterIsIgnored(): void
    {
        $result = $this->parser->parse("---\n\ttitle: : : bad\n  - broken\n---\n\nBody.");

        $this->assertSame([], $result['metadata']);
        $this->assertStringContainsString('Body.', $result['body']);
    }

    public function testStripsUtf8Bom(): void
    {
        $result = $this->parser->parse("\u{FEFF}---\ntitle: X\n---\n\nBody.");

        $this->assertSame('X', $result['metadata']['title']);
    }
}
