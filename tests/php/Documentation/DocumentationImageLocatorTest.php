<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Tests\Documentation;

use SilverStripe\Dev\SapphireTest;
use Symbiote\AdvancedWorkflow\Documentation\DocumentationImageLocator;

/**
 * @phpcs:disable SlevomatCodingStandard.TypeHints.PropertyTypeHint
 */
class DocumentationImageLocatorTest extends SapphireTest
{
    protected $usesDatabase = false;

    private DocumentationImageLocator $locator;
    private string $userguide;

    protected function setUp(): void
    {
        parent::setUp();
        $this->locator = new DocumentationImageLocator();
        $this->userguide = __DIR__ . '/fixtures/valid/en/userguide';
    }

    public function testLocatesValidImage(): void
    {
        $result = $this->locator->locate($this->userguide, 'advanced/_images/diagram.png');

        $this->assertNotNull($result);
        $this->assertSame('image/png', $result['mimeType']);
        $this->assertStringEndsWith('diagram.png', $result['path']);
    }

    public function testRejectsPathTraversal(): void
    {
        $this->assertNull($this->locator->locate($this->userguide, '../../../../etc/passwd'));
        $this->assertNull($this->locator->locate($this->userguide, 'advanced/../../index.md'));
    }

    public function testRejectsAbsoluteAndNullByte(): void
    {
        $this->assertNull($this->locator->locate($this->userguide, '/etc/passwd'));
        $this->assertNull($this->locator->locate($this->userguide, "a\0.png"));
    }

    public function testRejectsNonImageAndMissing(): void
    {
        // index.md exists but is not an allowed image type.
        $this->assertNull($this->locator->locate($this->userguide, 'index.md'));
        $this->assertNull($this->locator->locate($this->userguide, 'does-not-exist.png'));
    }
}
