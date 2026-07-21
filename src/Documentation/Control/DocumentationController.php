<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Documentation\Control;

use SilverStripe\Control\Controller;
use SilverStripe\Control\HTTPRequest;
use SilverStripe\Control\HTTPResponse;
use SilverStripe\Core\Injector\Injector;
use SilverStripe\Security\Permission;
use Symbiote\AdvancedWorkflow\Documentation\DocumentationImageLocator;
use Symbiote\AdvancedWorkflow\Documentation\DocumentationService;

/**
 * Thin JSON/asset endpoint for the documentation panel. All logic lives in the
 * documentation services; this only handles HTTP concerns and access control.
 *
 * Registered as a top-level route ("documentation-admin"). Every action first
 * checks the feature is enabled, so a stray route with the feature switched
 * off exposes nothing.
 */
class DocumentationController extends Controller
{
    public const ROUTE = 'documentation-admin';

    private static array $allowed_actions = [
        'manual',
        'image',
    ];

    private static array $url_handlers = [
        'manual' => 'manual',
        'image' => 'image',
    ];

    /**
     * Documentation is available to any authenticated CMS user.
     */
    private function canView(): bool
    {
        return Permission::check('CMS_ACCESS_LeftAndMain') || Permission::check('ADMIN');
    }

    private function service(): DocumentationService
    {
        return Injector::inst()->get(DocumentationService::class);
    }

    /**
     * Returns the whole manual (navigation, rendered content, search index) as
     * JSON so the panel can render and search entirely client-side.
     */
    public function manual(): HTTPResponse
    {
        if (!$this->canView()) {
            return $this->json(['error' => 'Forbidden'], 403);
        }

        $manual = $this->service()->getManual();

        if ($manual === null) {
            return $this->json(['enabled' => false], 404);
        }

        return $this->json(array_merge(['enabled' => true], $manual));
    }

    /**
     * Serves a documentation image straight from the docs folder (images are
     * intentionally not stored in CMS assets). Path traversal is prevented by
     * resolving against, and confining to, the locale's user guide folder.
     */
    public function image(HTTPRequest $request): HTTPResponse
    {
        if (!$this->canView()) {
            return $this->json(['error' => 'Forbidden'], 403);
        }

        $service = $this->service();

        if (!$service->isEnabled()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $locale = (string) $request->getVar('locale');
        $path = (string) $request->getVar('path');

        $resolved = DocumentationImageLocator::create()->locate($service->userguidePath($locale), $path);

        if ($resolved === null) {
            return $this->json(['error' => 'Not found'], 404);
        }

        return HTTPResponse::create((string) file_get_contents($resolved['path']), 200)
            ->addHeader('Content-Type', $resolved['mimeType'])
            // Defence in depth: never let the browser second-guess the type.
            ->addHeader('X-Content-Type-Options', 'nosniff');
    }

    private function json(mixed $data, int $status = 200): HTTPResponse
    {
        return HTTPResponse::create((string) json_encode($data), $status)
            ->addHeader('Content-Type', 'application/json');
    }
}
