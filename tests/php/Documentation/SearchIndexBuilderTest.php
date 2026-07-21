<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Tests\Documentation;

use SilverStripe\Dev\SapphireTest;
use Symbiote\AdvancedWorkflow\Documentation\SearchIndexBuilder;

/**
 * @phpcs:disable SlevomatCodingStandard.TypeHints.PropertyTypeHint
 */
class SearchIndexBuilderTest extends SapphireTest
{
    protected $usesDatabase = false;

    public function testIndexesPlainTextContent(): void
    {
        $index = (new SearchIndexBuilder())->build([
            ['path' => 'actions.md', 'title' => 'Actions', 'html' => '<h1>Actions</h1><p>Approval action <code>config</code>.</p>'],
        ]);

        $this->assertCount(1, $index);
        $this->assertSame('actions.md', $index[0]['path']);
        $this->assertSame('Actions', $index[0]['title']);
        // Tags stripped, whitespace collapsed, content searchable.
        $this->assertStringNotContainsString('<', $index[0]['searchText']);
        $this->assertStringContainsString('Approval action config', $index[0]['searchText']);
    }
}
