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

  const getToolbar = async (flowEditor: Editor) => {
    const toolbar = flowEditor.querySelector('temba-editor-toolbar') as any;
    if (toolbar) await toolbar.updateComplete;
    return toolbar;
  };

  const selectLanguageInToolbar = async (
    flowEditor: Editor,
    languageName: string,
    languageCode: string
  ): Promise<void> => {
    const toolbar = await getToolbar(flowEditor);
    // Open language options dropdown
    const languageBtn = toolbar.shadowRoot.querySelector(
      '#language-btn'
    ) as HTMLElement;
    languageBtn.click();
    await toolbar.updateComplete;

    // Select the language via the toolbar's handler
    (toolbar as any).handleLanguageOptionSelected(
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

    editor = await fixture(
      html`<temba-flow-editor
        features='["auto_translate"]'
      ></temba-flow-editor>`
    );
    await editor.updateComplete;
  });

  it('should render language controls in toolbar when translations exist', async () => {
    const toolbar = await getToolbar(editor);
    const languageBtn = toolbar.shadowRoot.querySelector('#language-btn');
    expect(languageBtn).to.exist;
  });

  it('should hide language controls when flow has no nodes', async () => {
    editor?.remove();

    setupWorkspace();

    const emptyFlowDefinition: FlowDefinition = {
      uuid: 'empty-flow',
      name: 'Empty Flow',
      language: 'eng',
      type: 'messaging',
      revision: 1,
      spec_version: '14.3',
      localization: {},
      nodes: [],
      _ui: {
        nodes: {},
        languages: []
      }
    };

    zustand.getState().setFlowContents({
      definition: emptyFlowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 0, languages: 0 },
        locals: []
      }
    });

    editor = await fixture(
      html`<temba-flow-editor
        features='["auto_translate"]'
      ></temba-flow-editor>`
    );
    await editor.updateComplete;

    const toolbar = await getToolbar(editor);
    const languageBtn = toolbar.shadowRoot.querySelector('#language-btn');
    expect(languageBtn).to.be.null;
  });

  it('should show language options with non-base languages', async () => {
    const toolbar = await getToolbar(editor);
    // Open language dropdown
    const languageBtn = toolbar.shadowRoot.querySelector(
      '#language-btn'
    ) as HTMLElement;
    languageBtn.click();
    await toolbar.updateComplete;

    // The options should contain non-base languages
    const options = toolbar.shadowRoot.querySelector('temba-options');
    expect(options).to.exist;
  });

  it('should include category translations when per-node localizeCategories is set', async () => {
    editor?.remove();

    setupWorkspace();

    const categoryFlowDefinition: FlowDefinition =
      buildCategoryFlowDefinition();
    // Set localizeCategories on the node's UI config
    categoryFlowDefinition._ui.nodes['split-node'].config = {
      localizeCategories: true
    };

    zustand.getState().setFlowContents({
      definition: categoryFlowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 1, languages: 2 },
        locals: []
      }
    });

    editor = await fixture(
      html`<temba-flow-editor
        features='["auto_translate"]'
      ></temba-flow-editor>`
    );
    await editor.updateComplete;

    // Switch to a non-base language
    await selectLanguageInToolbar(editor, 'French', 'fra');

    // Check that progress includes the 2 categories
    const progress = (editor as any).getLocalizationProgress('fra');
    expect(progress.total).to.equal(2);
  });

  it('should allow switching translation languages via toolbar', async () => {
    await selectLanguageInToolbar(editor, 'Spanish', 'spa');

    const state = zustand.getState();
    expect(state.languageCode).to.equal('spa');
  });

  it('should exclude categories from progress when localizeCategories is not set', async () => {
    editor?.remove();

    setupWorkspace();

    // Flow with categories but no localizeCategories config
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

    editor = await fixture(
      html`<temba-flow-editor
        features='["auto_translate"]'
      ></temba-flow-editor>`
    );
    await editor.updateComplete;

    // Switch to a non-base language
    await selectLanguageInToolbar(editor, 'French', 'fra');

    // Without localizeCategories, progress should not include categories
    const progress = (editor as any).getLocalizationProgress('fra');
    expect(progress.total).to.equal(0);
  });

  it('should open auto translate dialog when clicking auto translate', async () => {
    await selectLanguageInToolbar(editor, 'French', 'fra');

    // Includes an engine-only model that should be filtered out of the
    // auto-translate picker, plus two valid editing models.
    (storeElement as any).getResults = async () => [
      { uuid: 'llm-1', name: 'GPT-4', roles: ['editing'] },
      { uuid: 'llm-2', name: 'Claude', roles: ['editing', 'engine'] },
      { uuid: 'llm-engine', name: 'EngineOnly', roles: ['engine'] }
    ];

    const autoTranslateBtn = editor
      .querySelector('temba-editor-toolbar')
      ?.shadowRoot?.querySelector(
        '.toolbar-btn[aria-label="Auto translate"]'
      ) as HTMLButtonElement;
    expect(autoTranslateBtn).to.exist;
    expect(autoTranslateBtn.disabled).to.be.false;

    autoTranslateBtn.click();
    await editor.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    const at = editor.querySelector('temba-auto-translate') as any;
    await at.updateComplete;

    expect(at.dialogOpen).to.be.true;
    // loadModels should have dropped the engine-only model
    expect(at.models.map((m: any) => m.uuid)).to.deep.equal(['llm-1', 'llm-2']);

    const dialog = at.shadowRoot.querySelector('.auto-translate-body');
    expect(dialog).to.exist;
    const modelSelect = dialog?.querySelector(
      '.auto-translate-model-select'
    ) as HTMLElement;
    expect(modelSelect).to.exist;
    expect(modelSelect.getAttribute('endpoint')).to.equal(
      '/api/internal/llms.json'
    );
    // and the temba-select shouldExclude predicate also rejects engine-only
    const shouldExclude = (modelSelect as any).shouldExclude;
    expect(shouldExclude({ roles: ['engine'] })).to.be.true;
    expect(shouldExclude({ roles: ['editing'] })).to.be.false;
  });

  it('should hide auto translate when the auto-translate flag is off', async () => {
    await selectLanguageInToolbar(editor, 'French', 'fra');
    const toolbar = editor.querySelector('temba-editor-toolbar') as any;
    // sanity check: the button is there when the flag is on
    expect(
      toolbar?.shadowRoot?.querySelector(
        '.toolbar-btn[aria-label="Auto translate"]'
      )
    ).to.exist;

    // remove the feature — button should disappear
    (editor as any).features = [];
    await editor.updateComplete;
    await toolbar.updateComplete;

    expect(
      toolbar?.shadowRoot?.querySelector(
        '.toolbar-btn[aria-label="Auto translate"]'
      )
    ).to.not.exist;
  });

  it('should hide auto translate when everything is translated', async () => {
    await selectLanguageInToolbar(editor, 'Spanish', 'spa');
    await editor.updateComplete;

    const toolbar = editor.querySelector('temba-editor-toolbar') as any;
    const autoTranslateBtn = toolbar?.shadowRoot?.querySelector(
      '.toolbar-btn[aria-label="Auto translate"]'
    );
    // spa has text translated; no pending, no button
    expect(autoTranslateBtn).to.not.exist;
  });

  it('should auto-skip picker when only one LLM is available', async () => {
    await selectLanguageInToolbar(editor, 'French', 'fra');

    // Engine-only model is present but should be filtered out, leaving a
    // single editing-capable model — the picker should still auto-skip.
    (storeElement as any).getResults = async () => [
      { uuid: 'llm-only', name: 'SoloGPT', roles: ['editing'] },
      { uuid: 'llm-engine', name: 'EngineOnly', roles: ['engine'] }
    ];

    const autoTranslateBtn = editor
      .querySelector('temba-editor-toolbar')
      ?.shadowRoot?.querySelector(
        '.toolbar-btn[aria-label="Auto translate"]'
      ) as HTMLButtonElement;
    autoTranslateBtn.click();
    await editor.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    const at = editor.querySelector('temba-auto-translate') as any;
    await at.updateComplete;

    expect(at.selectedModel?.uuid).to.equal('llm-only');
    const dialog = at.shadowRoot.querySelector('.auto-translate-body');
    expect(dialog?.querySelector('.auto-translate-model-select')).to.not.exist;
    expect(dialog?.textContent).to.not.contain('SoloGPT');
  });

  it('should include the brand name in the dialog copy when set', async () => {
    zustand.setState({ brand: 'TextIt' });
    try {
      await selectLanguageInToolbar(editor, 'French', 'fra');

      (storeElement as any).getResults = async () => [
        { uuid: 'llm-only', name: 'SoloGPT', roles: ['editing'] }
      ];

      const autoTranslateBtn = editor
        .querySelector('temba-editor-toolbar')
        ?.shadowRoot?.querySelector(
          '.toolbar-btn[aria-label="Auto translate"]'
        ) as HTMLButtonElement;
      autoTranslateBtn.click();
      await editor.updateComplete;
      await new Promise((r) => setTimeout(r, 0));
      const at = editor.querySelector('temba-auto-translate') as any;
      await at.updateComplete;

      const dialog = at.shadowRoot.querySelector('.auto-translate-body');
      expect(dialog?.textContent).to.contain(
        'TextIt uses AI for automatic translation'
      );
    } finally {
      zustand.setState({ brand: '' });
    }
  });

  it('should fall back to a generic AI clause when no brand is set', async () => {
    await selectLanguageInToolbar(editor, 'French', 'fra');

    (storeElement as any).getResults = async () => [
      { uuid: 'llm-only', name: 'SoloGPT', roles: ['editing'] }
    ];

    const autoTranslateBtn = editor
      .querySelector('temba-editor-toolbar')
      ?.shadowRoot?.querySelector(
        '.toolbar-btn[aria-label="Auto translate"]'
      ) as HTMLButtonElement;
    autoTranslateBtn.click();
    await editor.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    const at = editor.querySelector('temba-auto-translate') as any;
    await at.updateComplete;

    const dialog = at.shadowRoot.querySelector('.auto-translate-body');
    expect(dialog?.textContent).to.contain('Automatic translation uses AI');
  });

  it('should show empty state when no LLMs are configured', async () => {
    await selectLanguageInToolbar(editor, 'French', 'fra');

    (storeElement as any).getResults = async () => [];

    const autoTranslateBtn = editor
      .querySelector('temba-editor-toolbar')
      ?.shadowRoot?.querySelector(
        '.toolbar-btn[aria-label="Auto translate"]'
      ) as HTMLButtonElement;
    autoTranslateBtn.click();
    await editor.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    const at = editor.querySelector('temba-auto-translate') as any;
    await at.updateComplete;

    const dialog = at.shadowRoot.querySelector('.auto-translate-body');
    expect(dialog?.querySelector('.auto-translate-empty')).to.exist;
    const link = dialog?.querySelector(
      '.auto-translate-empty a'
    ) as HTMLAnchorElement;
    expect(link).to.exist;
    expect(link.getAttribute('href')).to.equal('/ai/');
  });

  it('should batch translation requests by serialized payload size', async () => {
    editor?.remove();

    setupWorkspace();

    // build a flow with enough send_msg actions that the total serialized
    // payload exceeds the 10,000-char batch threshold. Each text needs to
    // be unique or dedup will collapse them into a single payload entry.
    const nodes = [];
    for (let i = 0; i < 5; i++) {
      nodes.push({
        uuid: `node-${i}`,
        actions: [
          {
            type: 'send_msg',
            uuid: `action-${i}`,
            text: `${i} ${'x'.repeat(3000)}`
          } as SendMsg
        ],
        exits: [{ uuid: `exit-${i}` }]
      });
    }

    const flowDefinition: FlowDefinition = {
      uuid: 'batch-flow',
      name: 'Batch Flow',
      language: 'eng',
      type: 'messaging',
      revision: 1,
      spec_version: '14.3',
      localization: {},
      nodes,
      _ui: {
        nodes: Object.fromEntries(
          nodes.map((n) => [n.uuid, { position: { left: 0, top: 0 } }])
        ),
        languages: []
      }
    };

    zustand.getState().setFlowContents({
      definition: flowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 5, languages: 2 },
        locals: []
      }
    });

    editor = await fixture(
      html`<temba-flow-editor
        features='["auto_translate"]'
      ></temba-flow-editor>`
    );
    await editor.updateComplete;

    await selectLanguageInToolbar(editor, 'French', 'fra');
    const at = editor.querySelector('temba-auto-translate') as any;
    at.selectedModel = { uuid: 'llm-1', name: 'GPT-4' };

    const calls: any[] = [];
    (storeElement as any).postJSON = async (url: string, body: any) => {
      calls.push({ url, body });
      return { status: 200, json: { items: body.items } };
    };

    await at.runAutoTranslation();

    expect(calls.length).to.be.greaterThan(1);
    for (const c of calls) {
      const itemKeys = Object.keys(c.body.items as Record<string, string[]>);
      // each batch's full serialized payload stays within the limit
      // (individual oversize items are still shipped on their own; the
      // fixture values are each ~3000 chars which fits)
      const serialized = JSON.stringify(c.body).length;
      if (itemKeys.length > 1) {
        expect(serialized).to.be.at.most(10000);
      }
    }
  });

  it('should interrupt translation between batches', async () => {
    editor?.remove();

    setupWorkspace();

    // Each text is unique so dedup doesn't collapse them — we want enough
    // distinct entries to span multiple batches and verify interrupt.
    const nodes = [];
    for (let i = 0; i < 6; i++) {
      nodes.push({
        uuid: `node-${i}`,
        actions: [
          {
            type: 'send_msg',
            uuid: `action-${i}`,
            text: `${i} ${'y'.repeat(600)}`
          } as SendMsg
        ],
        exits: [{ uuid: `exit-${i}` }]
      });
    }

    const flowDefinition: FlowDefinition = {
      uuid: 'interrupt-flow',
      name: 'Interrupt Flow',
      language: 'eng',
      type: 'messaging',
      revision: 1,
      spec_version: '14.3',
      localization: {},
      nodes,
      _ui: {
        nodes: Object.fromEntries(
          nodes.map((n) => [n.uuid, { position: { left: 0, top: 0 } }])
        ),
        languages: []
      }
    };

    zustand.getState().setFlowContents({
      definition: flowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 6, languages: 2 },
        locals: []
      }
    });

    editor = await fixture(
      html`<temba-flow-editor
        features='["auto_translate"]'
      ></temba-flow-editor>`
    );
    await editor.updateComplete;
    await selectLanguageInToolbar(editor, 'French', 'fra');
    const at = editor.querySelector('temba-auto-translate') as any;
    at.selectedModel = { uuid: 'llm-1', name: 'GPT-4' };

    let callCount = 0;
    (storeElement as any).postJSON = async (url: string, body: any) => {
      callCount += 1;
      if (callCount === 1) {
        // request interrupt after first batch completes
        at.interrupt = true;
      }
      return { status: 200, json: { items: body.items } };
    };

    await at.runAutoTranslation();

    expect(callCount).to.equal(1);
    expect(at.running).to.be.false;
  });

  it('should preserve all attributes when one uuid spans multiple batches', async () => {
    editor?.remove();
    setupWorkspace();

    // send_email has two localizable attributes (subject + body) on the
    // same action uuid. Inflate them so they fall into separate batches.
    const longSubject = 's'.repeat(2500);
    const longBody = 'b'.repeat(8000);

    const flowDefinition: FlowDefinition = {
      uuid: 'multi-attr-flow',
      name: 'Multi Attr Flow',
      language: 'eng',
      type: 'messaging',
      revision: 1,
      spec_version: '14.3',
      localization: {},
      nodes: [
        {
          uuid: 'node-email',
          actions: [
            {
              type: 'send_email',
              uuid: 'email-1',
              subject: longSubject,
              body: longBody,
              addresses: ['x@y.com']
            } as any
          ],
          exits: [{ uuid: 'exit-1' }]
        }
      ],
      _ui: {
        nodes: { 'node-email': { position: { left: 0, top: 0 } } },
        languages: []
      }
    };

    zustand.getState().setFlowContents({
      definition: flowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 1, languages: 2 },
        locals: []
      }
    });

    editor = await fixture(
      html`<temba-flow-editor
        features='["auto_translate"]'
      ></temba-flow-editor>`
    );
    await editor.updateComplete;
    await selectLanguageInToolbar(editor, 'French', 'fra');
    const at = editor.querySelector('temba-auto-translate') as any;
    at.selectedModel = { uuid: 'llm-1', name: 'GPT-4' };

    const calls: any[] = [];
    (storeElement as any).postJSON = async (url: string, body: any) => {
      calls.push(body);
      return { status: 200, json: { items: body.items } };
    };

    await at.runAutoTranslation();

    // sanity check: subject and body landed in different batches
    expect(calls.length).to.be.greaterThan(1);
    const allKeys = new Set(calls.flatMap((c) => Object.keys(c.items)));
    expect(allKeys.has('email-1:subject')).to.be.true;
    expect(allKeys.has('email-1:body')).to.be.true;

    // both attributes should be present in the final localization, not
    // overwritten by the later batch
    const localized =
      zustand.getState().flowDefinition?.localization?.['fra']?.['email-1'];
    expect(localized?.subject).to.deep.equal([longSubject]);
    expect(localized?.body).to.deep.equal([longBody]);
  });

  it('should reuse existing translations for matching source content', async () => {
    editor?.remove();
    setupWorkspace();

    // action-a is already translated to French; action-b shares the same
    // source text but is not yet translated. Auto-translate should reuse
    // action-a's translation for action-b without sending it to the LLM.
    const flowDefinition: FlowDefinition = {
      uuid: 'reuse-flow',
      name: 'Reuse Flow',
      language: 'eng',
      type: 'messaging',
      revision: 1,
      spec_version: '14.3',
      localization: {
        fra: {
          'action-a': { text: ['Bonjour le monde'] }
        }
      },
      nodes: [
        {
          uuid: 'node-a',
          actions: [
            {
              type: 'send_msg',
              uuid: 'action-a',
              text: 'Hello world'
            } as SendMsg
          ],
          exits: [{ uuid: 'exit-a' }]
        },
        {
          uuid: 'node-b',
          actions: [
            {
              type: 'send_msg',
              uuid: 'action-b',
              text: 'Hello world'
            } as SendMsg
          ],
          exits: [{ uuid: 'exit-b' }]
        }
      ],
      _ui: {
        nodes: {
          'node-a': { position: { left: 0, top: 0 } },
          'node-b': { position: { left: 0, top: 100 } }
        },
        languages: []
      }
    };

    zustand.getState().setFlowContents({
      definition: flowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 2, languages: 2 },
        locals: []
      }
    });

    editor = await fixture(
      html`<temba-flow-editor
        features='["auto_translate"]'
      ></temba-flow-editor>`
    );
    await editor.updateComplete;
    await selectLanguageInToolbar(editor, 'French', 'fra');
    const at = editor.querySelector('temba-auto-translate') as any;
    at.selectedModel = { uuid: 'llm-1', name: 'GPT-4' };

    let callCount = 0;
    (storeElement as any).postJSON = async (_url: string, body: any) => {
      callCount += 1;
      return { status: 200, json: { items: body.items } };
    };

    await at.runAutoTranslation();

    // no LLM call needed: the only pending entry's source matches an
    // existing translation already in the flow
    expect(callCount).to.equal(0);
    const localized = zustand.getState().flowDefinition?.localization?.['fra'];
    expect(localized?.['action-b']?.text).to.deep.equal(['Bonjour le monde']);
  });

  it('should dedupe identical source arrays in the translation payload', async () => {
    editor?.remove();
    setupWorkspace();

    // Three pending actions share the same source text and one has a
    // distinct text. The payload should contain two unique arrays, and
    // the duplicate source's translation should propagate to all keys
    // sharing that source.
    const flowDefinition: FlowDefinition = {
      uuid: 'dedupe-flow',
      name: 'Dedupe Flow',
      language: 'eng',
      type: 'messaging',
      revision: 1,
      spec_version: '14.3',
      localization: {},
      nodes: [
        {
          uuid: 'node-a',
          actions: [
            { type: 'send_msg', uuid: 'action-a', text: 'Hello' } as SendMsg
          ],
          exits: [{ uuid: 'exit-a' }]
        },
        {
          uuid: 'node-b',
          actions: [
            { type: 'send_msg', uuid: 'action-b', text: 'Hello' } as SendMsg
          ],
          exits: [{ uuid: 'exit-b' }]
        },
        {
          uuid: 'node-c',
          actions: [
            { type: 'send_msg', uuid: 'action-c', text: 'Hello' } as SendMsg
          ],
          exits: [{ uuid: 'exit-c' }]
        },
        {
          uuid: 'node-d',
          actions: [
            { type: 'send_msg', uuid: 'action-d', text: 'Goodbye' } as SendMsg
          ],
          exits: [{ uuid: 'exit-d' }]
        }
      ],
      _ui: {
        nodes: {
          'node-a': { position: { left: 0, top: 0 } },
          'node-b': { position: { left: 0, top: 100 } },
          'node-c': { position: { left: 0, top: 200 } },
          'node-d': { position: { left: 0, top: 300 } }
        },
        languages: []
      }
    };

    zustand.getState().setFlowContents({
      definition: flowDefinition,
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 4, languages: 2 },
        locals: []
      }
    });

    editor = await fixture(
      html`<temba-flow-editor
        features='["auto_translate"]'
      ></temba-flow-editor>`
    );
    await editor.updateComplete;
    await selectLanguageInToolbar(editor, 'French', 'fra');
    const at = editor.querySelector('temba-auto-translate') as any;
    at.selectedModel = { uuid: 'llm-1', name: 'GPT-4' };

    const calls: any[] = [];
    (storeElement as any).postJSON = async (_url: string, body: any) => {
      calls.push(body);
      const translated: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(
        body.items as Record<string, string[]>
      )) {
        translated[k] = v.map((s) => `${s}!fr`);
      }
      return { status: 200, json: { items: translated } };
    };

    await at.runAutoTranslation();

    // payload should contain only two keys (one canonical per unique
    // source array) — duplicates are not sent
    expect(calls).to.have.lengthOf(1);
    const sentKeys = Object.keys(calls[0].items as Record<string, string[]>);
    expect(sentKeys).to.have.lengthOf(2);

    // every action including duplicates should be translated
    const localized =
      zustand.getState().flowDefinition?.localization?.['fra'] || {};
    expect(localized['action-a']?.text).to.deep.equal(['Hello!fr']);
    expect(localized['action-b']?.text).to.deep.equal(['Hello!fr']);
    expect(localized['action-c']?.text).to.deep.equal(['Hello!fr']);
    expect(localized['action-d']?.text).to.deep.equal(['Goodbye!fr']);
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
