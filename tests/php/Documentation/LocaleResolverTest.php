<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Tests\Documentation;

use SilverStripe\Dev\SapphireTest;
use Symbiote\AdvancedWorkflow\Documentation\LocaleResolver;

/**
 * @phpcs:disable SlevomatCodingStandard.TypeHints.PropertyTypeHint
 */
class LocaleResolverTest extends SapphireTest
{
    protected $usesDatabase = false;

    private LocaleResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resolver = new LocaleResolver();
    }

    public function testExactLocaleMatch(): void
    {
        $result = $this->resolver->resolve('fr', 'en', fn ($l) => in_array($l, ['fr', 'en'], true));

        $this->assertSame('fr', $result['locale']);
        $this->assertFalse($result['usedFallback']);
    }

    public function testLanguagePartFallback(): void
    {
        // fr_FR folder absent, but fr present.
        $result = $this->resolver->resolve('fr_FR', 'en', fn ($l) => $l === 'fr');

        $this->assertSame('fr', $result['locale']);
        $this->assertTrue($result['usedFallback']);
    }

    public function testDefaultFallbackWhenNothingMatches(): void
    {
        $result = $this->resolver->resolve('de_DE', 'en', fn ($l) => false);

        $this->assertSame('en', $result['locale']);
        $this->assertTrue($result['usedFallback']);
    }
}
