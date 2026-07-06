import React, { useEffect, useState, useCallback } from 'react';
import Icon from './Icon';
import MultiSelect from './MultiSelect';

const API_BASE = '/workflow-admin';

const STEP_TYPES = Object.freeze({
  APPROVAL: 'approval',
  NOTIFICATION: 'notification',
  ASSIGN: 'assign',
  PUBLISH: 'publish',
  UNPUBLISH: 'unpublish',
  SET_PROPERTY: 'setproperty',
  CANCEL: 'cancel',
});

// Values must match WorkflowAction.AllowEditing enum in the database.
const ALLOW_EDITING_OPTIONS = Object.freeze([
  { value: 'No', label: 'Not editable' },
  { value: 'By Assignees', label: 'Editable by assignees' },
  { value: 'Content Settings', label: 'Use content settings' },
]);

// Values must match WorkflowTransition.Type enum in the database.
const TRANSITION_TYPES = Object.freeze([
  { value: 'Active', label: 'Active — a user clicks to proceed' },
  { value: 'Passive', label: 'Passive — proceeds automatically' },
]);

// Declarative per-type config editors. `input` drives how the field renders;
// `source` (groups|users) pulls options from workflowMeta.
const CONFIG_FIELDS = Object.freeze({
  [STEP_TYPES.APPROVAL]: [
    { key: 'allowEditing', label: 'Content editing during this step', input: 'select', options: ALLOW_EDITING_OPTIONS },
    { key: 'allowCommenting', label: 'Allow reviewers to leave a comment', input: 'checkbox' },
  ],
  [STEP_TYPES.NOTIFICATION]: [
    { key: 'emailSubject', label: 'Email subject', input: 'text', help: 'Supports variables like $Context.Title.' },
    { key: 'emailFrom', label: 'From address', input: 'text' },
    { key: 'emailTemplate', label: 'Email body', input: 'textarea' },
  ],
  [STEP_TYPES.ASSIGN]: [
    { key: 'assignInitiator', label: 'Also assign the person who started the workflow', input: 'checkbox' },
    { key: 'groupIds', label: 'Assign to groups', input: 'multiselect', source: 'groups' },
    { key: 'userIds', label: 'Assign to specific users', input: 'multiselect', source: 'users' },
  ],
  [STEP_TYPES.PUBLISH]: [
    { key: 'publishDelay', label: 'Delay publishing (days)', input: 'number' },
    { key: 'allowEmbargoedEditing', label: 'Allow editing while embargoed', input: 'checkbox' },
  ],
  [STEP_TYPES.UNPUBLISH]: [
    { key: 'unpublishDelay', label: 'Delay unpublishing (days)', input: 'number' },
  ],
  [STEP_TYPES.SET_PROPERTY]: [
    {
      key: 'property',
      label: 'Field name to set',
      input: 'text',
      help: 'The exact field name on the page to write to, e.g. "ReviewOutcome". '
        + 'Ask a developer if unsure — an unknown field name is silently ignored.',
    },
    { key: 'value', label: 'Value to store', input: 'text', help: 'The value written into that field.' },
  ],
  [STEP_TYPES.CANCEL]: [],
});

const TYPE_CONFIG = Object.freeze({
  [STEP_TYPES.APPROVAL]: {
    icon: 'approval',
    label: 'Approval',
    description: 'Someone must review and approve or reject before the workflow continues.',
    supportsBranches: true,
    isOutcome: false,
  },
  [STEP_TYPES.NOTIFICATION]: {
    icon: 'notification',
    label: 'Notification',
    description: 'Sends an email to the assigned users/groups.',
    supportsBranches: false,
    isOutcome: false,
  },
  [STEP_TYPES.ASSIGN]: {
    icon: 'assignment',
    label: 'Assign Users',
    description: 'Assigns the workflow to users and/or groups who handle the next steps.',
    supportsBranches: false,
    isOutcome: false,
  },
  [STEP_TYPES.PUBLISH]: {
    icon: 'publish',
    label: 'Publish',
    description: 'Publishes the content. Usually the final step after approval.',
    supportsBranches: false,
    isOutcome: false,
  },
  [STEP_TYPES.UNPUBLISH]: {
    icon: 'unpublish',
    label: 'Unpublish',
    description: 'Advanced: takes the content off the live site (the opposite of Publish).',
    supportsBranches: false,
    isOutcome: false,
    advanced: true,
  },
  [STEP_TYPES.SET_PROPERTY]: {
    icon: 'action',
    label: 'Set Property',
    description: 'Advanced (developer) step. Automatically writes a fixed value into a named field on '
      + 'the page as the workflow passes this point — e.g. set a "ReviewOutcome" field to "Approved". '
      + 'It only works if a developer has added that field to the page.',
    supportsBranches: false,
    isOutcome: false,
    advanced: true,
  },
  [STEP_TYPES.CANCEL]: {
    icon: 'cancel',
    label: 'Reject / Cancel',
    description: 'Ends the workflow as rejected. Reject transitions point here.',
    supportsBranches: false,
    isOutcome: true,
  },
});

const REJECT_TITLE_RE = /(reject|back|change)/i;
const isRejectTransition = (transition) => REJECT_TITLE_RE.test(transition.title || '');

const configFor = (type) => TYPE_CONFIG[type] || TYPE_CONFIG[STEP_TYPES.APPROVAL];

export default function WorkflowBuilder({ definitionId }) {
  // Workflow metadata (title, description, start-button text, remind days,
  // assigned groups/users) is edited on the CMS Main tab — the single source of
  // truth — so it's intentionally not duplicated here. The builder only edits
  // the step/flow structure.
  const [meta, setMeta] = useState({ groups: {}, users: {} });
  const [userLabels, setUserLabels] = useState({});
  const [steps, setSteps] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const loadMeta = useCallback(() => {
    fetch(`${API_BASE}/workflowMeta`)
      .then((res) => res.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

  // Server-side user search (users aren't preloaded — see workflowMeta).
  const searchUsers = useCallback(
    (term) => fetch(`${API_BASE}/searchUsers?term=${encodeURIComponent(term)}`)
      .then((res) => res.json())
      .then((list) => (Array.isArray(list) ? list : []))
      .catch(() => []),
    []
  );

  const loadDefinition = useCallback(() => {
    if (!definitionId) return;

    fetch(`${API_BASE}/loadDefinition?ID=${definitionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.error) return;
        setUserLabels(data.userLabels || {});
        setSteps(Array.isArray(data.steps) ? data.steps : []);
      })
      .catch(() => {});
  }, [definitionId]);

  useEffect(() => {
    loadMeta();
    loadDefinition();
  }, [loadMeta, loadDefinition]);

  const updateStep = (id, changes) => {
    setSteps((current) => current.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  };

  const updateConfig = (id, key, value) => {
    setSteps((current) => current.map((s) => (
      s.id === id ? { ...s, config: { ...(s.config || {}), [key]: value } } : s
    )));
  };

  const addStep = (type) => {
    const id = `new-${Date.now()}`;
    setSteps((current) => [...current, {
      id,
      title: TYPE_CONFIG[type].label,
      type,
      config: {},
      transitions: [],
    }]);
    setSelectedId(id);
  };

  const removeStep = (stepId) => {
    setSteps((current) => current
      .filter((s) => s.id !== stepId)
      // Drop any transitions that pointed at the removed step.
      .map((s) => ({
        ...s,
        transitions: (s.transitions || []).filter((t) => t.nextStepId !== stepId),
      })));
    if (selectedId === stepId) setSelectedId(null);
  };

  const moveStep = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const reordered = [...steps];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setSteps(reordered);
  };

  // Locate the transition entry for a role (approve/reject/next). Approval steps
  // key by reject-vs-not; linear steps have a single outgoing transition.
  const transitionIndexForRole = (step, list, role) => {
    if (step.type !== STEP_TYPES.APPROVAL) {
      return list.length ? 0 : -1;
    }
    return role === 'reject'
      ? list.findIndex(isRejectTransition)
      : list.findIndex((t) => !isRejectTransition(t));
  };

  const titleForRole = (step, role) => {
    if (step.type !== STEP_TYPES.APPROVAL) return 'Next';
    return role === 'reject' ? 'Reject' : 'Approve';
  };

  const getTransition = (step, role) => {
    const list = Array.isArray(step.transitions) ? step.transitions : [];
    const index = transitionIndexForRole(step, list, role);
    return index >= 0 ? list[index] : null;
  };

  const getTransitionTarget = (step, role) => {
    const transition = getTransition(step, role);
    return transition ? transition.nextStepId : '';
  };

  // Set/clear a role's target step, preserving the DB id of any existing
  // transition so saves stay non-destructive.
  const setTransitionTarget = (step, role, nextStepId) => {
    const list = Array.isArray(step.transitions) ? [...step.transitions] : [];
    const index = transitionIndexForRole(step, list, role);

    if (!nextStepId) {
      if (index >= 0) list.splice(index, 1);
    } else if (index >= 0) {
      list[index] = { ...list[index], title: titleForRole(step, role), nextStepId };
    } else {
      list.push({ title: titleForRole(step, role), nextStepId, transitionType: 'Active' });
    }

    updateStep(step.id, { transitions: list });
  };

  // Patch fields (type, restrictions) on the existing transition for a role.
  const patchTransition = (step, role, patch) => {
    const list = Array.isArray(step.transitions) ? [...step.transitions] : [];
    const index = transitionIndexForRole(step, list, role);
    if (index < 0) return;
    list[index] = { ...list[index], ...patch };
    updateStep(step.id, { transitions: list });
  };

  const stepTitle = (id) => {
    const found = steps.find((s) => s.id === id);
    return found ? found.title : '—';
  };

  const saveWorkflow = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`${API_BASE}/saveWorkflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          // Metadata is owned by the Main tab; only step/flow is sent here so
          // saving never clobbers Main-tab fields.
          id: definitionId || null,
          steps: steps.map((s) => ({
            id: s.id,
            title: s.title,
            type: s.type,
            config: s.config || {},
            transitions: s.transitions || [],
          })),
        }),
      });

      if (!response.ok) throw new Error('Save failed');
      setSaveMessage({ ok: true, text: 'Saved' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ ok: false, text: 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedStep = steps.find((s) => s.id === selectedId);
  const selectedIndex = steps.findIndex((s) => s.id === selectedId);
  const selectedConfig = selectedStep ? configFor(selectedStep.type) : null;

  const otherStepOptions = (excludeId) => steps
    .filter((s) => s.id !== excludeId)
    .map((s) => <option key={s.id} value={s.id}>{s.title}</option>);

  const renderConfigField = (step, field) => {
    const value = (step.config || {})[field.key];

    if (field.input === 'multiselect') {
      return renderMultiSelect(field.source, value, (ids) => updateConfig(step.id, field.key, ids));
    }

    if (field.input === 'select') {
      return (
        <select value={value ?? ''} onChange={(e) => updateConfig(step.id, field.key, e.target.value)}>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (field.input === 'checkbox') {
      return (
        <label className="wf-builder__checkbox">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => updateConfig(step.id, field.key, e.target.checked)}
          />
          {field.label}
        </label>
      );
    }

    if (field.input === 'textarea') {
      return (
        <textarea
          value={value ?? ''}
          onChange={(e) => updateConfig(step.id, field.key, e.target.value)}
          rows={4}
        />
      );
    }

    if (field.input === 'number') {
      return (
        <input
          type="number"
          min="0"
          value={value ?? 0}
          onChange={(e) => updateConfig(step.id, field.key, parseInt(e.target.value, 10) || 0)}
        />
      );
    }

    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => updateConfig(step.id, field.key, e.target.value)}
      />
    );
  };

  // Per-transition Type + user/group restrictions, shown only once a target is
  // chosen (there's no transition to configure otherwise).
  const renderTransitionAdvanced = (step, role) => {
    const transition = getTransition(step, role);
    if (!transition) return null;

    return (
      <details className="wf-builder__transition-advanced">
        <summary>Advanced: type &amp; permissions</summary>
        <div className="wf-builder__edit-row">
          <label>Transition type</label>
          <select
            value={transition.transitionType || 'Active'}
            onChange={(e) => patchTransition(step, role, { transitionType: e.target.value })}
          >
            {TRANSITION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="wf-builder__edit-row">
          <label>Restrict to groups</label>
          <p className="wf-builder__field-help">Leave empty to allow anyone assigned to the step.</p>
          {renderMultiSelect('groups', transition.groupIds, (ids) => patchTransition(step, role, { groupIds: ids }))}
        </div>
        <div className="wf-builder__edit-row">
          <label>Restrict to users</label>
          {renderMultiSelect('users', transition.userIds, (ids) => patchTransition(step, role, { userIds: ids }))}
        </div>
      </details>
    );
  };

  const renderTransitionRow = (step, role, labelNode, emptyOption) => (
    <div className="wf-builder__edit-row wf-builder__edit-row--branch">
      <label>{labelNode}</label>
      <select
        value={getTransitionTarget(step, role)}
        onChange={(e) => setTransitionTarget(step, role, e.target.value)}
      >
        <option value="">{emptyOption}</option>
        {otherStepOptions(step.id)}
      </select>
      {renderTransitionAdvanced(step, role)}
    </div>
  );

  const renderTransitions = (step) => {
    if (configFor(step.type).isOutcome) {
      return <p className="wf-builder__field-help">This step ends the workflow.</p>;
    }

    if (step.type === STEP_TYPES.APPROVAL) {
      return (
        <>
          {renderTransitionRow(step, 'approve', <><Icon name="check" /> If approved, go to:</>, 'Next step in order')}
          {renderTransitionRow(step, 'reject', <><Icon name="cross" /> If rejected, go to:</>, 'End workflow (reject)')}
        </>
      );
    }

    return renderTransitionRow(step, 'next', <><Icon name="arrow-down" /> Then go to:</>, 'End workflow');
  };

  // Groups are a small, bounded list → preloaded and filtered client-side.
  // Users can be huge → searched server-side on demand (AJAX), so the page
  // never loads every account. Selected users keep their labels via userLabels.
  const renderMultiSelect = (source, selectedIds, onChange) => {
    if (source === 'users') {
      return (
        <MultiSelect
          value={selectedIds}
          onChange={onChange}
          onSearch={searchUsers}
          labels={userLabels}
          placeholder="Search users…"
        />
      );
    }

    return (
      <MultiSelect
        options={meta.groups || {}}
        value={selectedIds}
        onChange={onChange}
        placeholder="Search groups…"
      />
    );
  };

  /**
   * Split steps into the main approval flow and a separate rejection path.
   * The main flow is clustered so the support steps (assign/notify/etc.) that
   * lead up to an approval or publish step are grouped with it. Anything only
   * reachable when content is rejected (or a Cancel step) is pulled out into
   * its own group so the happy path stays easy to read.
   */
  const buildFlow = () => {
    if (steps.length === 0) return { groups: [], rejection: [] };

    const rejectReachable = new Set();
    const follow = (id) => {
      if (!id || rejectReachable.has(id)) return;
      rejectReachable.add(id);
      const target = steps.find((x) => x.id === id);
      if (!target) return;
      (target.transitions || []).forEach((t) => follow(t.nextStepId));
    };

    // Seed from the reject transitions of approval steps, then follow onwards.
    steps.forEach((step) => {
      if (step.type === STEP_TYPES.APPROVAL) {
        (step.transitions || []).filter(isRejectTransition).forEach((t) => follow(t.nextStepId));
      }
    });

    // Cancel steps and anything titled "reject…" always belong to the outcome group.
    steps.forEach((step) => {
      if (step.type === STEP_TYPES.CANCEL || /reject/i.test(step.title || '')) {
        rejectReachable.add(step.id);
      }
    });

    const flowSteps = steps.filter((s) => !rejectReachable.has(s.id));
    const rejection = steps.filter((s) => rejectReachable.has(s.id));

    const groups = [];
    let current = { anchor: null, support: [] };

    flowSteps.forEach((step) => {
      const isAnchor = step.type === STEP_TYPES.APPROVAL || step.type === STEP_TYPES.PUBLISH;
      if (isAnchor) {
        current.anchor = step;
        groups.push(current);
        current = { anchor: null, support: [] };
      } else {
        current.support.push(step);
      }
    });

    if (current.support.length > 0) {
      groups.push({ anchor: null, support: current.support, label: 'Final steps' });
    }

    return { groups, rejection };
  };

  const renderStepItem = (step, { number = null, variant = '' } = {}) => {
    const config = configFor(step.type);
    const isSelected = selectedId === step.id;
    const globalIndex = steps.indexOf(step);
    const classes = [
      'wf-builder__sidebar-item',
      variant,
      isSelected ? 'wf-builder__sidebar-item--active' : '',
    ].filter(Boolean).join(' ');

    return (
      <div
        key={step.id}
        className={classes}
        onClick={() => setSelectedId(step.id)}
        role="button"
        tabIndex={0}
        aria-selected={isSelected}
      >
        {number !== null && <span className="wf-builder__sidebar-num">{number}</span>}
        <span className="wf-builder__sidebar-icon"><Icon name={config.icon} /></span>
        <div className="wf-builder__sidebar-info">
          <span className="wf-builder__sidebar-item-title">{step.title}</span>
          <span className="wf-builder__sidebar-item-type">
            {config.label}
            {step.type === STEP_TYPES.APPROVAL && (
              <span
                className="wf-builder__sidebar-gate"
                title="The workflow pauses here until someone approves or rejects"
              >
                <Icon name="pause" /> Gate
              </span>
            )}
          </span>
        </div>
        <div className="wf-builder__sidebar-arrows">
          <button
            onClick={(e) => { e.stopPropagation(); moveStep(globalIndex, -1); }}
            disabled={globalIndex === 0}
            type="button"
            title="Move up"
          ><Icon name="arrow-up" /></button>
          <button
            onClick={(e) => { e.stopPropagation(); moveStep(globalIndex, 1); }}
            disabled={globalIndex === steps.length - 1}
            type="button"
            title="Move down"
          ><Icon name="arrow-down" /></button>
        </div>
      </div>
    );
  };

  // Small tags under an approval step showing where each outcome leads.
  const renderBranchTags = (step) => {
    if (step.type !== STEP_TYPES.APPROVAL) return null;
    const approve = getTransitionTarget(step, 'approve');
    const reject = getTransitionTarget(step, 'reject');
    if (!approve && !reject) return null;

    return (
      <div className="wf-builder__sidebar-branches">
        {approve && (
          <span className="wf-builder__branch-tag wf-builder__branch-tag--approve" title="If approved">
            <Icon name="check" /> {stepTitle(approve)}
          </span>
        )}
        {reject && (
          <span className="wf-builder__branch-tag wf-builder__branch-tag--reject" title="If rejected">
            <Icon name="cross" /> {stepTitle(reject)}
          </span>
        )}
      </div>
    );
  };

  const { groups: flowGroups, rejection: rejectionSteps } = buildFlow();

  return (
    <div className="wf-builder">
      <div className="wf-builder__header">
        <div>
          <span className="wf-builder__heading">Visual Workflow Builder</span>
          <p className="wf-builder__intro">
            Build the path content follows before it goes live. Steps run top to bottom and are grouped
            by the <strong>approval</strong> or <strong>publish</strong> step they lead up to. Approval
            steps pause the workflow and branch to an <em>approved</em> or <em>rejected</em> path — the
            rejection steps are gathered separately at the bottom so the main flow stays clear. Click any
            step to configure it.
          </p>
        </div>
        <div className="wf-builder__actions">
          {saveMessage && (
            <span className={`wf-builder__msg ${saveMessage.ok ? '' : 'wf-builder__msg--error'}`}>
              <Icon name={saveMessage.ok ? 'check' : 'cross'} /> {saveMessage.text}
            </span>
          )}
          <button className="wf-builder__btn wf-builder__btn--save" onClick={saveWorkflow} disabled={isSaving} type="button">
            {isSaving ? 'Saving…' : 'Save Workflow'}
          </button>
        </div>
      </div>

      <div className="wf-builder__columns">
        <div className="wf-builder__sidebar">
          <div className="wf-builder__sidebar-header">
            <span className="wf-builder__sidebar-title">Steps</span>
          </div>

          <div className="wf-builder__sidebar-list">
            {steps.length === 0 && (
              <p className="wf-builder__sidebar-help">
                No steps yet. Add your first step below — a typical flow is
                Assign&nbsp;→&nbsp;Notify&nbsp;→&nbsp;Approval&nbsp;→&nbsp;Publish.
              </p>
            )}

            {flowGroups.length > 0 && (
              <div className="wf-builder__sidebar-section-label">Main flow</div>
            )}

            {flowGroups.map((group, gi) => (
              <div key={gi} className="wf-builder__sidebar-group">
                {(group.support.length > 0 || !group.anchor) && (
                  <div className="wf-builder__sidebar-group-label">
                    {group.anchor ? `Leading to: ${group.anchor.title}` : (group.label || 'Steps')}
                  </div>
                )}
                {group.support.map((s) => renderStepItem(s, { variant: 'wf-builder__sidebar-item--support' }))}
                {group.anchor && renderStepItem(group.anchor, {
                  number: gi + 1,
                  variant: 'wf-builder__sidebar-item--anchor',
                })}
                {group.anchor && renderBranchTags(group.anchor)}
                {gi < flowGroups.length - 1 && (
                  <div className="wf-builder__sidebar-connector" aria-hidden="true" />
                )}
              </div>
            ))}

            {rejectionSteps.length > 0 && (
              <div className="wf-builder__sidebar-outcomes">
                <div className="wf-builder__sidebar-outcomes-label">Rejection path</div>
                <p className="wf-builder__sidebar-help">
                  These steps run only when content is rejected. They&apos;re kept separate from the
                  main flow above.
                </p>
                {rejectionSteps.map((s) => renderStepItem(s, {
                  variant: 'wf-builder__sidebar-item--outcome',
                }))}
              </div>
            )}
          </div>

          <div className="wf-builder__sidebar-add">
            <span className="wf-builder__add-label">Add a step:</span>
            {Object.entries(TYPE_CONFIG).filter(([, c]) => !c.advanced).map(([typeKey, typeConf]) => (
              <button
                key={typeKey}
                className="wf-builder__add-type"
                onClick={() => addStep(typeKey)}
                type="button"
                title={typeConf.description}
              >
                <span><Icon name={typeConf.icon} /></span> {typeConf.label}
              </button>
            ))}
            <details className="wf-builder__add-advanced">
              <summary>Advanced steps</summary>
              {Object.entries(TYPE_CONFIG).filter(([, c]) => c.advanced).map(([typeKey, typeConf]) => (
                <button
                  key={typeKey}
                  className="wf-builder__add-type"
                  onClick={() => addStep(typeKey)}
                  type="button"
                  title={typeConf.description}
                >
                  <span><Icon name={typeConf.icon} /></span> {typeConf.label}
                </button>
              ))}
            </details>
          </div>
        </div>

        <div className="wf-builder__content">
          {selectedStep && selectedConfig ? (
            <div className="wf-builder__edit">
              <div className="wf-builder__edit-header">
                <span className="wf-builder__edit-heading">
                  Step {selectedIndex + 1}: {selectedStep.title}
                </span>
                <span className="wf-builder__edit-badge">
                  <Icon name={selectedConfig.icon} /> {selectedConfig.label}
                </span>
              </div>

              <p className="wf-builder__edit-desc">{selectedConfig.description}</p>

              <div className="wf-builder__edit-row">
                <label>Step name</label>
                <input
                  value={selectedStep.title}
                  onChange={(e) => updateStep(selectedStep.id, { title: e.target.value })}
                />
              </div>

              <div className="wf-builder__edit-row">
                <label>What should this step do?</label>
                <div className="wf-builder__type-cards">
                  {Object.entries(TYPE_CONFIG).map(([typeKey, typeConf]) => (
                    <button
                      key={typeKey}
                      type="button"
                      className={`wf-builder__type-card ${selectedStep.type === typeKey ? 'wf-builder__type-card--selected' : ''}`}
                      onClick={() => updateStep(selectedStep.id, { type: typeKey })}
                    >
                      <span className="wf-builder__type-card-icon"><Icon name={typeConf.icon} /></span>
                      <span className="wf-builder__type-card-label">{typeConf.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {CONFIG_FIELDS[selectedStep.type] && CONFIG_FIELDS[selectedStep.type].length > 0 && (
                <>
                  <div className="wf-builder__edit-divider" />
                  {CONFIG_FIELDS[selectedStep.type].map((field) => (
                    <div className="wf-builder__edit-row" key={field.key}>
                      {field.input !== 'checkbox' && <label>{field.label}</label>}
                      {field.help && <p className="wf-builder__field-help">{field.help}</p>}
                      {renderConfigField(selectedStep, field)}
                    </div>
                  ))}
                </>
              )}

              <div className="wf-builder__edit-divider" />
              <label>What happens after this step?</label>
              {renderTransitions(selectedStep)}

              <div className="wf-builder__edit-divider" />
              <button
                className="wf-builder__btn wf-builder__btn--delete"
                onClick={() => removeStep(selectedStep.id)}
                type="button"
              >
                Remove this step
              </button>
            </div>
          ) : (
            <div className="wf-builder__content-empty">
              <p className="wf-builder__empty-title">{steps.length === 0 ? 'No steps yet' : 'Select a step'}</p>
              <p className="wf-builder__empty-desc">
                {steps.length === 0
                  ? 'Add your first step from the left. A typical workflow assigns reviewers, notifies them, waits for approval, then publishes.'
                  : 'Click a step in the sidebar to configure it.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
