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
    esp: 'Spanish'
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

  const openLocalizationWindow = async (
    flowEditor: Editor
  ): Promise<HTMLElement> => {
    const tab = flowEditor.querySelector('#localization-tab');
    tab.dispatchEvent(
      new CustomEvent('temba-button-clicked', { bubbles: true })
    );
    await flowEditor.updateComplete;
    return flowEditor.querySelector('#localization-window') as HTMLElement;
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

  it('should render localization floating tab when translations exist', () => {
    const tab = editor.querySelector('#localization-tab');
    expect(tab).to.exist;

    const windowEl = editor.querySelector('#localization-window') as any;
    expect(windowEl).to.exist;
    expect(windowEl.hidden).to.be.true;
  });

  it('should open localization window with translation languages excluding base', async () => {
    const tab = editor.querySelector('#localization-tab');
    tab.dispatchEvent(
      new CustomEvent('temba-button-clicked', { bubbles: true })
    );
    await editor.updateComplete;

    const windowEl = editor.querySelector('#localization-window') as any;
    expect(windowEl.hidden).to.be.false;

    const select = windowEl.querySelector('temba-select') as any;
    expect(select).to.exist;
    expect(select.values[0].value).to.equal('fra');

    const options = windowEl.querySelectorAll('temba-option');
    expect(options.length).to.equal(2);
    const optionLabels = Array.from(options).map((opt: Element) =>
      opt.getAttribute('name')
    );
    expect(optionLabels).to.include('French');
    expect(optionLabels).to.include('Spanish');
    expect(optionLabels).to.not.include('English');

    const state = zustand.getState();
    expect(state.languageCode).to.equal('fra');

    const summary = windowEl.querySelector('.localization-progress-summary');
    expect(summary?.textContent.trim()).to.equal('0 of 1 items translated');

    const progress = windowEl.querySelector('temba-progress') as any;
    expect(progress).to.exist;
    expect(progress.current).to.equal(0);
    expect(progress.total).to.equal(1);
    expect(progress.animated).to.be.false;
  });

  it('should toggle translation settings and persist include categories preference', async () => {
    await openLocalizationWindow(editor);

    const toggle = editor.querySelector(
      '.translation-settings-toggle'
    ) as HTMLElement;
    expect(toggle).to.exist;

    toggle.dispatchEvent(new Event('click', { bubbles: true }));
    await editor.updateComplete;

    const checkbox = editor.querySelector(
      '#translation-settings-panel temba-checkbox'
    ) as any;
    expect(checkbox).to.exist;
    expect(Boolean(checkbox.checked)).to.be.false;

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    await editor.updateComplete;

    const filters = zustand.getState().flowDefinition._ui.translation_filters;
    expect(filters?.categories).to.be.true;
  });

  it('should allow toggling translation languages within the window', async () => {
    const tab = editor.querySelector('#localization-tab');
    tab.dispatchEvent(
      new CustomEvent('temba-button-clicked', { bubbles: true })
    );
    await editor.updateComplete;

    const windowEl = editor.querySelector('#localization-window');
    const select = windowEl.querySelector('temba-select') as any;
    expect(select).to.exist;

    select.values = [{ name: 'Spanish', value: 'esp' }];
    select.dispatchEvent(new CustomEvent('change', { bubbles: true }));
    await editor.updateComplete;

    const state = zustand.getState();
    expect(state.languageCode).to.equal('esp');
    const summary = windowEl.querySelector('.localization-progress-summary');
    expect(summary?.textContent.trim()).to.equal('All items are translated.');
  });

  it('should include category translations when include categories is enabled', async () => {
    editor?.remove();

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

    await openLocalizationWindow(editor);

    let summary = editor
      .querySelector('.localization-progress-summary')
      .textContent.trim();
    expect(summary).to.equal(
      'Add content or enable more options to start translating.'
    );

    const toggle = editor.querySelector(
      '.translation-settings-toggle'
    ) as HTMLElement;
    toggle.dispatchEvent(new Event('click', { bubbles: true }));
    await editor.updateComplete;

    const checkbox = editor.querySelector(
      'temba-checkbox[name="include-categories"]'
    ) as any;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    await editor.updateComplete;

    summary = editor
      .querySelector('.localization-progress-summary')
      .textContent.trim();
    expect(summary).to.equal('0 of 2 items translated');
  });

  it('should remove category localization when translation is cleared', async () => {
    editor?.remove();
    editor = null;

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

  it('should open auto translate dialog when clicking auto translate', async () => {
    await openLocalizationWindow(editor);

    const autoTranslateButton = editor.querySelector(
      '.auto-translate-button'
    ) as HTMLButtonElement;
    expect(autoTranslateButton.disabled).to.be.false;

    autoTranslateButton.click();
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

  it('should return to base language when window closes', async () => {
    const tab = editor.querySelector('#localization-tab');
    tab.dispatchEvent(
      new CustomEvent('temba-button-clicked', { bubbles: true })
    );
    await editor.updateComplete;

    const windowEl = editor.querySelector('#localization-window') as any;
    windowEl.close();
    await editor.updateComplete;

    const state = zustand.getState();
    expect(state.languageCode).to.equal('eng');
    expect(windowEl.hidden).to.be.true;
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
    zustand.getState().setLanguageCode('esp');

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
});
