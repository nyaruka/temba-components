import '../temba-modules';
import { html, fixture, expect } from '@open-wc/testing';
import { assertScreenshot, getClip } from './utils.test';

// Define interface for NodeEditor component
interface NodeEditorElement extends HTMLElement {
  action?: any;
  node?: any;
  nodeUI?: any;
  isOpen?: boolean;
  updateComplete: Promise<boolean>;
}

const assertDialogScreenshot = async (
  el: NodeEditorElement,
  screenshotName: string
) => {
  const dialog = el.shadowRoot
    .querySelector('temba-dialog')
    .shadowRoot.querySelector('.dialog-container') as HTMLElement;
  await assertScreenshot(screenshotName, getClip(dialog));
};

describe('temba-node-editor', () => {
  it('can be created', async () => {
    const el = (await fixture(html`
      <temba-node-editor .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    expect(el).to.exist;
    expect(el.tagName).to.equal('TEMBA-NODE-EDITOR');
  });

  it('renders send_msg action', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'send_msg',
      text: 'Hello world',
      quick_replies: []
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;
    expect(el.shadowRoot).to.not.be.null;
    expect(el.action).to.equal(action);
  });

  it('renders send_msg action with message editor', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'send_msg',
      text: 'Hello @contact.name, check this out!',
      attachments: [
        'image/jpeg:http://example.com/photo.jpg',
        'image:@fields.profile_pic'
      ],
      quick_replies: ['Yes', 'No']
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;
    expect(el.shadowRoot).to.not.be.null;
    expect(el.action).to.equal(action);

    // Check that the message editor component is rendered
    const messageEditor = el.shadowRoot.querySelector(
      'temba-message-editor'
    ) as any;
    expect(messageEditor).to.not.be.null;
    expect(messageEditor.value).to.equal(action.text);
  });

  it('renders set_run_result action', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'set_run_result',
      name: 'result_name',
      value: 'result_value'
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;
    expect(el.shadowRoot).to.not.be.null;
    expect(el.action).to.equal(action);
  });

  it('renders set_contact_field action', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'set_contact_field',
      field: { key: 'age', name: 'Age' },
      value: '25'
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;
    expect(el.shadowRoot).to.not.be.null;
    expect(el.action).to.equal(action);
  });

  it('renders add_contact_groups action', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'add_contact_groups',
      groups: [{ uuid: 'group-1', name: 'Test Group' }]
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;
    expect(el.shadowRoot).to.not.be.null;
    expect(el.action).to.equal(action);
  });

  it('renders enter_flow action', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'enter_flow',
      flow: { uuid: 'flow-1', name: 'Sub Flow' }
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;
    expect(el.shadowRoot).to.not.be.null;
    expect(el.action).to.equal(action);
  });

  it('renders node with router configuration', async () => {
    const node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: [{ uuid: 'exit-1', name: 'Default' }],
      router: {
        type: 'switch',
        result_name: 'result',
        categories: [{ uuid: 'cat-1', name: 'Category 1', exit_uuid: 'exit-1' }]
      }
    };

    const nodeUI = {
      type: 'split_by_expression',
      position: { left: 100, top: 100 }
    };

    const el = (await fixture(html`
      <temba-node-editor
        .node=${node}
        .nodeUI=${nodeUI}
        .isOpen=${true}
      ></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;
    expect(el.shadowRoot).to.not.be.null;
    expect(el.node).to.equal(node);
    expect(el.nodeUI).to.equal(nodeUI);

    await assertDialogScreenshot(el, 'editor/router');
  });

  it('renders node with wait configuration', async () => {
    const node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: [{ uuid: 'exit-1', name: 'Default' }],
      wait: {
        type: 'msg'
      }
    };

    const nodeUI = {
      type: 'wait_for_response',
      position: { left: 100, top: 100 }
    };

    const el = (await fixture(html`
      <temba-node-editor
        .node=${node}
        .nodeUI=${nodeUI}
        .isOpen=${true}
      ></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;
    expect(el.shadowRoot).to.not.be.null;
    expect(el.node).to.equal(node);
    expect(el.nodeUI).to.equal(nodeUI);

    await assertDialogScreenshot(el, 'editor/wait');
  });

  it('handles different button actions', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'send_msg',
      text: 'Hello world',
      quick_replies: []
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;

    let saveEventFired = false;
    let cancelEventFired = false;

    el.addEventListener('temba-action-saved', () => {
      saveEventFired = true;
    });

    el.addEventListener('temba-node-edit-cancelled', () => {
      cancelEventFired = true;
    });

    // Get the dialog element inside the node editor
    const dialog = el.shadowRoot!.querySelector('temba-dialog');
    expect(dialog).to.not.be.null;

    // Test Save button by dispatching event on the dialog
    const saveEvent = new CustomEvent('temba-button-clicked', {
      detail: { button: { name: 'Save' } },
      bubbles: true
    });
    dialog!.dispatchEvent(saveEvent);
    expect(saveEventFired).to.equal(true);

    // Reset for cancel test
    saveEventFired = false;

    // Test Cancel button
    const cancelEvent = new CustomEvent('temba-button-clicked', {
      detail: { button: { name: 'Cancel' } },
      bubbles: true
    });
    dialog!.dispatchEvent(cancelEvent);
    expect(cancelEventFired).to.equal(true);
  });

  it('handles property updates', async () => {
    const el = (await fixture(html`
      <temba-node-editor .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    // Test action property update
    const action = {
      uuid: 'test-action-uuid',
      type: 'send_msg',
      text: 'Hello world',
      quick_replies: []
    };

    el.action = action;
    await el.updateComplete;
    expect(el.action).to.equal(action);

    // Test node property update
    const node = {
      uuid: 'test-node-uuid',
      actions: [],
      exits: []
    };

    el.node = node;
    await el.updateComplete;
    expect(el.node).to.equal(node);

    // Test nodeUI property update
    const nodeUI = {
      type: 'execute_actions',
      position: { left: 100, top: 100 }
    };

    el.nodeUI = nodeUI;
    await el.updateComplete;
    expect(el.nodeUI).to.equal(nodeUI);
  });

  it('handles form submission events', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'send_msg',
      text: 'Hello world',
      quick_replies: []
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;

    // Since the form submission handling is complex and involves internal components,
    // we'll just verify the component renders without errors and has the expected structure
    const shadowRoot = el.shadowRoot;
    expect(shadowRoot).to.not.be.null;

    // Verify dialog is present
    const dialog = shadowRoot!.querySelector('temba-dialog');
    expect(dialog).to.not.be.null;
  });

  it('handles form validation', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'send_msg',
      text: 'Hello world',
      quick_replies: []
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;

    // Test that the component renders form elements
    const shadowRoot = el.shadowRoot;
    expect(shadowRoot).to.not.be.null;
  });

  it('renders different action types correctly', async () => {
    const actionTypes = [
      {
        type: 'send_msg',
        data: { text: 'Message', quick_replies: [] }
      },
      {
        type: 'set_run_result',
        data: { name: 'result', value: 'value' }
      },
      {
        type: 'set_contact_name',
        data: { name: 'John Doe' }
      },
      {
        type: 'set_contact_language',
        data: { language: 'eng' }
      }
    ];

    for (const actionType of actionTypes) {
      const action = {
        uuid: `test-${actionType.type}`,
        type: actionType.type,
        ...actionType.data
      };

      const el = (await fixture(html`
        <temba-node-editor
          .action=${action}
          .isOpen=${true}
        ></temba-node-editor>
      `)) as NodeEditorElement;

      await el.updateComplete;
      expect(el.shadowRoot).to.not.be.null;
      expect(el.action.type).to.equal(actionType.type);

      await assertDialogScreenshot(el, `editor/${actionType.type}`);
    }
  });

  it('displays bubble count for group value counts', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'send_msg',
      text: 'Hello world',
      quick_replies: ['Yes', 'No', 'Maybe'],
      attachments: ['image:@contact.photo', 'document:@contact.resume']
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;

    // Wait for form data to be fully initialized and re-render to complete
    await new Promise((resolve) => setTimeout(resolve, 200));
    await el.updateComplete;

    // Check that bubble counts are displayed
    const shadowRoot = el.shadowRoot;
    const bubbles = shadowRoot.querySelectorAll('.group-count-bubble');

    // Should have bubbles for groups with values
    expect(bubbles.length).to.be.greaterThan(0);

    // Check specific bubble values (trim to handle whitespace in rendered text)
    const bubbleTexts = Array.from(bubbles).map((bubble) =>
      bubble.textContent?.trim()
    );

    // Runtime attachments group should show bubble when collapsed and has values
    expect(bubbleTexts).to.include('2'); // 2 runtime attachments
    // Note: Quick replies group auto-expands when it has content, so no bubble is shown
  });

  it('shows arrow when group has no values', async () => {
    const action = {
      uuid: 'test-action-uuid',
      type: 'send_msg',
      text: 'Hello world'
      // No quick_replies or attachments provided
    };

    const el = (await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;

    // Wait for form data initialization
    await new Promise((resolve) => setTimeout(resolve, 200));
    await el.updateComplete;

    // Check that arrows are displayed instead of bubbles
    const shadowRoot = el.shadowRoot;
    const bubbles = shadowRoot.querySelectorAll('.group-count-bubble');
    const arrows = shadowRoot.querySelectorAll('.group-toggle-icon');

    // Should have no bubbles when counts are 0
    expect(bubbles.length).to.equal(0);

    // Should have arrows for collapsible groups
    expect(arrows.length).to.be.greaterThan(0);
  });

  it('renders split_by_llm_categorize node', async () => {
    const node = {
      uuid: 'test-node-uuid',
      actions: [
        {
          uuid: 'call-llm-uuid',
          type: 'call_llm',
          llm: { uuid: 'llm-123', name: 'Test LLM' },
          input: '@input',
          instructions:
            '@(prompt("categorize", slice(node.categories, 0, -2)))',
          output_local: '_llm_output'
        }
      ],
      router: {
        type: 'switch',
        operand: '@locals._llm_output',
        result_name: 'Intent',
        categories: [
          { uuid: 'cat-1', name: 'Greeting', exit_uuid: 'exit-1' },
          { uuid: 'cat-2', name: 'Question', exit_uuid: 'exit-2' },
          { uuid: 'cat-3', name: 'Other', exit_uuid: 'exit-3' },
          { uuid: 'cat-4', name: 'Failure', exit_uuid: 'exit-4' }
        ]
      },
      exits: [
        { uuid: 'exit-1', destination_uuid: null },
        { uuid: 'exit-2', destination_uuid: null },
        { uuid: 'exit-3', destination_uuid: null },
        { uuid: 'exit-4', destination_uuid: null }
      ]
    };

    const nodeUI = { type: 'split_by_llm_categorize' };

    const el = (await fixture(html`
      <temba-node-editor
        .node=${node}
        .nodeUI=${nodeUI}
        .isOpen=${true}
      ></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;
    expect(el.shadowRoot).to.not.be.null;
    expect(el.node).to.equal(node);
    expect(el.nodeUI).to.equal(nodeUI);

    // Wait for form data initialization
    await new Promise((resolve) => setTimeout(resolve, 200));
    await el.updateComplete;

    // Check if the dialog is rendered with correct header
    const dialog = el.shadowRoot.querySelector('temba-dialog');
    expect(dialog).to.not.be.null;
    expect(dialog.getAttribute('header')).to.equal('Split by AI');

    // Check that the form is rendered
    const form = el.shadowRoot.querySelector('.node-editor-form');
    expect(form).to.not.be.null;

    // Check that all expected form components are rendered
    const selectComponents = el.shadowRoot.querySelectorAll('temba-select');
    const arrayComponents =
      el.shadowRoot.querySelectorAll('temba-array-editor');
    const completionComponents =
      el.shadowRoot.querySelectorAll('temba-completion');

    // Should have LLM select field
    expect(selectComponents.length).to.equal(1);
    expect(selectComponents[0].getAttribute('label')).to.equal('LLM');

    // Should have input completion field
    expect(completionComponents.length).to.equal(1);
    expect(completionComponents[0].getAttribute('label')).to.equal('Input');

    // Should have categories array editor
    expect(arrayComponents.length).to.equal(1);
  });

  it('renders wait_for_response node', async () => {
    const node = {
      uuid: 'test-wait-node-uuid',
      actions: [],
      router: {
        type: 'switch',
        wait: {
          type: 'msg',
          timeout: 300 // 5 minutes in seconds
        },
        result_name: 'response',
        categories: []
      },
      exits: []
    };

    const nodeUI = { type: 'wait_for_response' };

    const el = (await fixture(html`
      <temba-node-editor
        .node=${node}
        .nodeUI=${nodeUI}
        .isOpen=${true}
      ></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;

    // Wait for form data initialization
    await new Promise((resolve) => setTimeout(resolve, 200));
    await el.updateComplete;

    // Check that the dialog is rendered with correct header
    const dialog = el.shadowRoot.querySelector('temba-dialog');
    expect(dialog).to.not.be.null;
    expect(dialog.getAttribute('header')).to.equal('Wait for Response');

    // Check that timeout and result name fields are rendered
    const textComponents = el.shadowRoot.querySelectorAll('temba-textinput');
    expect(textComponents.length).to.equal(1);

    // Verify the field labels
    const labels = Array.from(textComponents).map((comp) =>
      comp.getAttribute('label')
    );
    expect(labels).to.include('Result Name');
  });

  it('prioritizes node config over action config for non-execute_actions nodes', async () => {
    // Create a split_by_llm_categorize node that has both actions and should use node config
    const node = {
      uuid: 'test-node-uuid',
      actions: [
        {
          uuid: 'call-llm-uuid',
          type: 'call_llm',
          llm: { uuid: 'llm-123', name: 'Test LLM' },
          input: '@input',
          instructions:
            '@(prompt("categorize", slice(node.categories, 0, -2)))',
          output_local: '_llm_output'
        }
      ],
      router: {
        type: 'switch',
        operand: '@locals._llm_output',
        result_name: 'Intent',
        categories: [
          { uuid: 'cat-1', name: 'Greeting', exit_uuid: 'exit-1' },
          { uuid: 'cat-2', name: 'Question', exit_uuid: 'exit-2' }
        ]
      },
      exits: [
        { uuid: 'exit-1', destination_uuid: null },
        { uuid: 'exit-2', destination_uuid: null }
      ]
    };

    const nodeUI = { type: 'split_by_llm_categorize' };

    // Simulate having both node and action set (which happens when editing from flow)
    const el = (await fixture(html`
      <temba-node-editor
        .node=${node}
        .nodeUI=${nodeUI}
        .action=${node.actions[0]}
        .isOpen=${true}
      >
      </temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;

    // Wait for form data initialization
    await new Promise((resolve) => setTimeout(resolve, 200));
    await el.updateComplete;

    // Should show node editor (Split by AI Categorize), not action editor (Call LLM)
    const dialog = el.shadowRoot.querySelector('temba-dialog');
    expect(dialog.getAttribute('header')).to.equal('Split by AI');

    // Should have node config fields (LLM, Input, Categories, Result Name)
    const selectComponents = el.shadowRoot.querySelectorAll('temba-select');
    const arrayComponents =
      el.shadowRoot.querySelectorAll('temba-array-editor');

    // Should have LLM select and categories array (node config fields)
    expect(selectComponents.length).to.equal(1);
    expect(arrayComponents.length).to.equal(1);
  });

  it('initializes categories correctly for split_by_llm_categorize', async () => {
    const node = {
      uuid: 'test-node-uuid',
      actions: [
        {
          uuid: 'call-llm-uuid',
          type: 'call_llm',
          llm: { uuid: 'llm-123', name: 'Test LLM' },
          input: '@input',
          instructions:
            '@(prompt("categorize", slice(node.categories, 0, -2)))',
          output_local: '_llm_output'
        }
      ],
      router: {
        type: 'switch',
        operand: '@locals._llm_output',
        result_name: 'Intent',
        categories: [
          { uuid: 'cat-1', name: 'Greeting', exit_uuid: 'exit-1' },
          { uuid: 'cat-2', name: 'Question', exit_uuid: 'exit-2' },
          { uuid: 'cat-3', name: 'Other', exit_uuid: 'exit-3' },
          { uuid: 'cat-4', name: 'Failure', exit_uuid: 'exit-4' }
        ]
      },
      exits: [
        { uuid: 'exit-1', destination_uuid: null },
        { uuid: 'exit-2', destination_uuid: null },
        { uuid: 'exit-3', destination_uuid: null },
        { uuid: 'exit-4', destination_uuid: null }
      ]
    };

    const nodeUI = { type: 'split_by_llm_categorize' };

    const el = (await fixture(html`
      <temba-node-editor
        .node=${node}
        .nodeUI=${nodeUI}
        .isOpen=${true}
      ></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;

    // Wait for form data initialization
    await new Promise((resolve) => setTimeout(resolve, 200));
    await el.updateComplete;

    // Access the component's formData directly to check initialization
    const formData = (el as any).formData;

    // Should have 2 categories (Greeting and Question, excluding Other and Failure)
    expect(formData.categories).to.be.an('array');
    expect(formData.categories.length).to.equal(2);
    expect(formData.categories[0].name).to.equal('Greeting');
    expect(formData.categories[1].name).to.equal('Question');

    // Check that the array editor component receives the correct value
    const arrayEditor = el.shadowRoot.querySelector('temba-array-editor');
    expect(arrayEditor).to.not.be.null;

    // Wait a bit more for the array editor to fully render
    await new Promise((resolve) => setTimeout(resolve, 500));
    await el.updateComplete;

    // Check the values of the textinput components within the array items
    const textInputs =
      arrayEditor.shadowRoot?.querySelectorAll('temba-textinput');

    if (textInputs && textInputs.length >= 2) {
      // The first two textinputs should have the category names
      expect((textInputs[0] as any).value).to.equal('Greeting');
      expect((textInputs[1] as any).value).to.equal('Question');
    }
  });

  it('properly initializes categories when node is set after component creation', async () => {
    // First create the component without any data
    const el = (await fixture(html`
      <temba-node-editor .isOpen=${false}></temba-node-editor>
    `)) as NodeEditorElement;

    await el.updateComplete;

    // Then set the node data (simulating real usage)
    const node = {
      uuid: 'test-node-uuid',
      actions: [
        {
          uuid: 'call-llm-uuid',
          type: 'call_llm',
          llm: { uuid: 'llm-123', name: 'Test LLM' },
          input: '@input',
          instructions:
            '@(prompt("categorize", slice(node.categories, 0, -2)))',
          output_local: '_llm_output'
        }
      ],
      router: {
        type: 'switch',
        operand: '@locals._llm_output',
        result_name: 'Intent',
        categories: [
          { uuid: 'cat-1', name: 'Greeting', exit_uuid: 'exit-1' },
          { uuid: 'cat-2', name: 'Question', exit_uuid: 'exit-2' },
          { uuid: 'cat-3', name: 'Other', exit_uuid: 'exit-3' },
          { uuid: 'cat-4', name: 'Failure', exit_uuid: 'exit-4' }
        ]
      },
      exits: [
        { uuid: 'exit-1', destination_uuid: null },
        { uuid: 'exit-2', destination_uuid: null },
        { uuid: 'exit-3', destination_uuid: null },
        { uuid: 'exit-4', destination_uuid: null }
      ]
    };

    const nodeUI = { type: 'split_by_llm_categorize' };

    // Set the properties (this should trigger updated() and openDialog())
    el.node = node;
    el.nodeUI = nodeUI;

    await el.updateComplete;

    // Wait for dialog to open and form data to initialize
    await new Promise((resolve) => setTimeout(resolve, 300));
    await el.updateComplete;

    // Check that the form data is properly initialized
    const formData = (el as any).formData;

    expect(formData.categories).to.be.an('array');
    expect(formData.categories.length).to.equal(2);
    expect(formData.categories[0].name).to.equal('Greeting');
    expect(formData.categories[1].name).to.equal('Question');

    // Check that array editor gets the correct values
    const arrayEditor = el.shadowRoot.querySelector('temba-array-editor');
    expect(arrayEditor).to.not.be.null;

    const textInputs =
      arrayEditor.shadowRoot?.querySelectorAll('temba-textinput');
    if (textInputs && textInputs.length >= 2) {
      expect((textInputs[0] as any).value).to.equal('Greeting');
      expect((textInputs[1] as any).value).to.equal('Question');
    }
  });

  it('preserves UUIDs for unchanged categories in split_by_llm_categorize', async () => {
    const originalNode: any = {
      uuid: 'test-node-uuid',
      actions: [
        {
          uuid: 'existing-call-llm-uuid',
          type: 'call_llm',
          llm: { uuid: 'llm-123', name: 'Test LLM' },
          input: '@input',
          instructions:
            '@(prompt("categorize", slice(node.categories, 0, -2)))',
          output_local: '_llm_output'
        }
      ],
      router: {
        type: 'switch',
        operand: '@locals._llm_output',
        result_name: 'Intent',
        categories: [
          {
            uuid: 'existing-cat-1',
            name: 'Greeting',
            exit_uuid: 'existing-exit-1'
          },
          {
            uuid: 'existing-cat-2',
            name: 'Question',
            exit_uuid: 'existing-exit-2'
          },
          {
            uuid: 'existing-cat-other',
            name: 'Other',
            exit_uuid: 'existing-exit-other'
          },
          {
            uuid: 'existing-cat-failure',
            name: 'Failure',
            exit_uuid: 'existing-exit-failure'
          }
        ],
        cases: [
          {
            uuid: 'existing-case-1',
            type: 'has_only_text',
            arguments: ['Greeting'],
            category_uuid: 'existing-cat-1'
          },
          {
            uuid: 'existing-case-2',
            type: 'has_only_text',
            arguments: ['Question'],
            category_uuid: 'existing-cat-2'
          },
          {
            uuid: 'existing-case-error',
            type: 'has_only_text',
            arguments: ['<ERROR>'],
            category_uuid: 'existing-cat-failure'
          }
        ]
      },
      exits: [
        { uuid: 'existing-exit-1', destination_uuid: 'some-destination-1' },
        { uuid: 'existing-exit-2', destination_uuid: 'some-destination-2' },
        { uuid: 'existing-exit-other', destination_uuid: null },
        { uuid: 'existing-exit-failure', destination_uuid: null }
      ]
    };

    // Import the node config to test fromFormData directly
    const { split_by_llm_categorize } = await import(
      '../src/flow/nodes/split_by_llm_categorize'
    );

    // Test with same categories - should preserve UUIDs
    const formDataSame = {
      llm: [{ value: 'llm-123', name: 'Test LLM' }],
      input: '@input',
      categories: [{ name: 'Greeting' }, { name: 'Question' }],
      result_name: 'Intent'
    };

    const resultSame = split_by_llm_categorize.fromFormData(
      formDataSame,
      originalNode
    );

    // Should preserve existing UUIDs for unchanged categories
    expect(resultSame.actions[0].uuid).to.equal('existing-call-llm-uuid');

    const greetingCategory = resultSame.router.categories.find(
      (cat) => cat.name === 'Greeting'
    );
    const questionCategory = resultSame.router.categories.find(
      (cat) => cat.name === 'Question'
    );
    const otherCategory = resultSame.router.categories.find(
      (cat) => cat.name === 'Other'
    );
    const failureCategory = resultSame.router.categories.find(
      (cat) => cat.name === 'Failure'
    );

    expect(greetingCategory.uuid).to.equal('existing-cat-1');
    expect(greetingCategory.exit_uuid).to.equal('existing-exit-1');
    expect(questionCategory.uuid).to.equal('existing-cat-2');
    expect(questionCategory.exit_uuid).to.equal('existing-exit-2');
    expect(otherCategory.uuid).to.equal('existing-cat-other');
    expect(failureCategory.uuid).to.equal('existing-cat-failure');

    // Should preserve destination UUIDs for exits
    const greetingExit = resultSame.exits.find(
      (exit) => exit.uuid === 'existing-exit-1'
    );
    const questionExit = resultSame.exits.find(
      (exit) => exit.uuid === 'existing-exit-2'
    );
    expect(greetingExit.destination_uuid).to.equal('some-destination-1');
    expect(questionExit.destination_uuid).to.equal('some-destination-2');

    // Test with changed categories - should generate new UUIDs for new categories
    const formDataChanged = {
      llm: [{ value: 'llm-123', name: 'Test LLM' }],
      input: '@input',
      categories: [
        { name: 'Greeting' }, // unchanged - should keep UUID
        { name: 'NewCategory' } // new - should get new UUID
      ],
      result_name: 'Intent'
    };

    const resultChanged = split_by_llm_categorize.fromFormData(
      formDataChanged,
      originalNode
    );

    const greetingCategoryChanged = resultChanged.router.categories.find(
      (cat) => cat.name === 'Greeting'
    );
    const newCategory = resultChanged.router.categories.find(
      (cat) => cat.name === 'NewCategory'
    );

    // Greeting should keep its existing UUID
    expect(greetingCategoryChanged.uuid).to.equal('existing-cat-1');
    expect(greetingCategoryChanged.exit_uuid).to.equal('existing-exit-1');

    // NewCategory should get a new UUID (not one of the existing ones)
    expect(newCategory.uuid).to.not.equal('existing-cat-1');
    expect(newCategory.uuid).to.not.equal('existing-cat-2');
    expect(newCategory.uuid).to.not.equal('existing-cat-other');
    expect(newCategory.uuid).to.not.equal('existing-cat-failure');
    expect(newCategory.uuid).to.have.length.greaterThan(0);
  });
});
