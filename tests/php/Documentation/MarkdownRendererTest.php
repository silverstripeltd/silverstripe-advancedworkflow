<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Tests\Documentation;

use SilverStripe\Dev\SapphireTest;
use Symbiote\AdvancedWorkflow\Documentation\MarkdownRenderer;

/**
 * @phpcs:disable SlevomatCodingStandard.TypeHints.PropertyTypeHint
 */
class MarkdownRendererTest extends SapphireTest
{
    protected $usesDatabase = false;

    private MarkdownRenderer $renderer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->renderer = new MarkdownRenderer();
    }

    public function testRendersCommonMarkAndGfm(): void
    {
        $html = $this->renderer->render("# Title\n\n- one\n- two\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n`code`");

        $this->assertStringContainsString('<h1>Title</h1>', $html);
        $this->assertStringContainsString('<ul>', $html);
        $this->assertStringContainsString('<table>', $html);
        $this->assertStringContainsString('<code>code</code>', $html);
    }

    public function testStripsRawHtmlAndScripts(): void
    {
        $html = $this->renderer->render("Hello\n\n<script>window.x=1;</script>\n\n<div onclick=\"evil()\">x</div>");

        $this->assertStringNotContainsString('<script', $html);
        $this->assertStringNotContainsString('onclick', $html);
    }

    public function testNeutralisesUnsafeLinks(): void
    {
        $html = $this->renderer->render('[click](javascript:alert(1))');

        $this->assertStringNotContainsString('javascript:', $html);
    }
}
