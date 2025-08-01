import { expect, fixture, html } from '@open-wc/testing';
import { ActionEditor } from '../src/flow/ActionEditor';
import { Action } from '../src/store/flow-definition';
import { UIConfig, COLORS } from '../src/flow/types';
import '../temba-modules';

// Define a test action type that demonstrates form data abstraction
interface TestComplexAction extends Action {
  type: 'test_complex';
  name: string;
  email: string;
  options: string[];
}

// Define a form data structure that combines action properties
interface TestFormData {
  contact_info: string; // combines name and email
  selected_options: Array<{ name: string; value: string }>; // transforms options array
}

// Create a test config that uses the new form-level transformations
const testComplexConfig: UIConfig = {
  name: 'Test Complex Action',
  color: COLORS.update,
  // New form-level transformations
  toFormValue: (action: TestComplexAction): TestFormData => {
    return {
      contact_info: `${action.name} <${action.email}>`,
      selected_options: action.options.map(opt => ({ name: opt, value: opt }))
    };
  },
  fromFormValue: (formData: TestFormData): TestComplexAction => {
    // Extract name and email from combined contact_info
    const contactMatch = formData.contact_info.match(/^(.*?)\s*<([^>]+)>$/);
    const name = contactMatch ? contactMatch[1].trim() : formData.contact_info;
    const email = contactMatch ? contactMatch[2] : '';
    
    return {
      type: 'test_complex',
      uuid: 'test-uuid',
      name,
      email,
      options: formData.selected_options.map(opt => opt.value)
    };
  },
  // Form configuration with keys matching form data structure
  form: {
    contact_info: {
      label: 'Contact Information',
      helpText: 'Enter name and email as "Name <email@example.com>"',
      required: true,
      widget: {
        type: 'temba-textinput',
        attributes: {
          placeholder: 'John Doe <john@example.com>'
        }
      }
    },
    selected_options: {
      label: 'Options',
      helpText: 'Select multiple options',
      widget: {
        type: 'temba-select',
        attributes: {
          multi: true,
          tags: true,
          placeholder: 'Add options...'
        }
      }
    }
  }
};

describe('ActionEditor Form Data Abstraction', () => {
  let actionEditor: ActionEditor;

  beforeEach(async () => {
    // Temporarily add our test config to the editor config
    const { EDITOR_CONFIG } = await import('../src/flow/config');
    (EDITOR_CONFIG as any).test_complex = testComplexConfig;

    actionEditor = await fixture(
      html`<temba-action-editor></temba-action-editor>`
    );
  });

  it('should use form-level toFormValue transformation', async () => {
    const testAction: TestComplexAction = {
      type: 'test_complex',
      uuid: 'test-uuid',
      name: 'John Doe',
      email: 'john@example.com',
      options: ['option1', 'option2']
    };

    actionEditor.action = testAction;
    await actionEditor.updateComplete;

    // Give it another update cycle
    await new Promise((resolve) => setTimeout(resolve, 0));
    await actionEditor.updateComplete;

    // Check that formData was transformed correctly
    const formData = (actionEditor as any).formData;
    expect(formData.contact_info).to.equal('John Doe <john@example.com>');
    expect(formData.selected_options).to.deep.equal([
      { name: 'option1', value: 'option1' },
      { name: 'option2', value: 'option2' }
    ]);
  });

  it('should use form-level fromFormValue transformation on save', async () => {
    const testAction: TestComplexAction = {
      type: 'test_complex',
      uuid: 'test-uuid',
      name: 'John Doe',
      email: 'john@example.com',
      options: ['option1']
    };

    actionEditor.action = testAction;
    await actionEditor.updateComplete;

    // Give it another update cycle
    await new Promise((resolve) => setTimeout(resolve, 0));
    await actionEditor.updateComplete;

    let savedAction: TestComplexAction | null = null;
    actionEditor.addEventListener('temba-action-saved', (e: CustomEvent) => {
      savedAction = e.detail.action;
    });

    // Update form data to simulate user input
    (actionEditor as any).formData = {
      contact_info: 'Jane Smith <jane@example.com>',
      selected_options: [
        { name: 'option1', value: 'option1' },
        { name: 'option3', value: 'option3' }
      ]
    };

    await actionEditor.updateComplete;

    // Trigger save
    const dialog = actionEditor.shadowRoot?.querySelector('temba-dialog') as any;
    if (dialog) {
      dialog.dispatchEvent(
        new CustomEvent('temba-button-clicked', {
          detail: { button: { name: 'Save' } }
        })
      );
    }

    expect(savedAction).to.exist;
    expect(savedAction!.name).to.equal('Jane Smith');
    expect(savedAction!.email).to.equal('jane@example.com');
    expect(savedAction!.options).to.deep.equal(['option1', 'option3']);
  });

  it('should render form fields based on form configuration', async () => {
    const testAction: TestComplexAction = {
      type: 'test_complex',
      uuid: 'test-uuid',
      name: 'John Doe',
      email: 'john@example.com',
      options: ['option1']
    };

    actionEditor.action = testAction;
    await actionEditor.updateComplete;

    // Give it another update cycle
    await new Promise((resolve) => setTimeout(resolve, 0));
    await actionEditor.updateComplete;

    // Check that form renders with expected fields based on form config
    const textInput = actionEditor.shadowRoot?.querySelector('temba-textinput[name="contact_info"]');
    const select = actionEditor.shadowRoot?.querySelector('temba-select[name="selected_options"]');
    
    expect(textInput).to.exist;
    expect(select).to.exist;
    
    // Verify that the transformed form values are displayed
    expect((textInput as any).value).to.equal('John Doe <john@example.com>');
  });
});