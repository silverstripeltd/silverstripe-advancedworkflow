<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation;

use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\DisallowedRawHtml\DisallowedRawHtmlExtension;
use League\CommonMark\Extension\GithubFlavoredMarkdownExtension;
use League\CommonMark\MarkdownConverter;
use SilverStripe\Core\Injector\Injectable;

/**
 * Converts markdown into sanitised HTML using league/commonmark.
 *
 * Security is enforced at parse time with an allow-list model:
 *  - `html_input: strip` removes any raw HTML embedded in the markdown, so the
 *    output only ever contains the safe tags CommonMark itself emits
 *    (headings, paragraphs, lists, tables, code, links, images, emphasis).
 *  - `allow_unsafe_links: false` neutralises javascript:/data: style links.
 *  - DisallowedRawHtml is added as defence in depth.
 *
 * Relative link/image resolution is deliberately NOT done here — that is the
 * job of DocumentationHtmlProcessor, keeping parsing and rewriting separate.
 */
class MarkdownRenderer
{
    use Injectable;

    /**
     * @var array<string, mixed>
     */
    private static array $environment_config = [
        'html_input' => 'strip',
        'allow_unsafe_links' => false,
    ];

    private ?MarkdownConverter $converter = null;

    public function render(string $markdown): string
    {
        return $this->converter()->convert($markdown)->getContent();
    }

    private function converter(): MarkdownConverter
    {
        if ($this->converter instanceof MarkdownConverter) {
            return $this->converter;
        }

        $environment = new Environment(self::$environment_config);
        $environment->addExtension(new CommonMarkCoreExtension());
        // GFM brings tables, strikethrough, task lists and autolinks.
        $environment->addExtension(new GithubFlavoredMarkdownExtension());
        $environment->addExtension(new DisallowedRawHtmlExtension());

        $this->converter = new MarkdownConverter($environment);

        return $this->converter;
    }
}
