import { expect, fixture, html } from '@open-wc/testing';
import { Editor } from '../src/flow/Editor';
import { NodeEditor } from '../src/flow/NodeEditor';
import { SendMsg, FlowDefinition } from '../src/store/flow-definition';
import { zustand } from '../src/store/AppState';
import { send_msg } from '../src/flow/actions/send_msg';
import '../temba-modules';

describe('Localization Editing', () => {
  let editor: Editor;

  beforeEach(async () => {
    // Create a flow definition with localization data
    const flowDefinition: FlowDefinition = {
      uuid: 'test-flow',
      name: 'Test Flow',
      language: 'eng',
      type: 'messaging',
      revision: 1,
      spec_version: '14.3',
      localization: {
        esp: {
          'action-1': {
            text: ['Hola mundo'],
            quick_replies: ['Sí', 'No']
          }
        }
      },
      nodes: [
        {
          uuid: 'node-1',
          actions: [
            {
              type: 'send_msg',
              uuid: 'action-1',
              text: 'Hello world',
              quick_replies: ['Yes', 'No']
            } as SendMsg
          ],
          exits: [{ uuid: 'exit-1' }]
        }
      ],
      _ui: {
        nodes: {
          'node-1': {
            position: { left: 100, top: 100 }
          }
        },
        languages: []
      }
    };

    // Initialize store with flow definition
    zustand.getState().setFlowContents({
      definition: flowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 1, languages: 2 },
        locals: []
      }
    });

    editor = await fixture(html`<temba-flow-editor></temba-flow-editor>`);
    await editor.updateComplete;
  });

  it('should display language selector toolbar', async () => {
    const toolbar = editor.querySelector('#language-toolbar');
    expect(toolbar).to.exist;

    // Check that all three languages are present
    const buttons = toolbar.querySelectorAll('.language-button');
    expect(buttons.length).to.equal(3);

    const buttonTexts = Array.from(buttons).map((btn) =>
      btn.textContent.trim()
    );
    expect(buttonTexts).to.include('English');
    expect(buttonTexts).to.include('French');
    expect(buttonTexts).to.include('Spanish');
  });

  it('should show English as active by default', async () => {
    const toolbar = editor.querySelector('#language-toolbar');
    const buttons = toolbar.querySelectorAll('.language-button');

    const activeButton = Array.from(buttons).find((btn) =>
      btn.classList.contains('active')
    );
    expect(activeButton).to.exist;
    expect(activeButton.textContent.trim()).to.equal('English');
  });

  it('should change language when clicking language button', async () => {
    const toolbar = editor.querySelector('#language-toolbar');
    const buttons = toolbar.querySelectorAll('.language-button');

    // Find and click Spanish button
    const spanishButton = Array.from(buttons).find(
      (btn) => btn.textContent.trim() === 'Spanish'
    ) as HTMLElement;
    expect(spanishButton).to.exist;

    spanishButton.click();
    await editor.updateComplete;

    // Check that Spanish is now active
    expect(spanishButton.classList.contains('translating')).to.be.true;

    // Check store was updated
    const state = zustand.getState();
    expect(state.languageCode).to.equal('esp');
    expect(state.isTranslating).to.be.true;
  });

  it('should load base language values when in English', () => {
    const action: SendMsg = {
      type: 'send_msg',
      uuid: 'action-1',
      text: 'Hello world',
      quick_replies: ['Yes', 'No']
    };

    const formData = send_msg.toFormData(action);

    expect(formData.text).to.equal('Hello world');
    expect(formData.quick_replies).to.have.lengthOf(2);
    expect(formData.quick_replies[0].value).to.equal('Yes');
    expect(formData.quick_replies[1].value).to.equal('No');
  });

  it('should load localized values when in Spanish', () => {
    const action: SendMsg = {
      type: 'send_msg',
      uuid: 'action-1',
      text: 'Hello world',
      quick_replies: ['Yes', 'No']
    };

    const localization = {
      text: ['Hola mundo'],
      quick_replies: ['Sí', 'No']
    };

    const formData = send_msg.toLocalizationFormData(action, localization);

    expect(formData.text).to.equal('Hola mundo');
    expect(formData.quick_replies).to.have.lengthOf(2);
    expect(formData.quick_replies[0].value).to.equal('Sí');
    expect(formData.quick_replies[1].value).to.equal('No');
  });

  it('should fall back to base language if no localization exists', () => {
    const action: SendMsg = {
      type: 'send_msg',
      uuid: 'action-1',
      text: 'Hello world',
      quick_replies: ['Yes', 'No']
    };

    const localization = {}; // Empty localization

    const formData = send_msg.toLocalizationFormData(action, localization);

    // Should show base language values (but empty since localization is empty)
    expect(formData.text).to.equal('');
    expect(formData.quick_replies).to.be.undefined;
  });

  it('should convert form data to localization format', () => {
    const action: SendMsg = {
      type: 'send_msg',
      uuid: 'action-1',
      text: 'Hello world',
      quick_replies: ['Yes', 'No']
    };

    const formData = {
      uuid: 'action-1',
      text: 'Bonjour le monde',
      quick_replies: [
        { name: 'Oui', value: 'Oui' },
        { name: 'Non', value: 'Non' }
      ]
    };

    const localization = send_msg.fromLocalizationFormData(formData, action);

    expect(localization.text).to.deep.equal(['Bonjour le monde']);
    expect(localization.quick_replies).to.deep.equal(['Oui', 'Non']);
  });

  it('should not include unchanged values in localization', () => {
    const action: SendMsg = {
      type: 'send_msg',
      uuid: 'action-1',
      text: 'Hello world',
      quick_replies: ['Yes', 'No']
    };

    const formData = {
      uuid: 'action-1',
      text: 'Hello world', // Same as base
      quick_replies: [
        { name: 'Yes', value: 'Yes' },
        { name: 'No', value: 'No' }
      ] // Same as base
    };

    const localization = send_msg.fromLocalizationFormData(formData, action);

    // should not include unchanged values
    expect(localization.text).to.be.undefined;
    expect(localization.quick_replies).to.be.undefined;
  });

  it('should show "(Localizing)" in dialog header when translating', async () => {
    // Switch to Spanish
    zustand.getState().setLanguageCode('esp');

    const action: SendMsg = {
      type: 'send_msg',
      uuid: 'action-1',
      text: 'Hello world',
      quick_replies: []
    };

    const nodeEditor: NodeEditor = await fixture(html`
      <temba-node-editor .action=${action}></temba-node-editor>
    `);

    await nodeEditor.updateComplete;

    // Check dialog header
    const dialog = nodeEditor.shadowRoot.querySelector('temba-dialog');
    expect(dialog).to.exist;
    expect(dialog.getAttribute('header')).to.include('Localizing');
  });

  it('should handle attachments in localization', () => {
    const action: SendMsg = {
      type: 'send_msg',
      uuid: 'action-1',
      text: 'Hello',
      attachments: ['image/jpeg:http://example.com/image.jpg']
    };

    const localization = {
      text: ['Hola'],
      attachments: ['image/jpeg:http://example.com/imagen.jpg']
    };

    const formData = send_msg.toLocalizationFormData(action, localization);

    expect(formData.text).to.equal('Hola');
    expect(formData.attachments).to.have.lengthOf(1);
    expect(formData.attachments[0]).to.equal(
      'image/jpeg:http://example.com/imagen.jpg'
    );
  });

  it('should handle runtime attachments in localization', () => {
    const action: SendMsg = {
      type: 'send_msg',
      uuid: 'action-1',
      text: 'Hello',
      attachments: ['image:@fields.profile_pic']
    };

    const localization = {
      text: ['Hola'],
      attachments: ['image:@fields.foto_perfil']
    };

    const formData = send_msg.toLocalizationFormData(action, localization);

    expect(formData.text).to.equal('Hola');
    expect(formData.runtime_attachments).to.have.lengthOf(1);
    expect(formData.runtime_attachments[0].expression).to.equal(
      '@fields.foto_perfil'
    );
  });

  it('should identify localizable fields', () => {
    expect(send_msg.localizable).to.exist;
    expect(send_msg.localizable).to.include('text');
    expect(send_msg.localizable).to.include('quick_replies');
    expect(send_msg.localizable).to.include('attachments');
  });

  it('should save empty localization when all values match base', () => {
    const action: SendMsg = {
      type: 'send_msg',
      uuid: 'action-1',
      text: 'Hello world',
      quick_replies: []
    };

    const formData = {
      uuid: 'action-1',
      text: 'Hello world' // Same as base, so shouldn't be saved
    };

    const localization = send_msg.fromLocalizationFormData(formData, action);

    // empty localization when nothing changed
    expect(Object.keys(localization)).to.have.lengthOf(0);
  });
});
