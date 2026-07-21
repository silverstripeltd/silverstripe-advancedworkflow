<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation\Extensions;

use SilverStripe\Core\Extension;
use SilverStripe\Core\Injector\Injector;
use SilverStripe\View\Requirements;
use Symbiote\AdvancedWorkflow\Documentation\DocumentationService;

/**
 * Registers the documentation UI (button + panel bundle) into the CMS, but
 * ONLY when the feature is enabled and its content validates. When disabled,
 * nothing is enqueued, so no Docs button appears and no documentation code
 * runs on the client.
 *
 * This is the sole touch-point between the documentation feature and the host
 * CMS, which keeps the feature extraction-ready.
 */
class DocumentationLeftAndMainExtension extends Extension
{
    private const MODULE = 'symbiote/silverstripe-advancedworkflow';

    /**
     * Fired by Controller::init() on every admin screen.
     */
    protected function onAfterInit(): void
    {
        $service = Injector::inst()->get(DocumentationService::class);

        if (!$service->isEnabled()) {
            return;
        }

        // Scope the docs UI to the configured admin section(s) only.
        $request = $this->getOwner()->getRequest();

        if (!$request || !$service->isVisibleForPath((string) $request->getURL())) {
            return;
        }

        Requirements::css(self::MODULE . ': client/dist/documentation.css');
        Requirements::javascript(self::MODULE . ': client/dist/documentation.js');
        Requirements::customScript(
            'window.SS_ADVANCEDWORKFLOW_DOCS = ' . json_encode($service->getClientConfig()) . ';',
            'advancedworkflow-documentation-config'
        );
    }
}
