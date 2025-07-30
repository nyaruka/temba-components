import { expect, fixture, html } from '@open-wc/testing';
import { ActionEditor } from '../src/flow/ActionEditor';
import { SendMsg } from '../src/store/flow-definition';
import '../temba-modules';

describe('ActionEditor', () => {
  let actionEditor: ActionEditor;

  beforeEach(async () => {
    actionEditor = await fixture(
      html`<temba-action-editor></temba-action-editor>`
    );
  });

  it('should create the component', () => {
    expect(actionEditor).to.exist;
    expect(actionEditor.tagName).to.equal('TEMBA-ACTION-EDITOR');
  });

  it('should render form for send_msg action', async () => {
    const sendMsgAction: SendMsg = {
      type: 'send_msg',
      uuid: 'test-action',
      text: 'Hello world',
      quick_replies: []
    };

    actionEditor.action = sendMsgAction;
    await actionEditor.updateComplete;

    // Give it another update cycle
    await new Promise((resolve) => setTimeout(resolve, 0));
    await actionEditor.updateComplete;

    // Check if dialog is open
    expect((actionEditor as any).isOpen).to.be.true;

    const dialog = actionEditor.shadowRoot?.querySelector('temba-dialog');
    expect(dialog).to.exist;

    // Look for form elements
    const formElements = actionEditor.shadowRoot?.querySelectorAll(
      'temba-textinput, temba-completion, temba-select, temba-checkbox'
    );
    expect(formElements?.length).to.be.greaterThan(0);
  });

  it('should handle save action', async () => {
    const sendMsgAction: SendMsg = {
      type: 'send_msg',
      uuid: 'test-action',
      text: 'Hello world',
      quick_replies: []
    };

    actionEditor.action = sendMsgAction;
    await actionEditor.updateComplete;

    // Give it another update cycle
    await new Promise((resolve) => setTimeout(resolve, 0));
    await actionEditor.updateComplete;

    let savedAction: any = null;
    actionEditor.addEventListener('temba-action-saved', (e: CustomEvent) => {
      savedAction = e.detail.action;
    });

    // Directly update form data to simulate input change
    (actionEditor as any).formData = {
      ...sendMsgAction,
      text: 'Updated message'
    };

    // Wait for update to complete
    await actionEditor.updateComplete;

    // Simulate save button click through dialog
    const dialog = actionEditor.shadowRoot?.querySelector(
      'temba-dialog'
    ) as any;
    if (dialog) {
      dialog.dispatchEvent(
        new CustomEvent('temba-button-clicked', {
          detail: { button: { name: 'Save' } }
        })
      );
    }

    expect(savedAction).to.exist;
    expect(savedAction.text).to.equal('Updated message');
  });

  it('should handle cancel action', async () => {
    const sendMsgAction: SendMsg = {
      type: 'send_msg',
      uuid: 'test-action',
      text: 'Hello world',
      quick_replies: []
    };

    actionEditor.action = sendMsgAction;
    await actionEditor.updateComplete;

    // Give it another update cycle
    await new Promise((resolve) => setTimeout(resolve, 0));
    await actionEditor.updateComplete;

    let cancelCalled = false;
    actionEditor.addEventListener('temba-action-edit-canceled', () => {
      cancelCalled = true;
    });

    // Simulate cancel button click through dialog
    const dialog = actionEditor.shadowRoot?.querySelector(
      'temba-dialog'
    ) as any;
    expect(dialog).to.exist;

    dialog.dispatchEvent(
      new CustomEvent('temba-button-clicked', {
        detail: { button: { name: 'Cancel' } }
      })
    );

    // Give the event time to propagate
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cancelCalled).to.be.true;
  });

  describe('Data Transformation', () => {
    it('should transform quick replies from string array to name/value objects for form', async () => {
      // Create a SendMsg action with quick replies as string array
      const sendMsgAction: SendMsg = {
        uuid: 'test-uuid',
        type: 'send_msg',
        text: 'Hello, how can I help you?',
        quick_replies: ['Option 1', 'Option 2', 'Option 3']
      };

      // Set the action and trigger initialization
      actionEditor.action = sendMsgAction;
      await actionEditor.updateComplete;

      // Access the private formData to verify transformation
      const formData = (actionEditor as any).formData;

      // Check that quick_replies were transformed to name/value objects
      expect(formData.quick_replies).to.be.an('array');
      expect(formData.quick_replies).to.have.length(3);
      expect(formData.quick_replies[0]).to.deep.equal({
        name: 'Option 1',
        value: 'Option 1'
      });
      expect(formData.quick_replies[1]).to.deep.equal({
        name: 'Option 2',
        value: 'Option 2'
      });
      expect(formData.quick_replies[2]).to.deep.equal({
        name: 'Option 3',
        value: 'Option 3'
      });
    });

    it('should transform quick replies back to string array when saving', async () => {
      // Create a SendMsg action
      const sendMsgAction: SendMsg = {
        uuid: 'test-uuid',
        type: 'send_msg',
        text: 'Hello, how can I help you?',
        quick_replies: ['Original Option']
      };

      actionEditor.action = sendMsgAction;
      await actionEditor.updateComplete;

      // Simulate form data with name/value objects
      (actionEditor as any).formData = {
        ...sendMsgAction,
        quick_replies: [
          { name: 'New Option 1', value: 'New Option 1' },
          { name: 'New Option 2', value: 'New Option 2' }
        ]
      };

      // Listen for the save event
      let savedAction: SendMsg | null = null;
      actionEditor.addEventListener('temba-action-saved', (event: any) => {
        savedAction = event.detail.action;
      });

      // Trigger save
      (actionEditor as any).handleSave();

      // Verify the saved action has string array format
      expect(savedAction).to.not.be.null;
      expect(savedAction!.quick_replies).to.be.an('array');
      expect(savedAction!.quick_replies).to.have.length(2);
      expect(savedAction!.quick_replies).to.deep.equal([
        'New Option 1',
        'New Option 2'
      ]);
    });

    it('should handle empty quick replies arrays', async () => {
      const sendMsgAction: SendMsg = {
        uuid: 'test-uuid',
        type: 'send_msg',
        text: 'Hello, how can I help you?',
        quick_replies: []
      };

      actionEditor.action = sendMsgAction;
      await actionEditor.updateComplete;

      const formData = (actionEditor as any).formData;
      expect(formData.quick_replies).to.be.an('array');
      expect(formData.quick_replies).to.have.length(0);
    });

    it('should handle undefined quick replies', async () => {
      const sendMsgAction: SendMsg = {
        uuid: 'test-uuid',
        type: 'send_msg',
        text: 'Hello, how can I help you?',
        quick_replies: [] // Initialize as empty array since it's required
      };

      // Simulate undefined quick_replies by setting it to undefined after creation
      (sendMsgAction as any).quick_replies = undefined;

      actionEditor.action = sendMsgAction;
      await actionEditor.updateComplete;

      const formData = (actionEditor as any).formData;
      expect(formData.quick_replies).to.be.an('array');
      expect(formData.quick_replies).to.have.length(0);
    });
  });
});
