<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Tests\Documentation;

use SilverStripe\Dev\SapphireTest;
use Symbiote\AdvancedWorkflow\Documentation\NavigationBuilder;

/**
 * @phpcs:disable SlevomatCodingStandard.TypeHints.PropertyTypeHint
 */
class NavigationBuilderTest extends SapphireTest
{
    protected $usesDatabase = false;

    public function testOrderingAndIndexLeads(): void
    {
        $nodes = (new NavigationBuilder())->build([
            ['relativePath' => 'actions.md', 'title' => 'Actions', 'order' => 20],
            ['relativePath' => 'index.md', 'title' => 'Overview', 'order' => null],
            ['relativePath' => 'intro.md', 'title' => 'Intro', 'order' => 10],
        ]);

        $this->assertSame(['Overview', 'Intro', 'Actions'], array_column($nodes, 'title'));
        $this->assertSame('file', $nodes[0]['type']);
    }

    public function testNestedFolderProducesChildren(): void
    {
        $nodes = (new NavigationBuilder())->build([
            ['relativePath' => 'index.md', 'title' => 'Overview', 'order' => 0],
            ['relativePath' => 'advanced/nested.md', 'title' => 'Nested', 'order' => 10],
        ]);

        $folder = array_values(array_filter($nodes, fn ($n) => $n['type'] === 'folder'))[0];
        $this->assertSame('Advanced', $folder['title']);
        $this->assertSame('advanced', $folder['path']);
        $this->assertCount(1, $folder['children']);
        $this->assertSame('Nested', $folder['children'][0]['title']);
    }
}
