<?php

declare(strict_types=1);

namespace Symbiote\AdvancedWorkflow\Extensions;

use SilverStripe\Core\Extension;
use SilverStripe\Forms\Form;
use SilverStripe\Forms\LiteralField;

/**
 * Extension on CMSMain that injects the workflow status panel
 * container into the page edit form.
 */
class WorkflowUIExtension extends Extension
{
    public function updateEditForm(Form $form): void
    {
        $record = $form->getRecord();

        if (!$record || !$record->ID) {
            return;
        }

        $html = sprintf(
            '<div id="workflow-panel-root"
                data-record-id="%d"
                data-class-name="%s"></div>',
            $record->ID,
            addslashes($record->ClassName)
        );

        $form->Fields()->insertBefore(
            'Root',
            LiteralField::create('WorkflowPanel', $html)
        );
    }
}
