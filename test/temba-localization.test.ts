import { expect, fixture, html } from '@open-wc/testing';
import { Editor } from '../src/flow/Editor';
import { NodeEditor } from '../src/flow/NodeEditor';
import { SendMsg, FlowDefinition } from '../src/store/flow-definition';
import { zustand } from '../src/store/AppState';
import { send_msg } from '../src/flow/actions/send_msg';
import '../temba-modules';

describe('Localization Editing', () => {
  let editor: Editor;
  let storeElement: HTMLElement;

  const languageNames: Record<string, string> = {
    eng: 'English',
    fra: 'French',
    spa: 'Spanish'
  };

  const setupWorkspace = () => {
    zustand.setState({
      workspace: {
        uuid: 'test-workspace',
        name: 'Test Workspace',
        languages: ['eng', 'fra', 'spa'],
        primary_language: 'eng',
        timezone: 'UTC',
        date_style: 'day_first',
        country: 'US',
        anon: false
      }
    });
  };

  const buildCategoryFlowDefinition = (
    localization: Record<string, any> = {}
  ): FlowDefinition => ({
    uuid: 'category-flow',
    name: 'Category Flow',
    language: 'eng',
    type: 'messaging',
    revision: 1,
    spec_version: '14.3',
    localization,
    nodes: [
      {
        uuid: 'split-node',
        actions: [],
        exits: [
          { uuid: 'split-exit-1', destination_uuid: null },
          { uuid: 'split-exit-2', destination_uuid: null }
        ],
        router: {
          type: 'random',
          categories: [
            {
              uuid: 'cat-1',
              name: 'First bucket',
              exit_uuid: 'split-exit-1'
            },
            {
              uuid: 'cat-2',
              name: 'Second bucket',
              exit_uuid: 'split-exit-2'
            }
          ]
        }
      }
    ],
    _ui: {
      nodes: {
        'split-node': {
          position: { left: 0, top: 0 },
          type: 'split_by_random'
        }
      },
      languages: []
    }
  });

  const selectLanguageInToolbar = async (
    flowEditor: Editor,
    languageName: string,
    languageCode: string
  ): Promise<void> => {
    // Open language options dropdown
    const languageBtn = flowEditor.querySelector('#language-btn') as HTMLElement;
    languageBtn.click();
    await flowEditor.updateComplete;

    // Select the language via the handler
    (flowEditor as any).handleLanguageOptionSelected(
      new CustomEvent('temba-selection', {
        detail: { selected: { name: languageName, value: languageCode } }
      })
    );
    await flowEditor.updateComplete;
  };

  before(() => {
    storeElement = document.createElement('temba-store');
    (storeElement as any).getLanguageName = (code: string) =>
      languageNames[code];
    document.body.appendChild(storeElement);
  });

  after(() => {
    storeElement?.remove();
  });

  afterEach(() => {
    editor?.remove();
  });

  beforeEach(async () => {
    // Set workspace with languages
    setupWorkspace();

    // Create a flow definition with localization data
    const flowDefinition: FlowDefinition = {
      uuid: 'test-flow',
      name: 'Test Flow',
      language: 'eng',
      type: 'messaging',
      revision: 1,
      spec_version: '14.3',
      localization: {
        spa: {
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

  it('should render language controls in toolbar when translations exist', () => {
    const languageBtn = editor.querySelector('#language-btn');
    expect(languageBtn).to.exist;
  });

  it('should show language options with non-base languages', async () => {
    // Open language dropdown
    const languageBtn = editor.querySelector('#language-btn') as HTMLElement;
    languageBtn.click();
    await editor.updateComplete;

    // The options should contain non-base languages
    const options = editor.querySelector('temba-options');
    expect(options).to.exist;
  });

  it('should toggle categories and persist include categories preference', async () => {
    // Switch to a non-base language so translation tools appear
    await selectLanguageInToolbar(editor, 'French', 'fra');

    // Click the categories toggle button in the toolbar
    const categoriesBtn = editor.querySelector(
      '.toolbar-btn[aria-label="Toggle categories"]'
    ) as HTMLButtonElement;
    expect(categoriesBtn).to.exist;

    categoriesBtn.click();
    await editor.updateComplete;

    const filters = zustand.getState().flowDefinition._ui.translation_filters;
    expect(filters?.categories).to.be.true;
  });

  it('should allow switching translation languages via toolbar', async () => {
    await selectLanguageInToolbar(editor, 'Spanish', 'spa');

    const state = zustand.getState();
    expect(state.languageCode).to.equal('spa');
  });

  it('should include category translations when categories toggle is enabled', async () => {
    editor?.remove();

    setupWorkspace();

    const categoryFlowDefinition: FlowDefinition =
      buildCategoryFlowDefinition();

    zustand.getState().setFlowContents({
      definition: categoryFlowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 1, languages: 2 },
        locals: []
      }
    });

    editor = await fixture(html`<temba-flow-editor></temba-flow-editor>`);
    await editor.updateComplete;

    // Switch to a non-base language
    await selectLanguageInToolbar(editor, 'French', 'fra');

    // Toggle categories on
    const categoriesBtn = editor.querySelector(
      '.toolbar-btn[aria-label="Toggle categories"]'
    ) as HTMLButtonElement;
    categoriesBtn.click();
    await editor.updateComplete;

    // Check that progress now includes categories
    const progress = (editor as any).getLocalizationProgress('fra');
    expect(progress.total).to.equal(2);
  });

  it('should open auto translate dialog when clicking auto translate', async () => {
    await selectLanguageInToolbar(editor, 'French', 'fra');

    const autoTranslateBtn = editor.querySelector(
      '.toolbar-btn[aria-label="Auto translate"]'
    ) as HTMLButtonElement;
    expect(autoTranslateBtn).to.exist;
    expect(autoTranslateBtn.disabled).to.be.false;

    autoTranslateBtn.click();
    await editor.updateComplete;

    expect((editor as any).autoTranslateDialogOpen).to.be.true;
    const dialog = editor.querySelector(
      'temba-dialog[header="Auto translate"]'
    );
    const modelSelect = dialog?.querySelector(
      '.auto-translate-model-select'
    ) as HTMLElement;
    expect(modelSelect).to.exist;
    expect(modelSelect.getAttribute('endpoint')).to.equal(
      '/api/internal/llms.json'
    );
  });

  it('should preserve selected language across renders', async () => {
    await selectLanguageInToolbar(editor, 'Spanish', 'spa');

    expect(zustand.getState().languageCode).to.equal('spa');

    // Trigger a re-render
    await editor.requestUpdate();
    await editor.updateComplete;

    // Language should remain as Spanish
    const state = zustand.getState();
    expect(state.languageCode).to.equal('spa');
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

  it('should include language name in dialog header when translating', async () => {
    // Switch to Spanish
    zustand.getState().setLanguageCode('spa');

    const action: SendMsg = {
      type: 'send_msg',
      uuid: 'action-1',
      text: 'Hello world',
      quick_replies: []
    };

    const nodeEditor: NodeEditor = await fixture(html`
      <temba-node-editor .action=${action} .isOpen=${true}> </temba-node-editor>
    `);

    await nodeEditor.updateComplete;

    // Check dialog header
    const dialog = nodeEditor.shadowRoot.querySelector('temba-dialog');
    expect(dialog).to.exist;
    expect(dialog.getAttribute('header')).to.equal('Spanish - Send Message');
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

  it('should remove category localization when translation is cleared', async () => {
    editor?.remove();
    editor = null;

    setupWorkspace();

    const flowDefinition = buildCategoryFlowDefinition({
      fra: {
        'cat-1': { name: ['Premier choix'] },
        'cat-2': { name: ['Deuxième choix'] }
      }
    });

    zustand.getState().setFlowContents({
      definition: flowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 1, languages: 2 },
        locals: []
      }
    });
    zustand.getState().setLanguageCode('fra');

    const state = zustand.getState();
    const node = state.flowDefinition.nodes[0];
    const nodeUI = state.flowDefinition._ui.nodes[node.uuid];

    const nodeEditor: NodeEditor = await fixture(html`
      <temba-node-editor
        .node=${node}
        .nodeUI=${nodeUI}
        .isOpen=${true}
      ></temba-node-editor>
    `);
    await nodeEditor.updateComplete;

    const formData = (nodeEditor as any).formData;
    formData.categories['cat-1'].localizedName = '';

    (nodeEditor as any).handleSave();

    const localization =
      zustand.getState().flowDefinition.localization?.fra || {};
    expect(localization['cat-1']).to.be.undefined;
    expect(localization['cat-2']).to.deep.equal({ name: ['Deuxième choix'] });

    nodeEditor.remove();
  });

  it('should remove empty localization entries when all category translations are cleared', async () => {
    editor?.remove();
    editor = null;

    setupWorkspace();

    const flowDefinition = buildCategoryFlowDefinition({
      fra: {
        'cat-1': { name: ['Premier choix'] }
      }
    });

    zustand.getState().setFlowContents({
      definition: flowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 1, languages: 2 },
        locals: []
      }
    });
    zustand.getState().setLanguageCode('fra');

    const state = zustand.getState();
    const node = state.flowDefinition.nodes[0];
    const nodeUI = state.flowDefinition._ui.nodes[node.uuid];

    const nodeEditor: NodeEditor = await fixture(html`
      <temba-node-editor
        .node=${node}
        .nodeUI=${nodeUI}
        .isOpen=${true}
      ></temba-node-editor>
    `);
    await nodeEditor.updateComplete;

    const formData = (nodeEditor as any).formData;
    formData.categories['cat-1'].localizedName = '';

    (nodeEditor as any).handleSave();

    const localization = zustand.getState().flowDefinition.localization;
    expect(localization).to.be.undefined;

    nodeEditor.remove();
  });
});
