import { expect } from '@open-wc/testing';
import { zustand } from '../src/store/AppState';
import { mockGET, clearMockGets } from './utils.test';

const definition = (overrides: any = {}) => ({
  uuid: 'flow-1',
  name: 'Test Flow',
  language: 'eng',
  type: 'messaging' as const,
  revision: 1,
  spec_version: '14.3',
  localization: {},
  nodes: [],
  _ui: { nodes: {}, languages: [] },
  ...overrides
});

const info = (overrides: any = {}) => ({
  results: [],
  dependencies: [],
  counts: { nodes: 0, languages: 1 },
  locals: [],
  ...overrides
});

const nodeWithExit = (uuid: string, exitUuid: string) => ({
  uuid,
  actions: [],
  exits: [{ uuid: exitUuid, destination_uuid: null }]
});

describe('store/AppState actions', () => {
  const pristine = zustand.getState();

  beforeEach(() => {
    zustand.setState({
      flowDefinition: null,
      flowInfo: null,
      languageCode: '',
      isTranslating: false,
      activity: null,
      activityEndpoint: null,
      viewingRevision: false
    } as any);
  });

  afterEach(() => {
    clearMockGets();
    zustand.setState(pristine as any);
  });

  const state = () => zustand.getState();

  describe('setFlowInfo', () => {
    it('records the info', () => {
      state().setFlowInfo(info({ counts: { nodes: 3, languages: 2 } }));
      expect(state().flowInfo.counts.nodes).to.equal(3);
    });

    it('indexes an action issue by its action', () => {
      state().setFlowInfo(
        info({
          issues: [
            {
              type: 'missing_dependency',
              node_uuid: 'node-1',
              action_uuid: 'action-1',
              description: 'missing'
            }
          ]
        })
      );
      expect(state().issuesByAction.get('action-1')).to.have.length(1);
      // an action issue is filed under the action rather than the node
      expect(state().issuesByNode.get('node-1')).to.equal(undefined);
    });

    it('indexes a node issue by its node', () => {
      state().setFlowInfo(
        info({
          issues: [
            {
              type: 'missing_dependency',
              node_uuid: 'node-1',
              action_uuid: null,
              description: 'missing'
            }
          ]
        })
      );
      expect(state().issuesByNode.get('node-1')).to.have.length(1);
    });

    it('groups several issues on the same node', () => {
      state().setFlowInfo(
        info({
          issues: [
            { type: 'a', node_uuid: 'node-1', action_uuid: null, description: '' },
            { type: 'b', node_uuid: 'node-1', action_uuid: null, description: '' }
          ]
        })
      );
      expect(state().issuesByNode.get('node-1')).to.have.length(2);
    });

    it('clears the issue maps when there are no issues', () => {
      state().setFlowInfo(info({ issues: [] }));
      expect(state().issuesByNode.size).to.equal(0);
      expect(state().issuesByAction.size).to.equal(0);
    });
  });

  describe('setRevision', () => {
    it('updates the revision on the definition', () => {
      zustand.setState({ flowDefinition: definition() } as any);
      state().setRevision(42);
      expect(state().flowDefinition.revision).to.equal(42);
    });
  });

  describe('getFlowResults and getResultByKey', () => {
    beforeEach(() => {
      zustand.setState({
        flowInfo: info({
          results: [
            { key: 'colour', name: 'Colour', categories: ['Red'], node_uuids: [] },
            { key: 'size', name: 'Size', categories: ['Big'], node_uuids: [] }
          ]
        })
      } as any);
    });

    it('returns every result', () => {
      expect(state().getFlowResults()).to.have.length(2);
    });

    it('finds a result by its key', () => {
      expect(state().getResultByKey('size').name).to.equal('Size');
    });

    it('returns nothing for an unknown key', () => {
      expect(state().getResultByKey('nonsense')).to.equal(undefined);
    });
  });

  describe('getLanguage', () => {
    it('resolves the code to a display name', () => {
      zustand.setState({ languageCode: 'spa' } as any);
      const language = state().getLanguage();
      expect(language.code).to.equal('spa');
      expect(language.name).to.be.a('string');
      expect(language.name.length).to.be.greaterThan(0);
    });
  });

  describe('activity', () => {
    it('records the activity endpoint', () => {
      state().setActivityEndpoint('/flow/activity/flow-1/');
      expect(state().activityEndpoint).to.equal('/flow/activity/flow-1/');
    });

    it('replaces the current activity', () => {
      const activity = { nodes: { 'node-1': 3 }, segments: {} } as any;
      state().updateActivity(activity);
      expect(state().activity).to.deep.equal(activity);
    });

    it('reports simulator activity while the simulator is active', () => {
      const live = { nodes: { 'node-1': 1 }, segments: {} } as any;
      const simulated = { nodes: { 'node-2': 9 }, segments: {} } as any;
      state().updateActivity(live);
      state().updateSimulatorActivity(simulated);

      state().setSimulatorActive(false);
      expect(state().getCurrentActivity()).to.deep.equal(live);

      state().setSimulatorActive(true);
      expect(state().getCurrentActivity()).to.deep.equal(simulated);
    });
  });

  describe('updateConnection', () => {
    beforeEach(() => {
      zustand.setState({
        flowDefinition: definition({
          nodes: [nodeWithExit('node-1', 'exit-1')]
        })
      } as any);
    });

    it('points an exit at a destination', () => {
      state().updateConnection('node-1', 'exit-1', 'node-2');
      expect(
        state().flowDefinition.nodes[0].exits[0].destination_uuid
      ).to.equal('node-2');
      expect(state().dirtyDate).to.not.equal(null);
    });

    it('clears a destination', () => {
      state().updateConnection('node-1', 'exit-1', 'node-2');
      state().updateConnection('node-1', 'exit-1', null);
      expect(
        state().flowDefinition.nodes[0].exits[0].destination_uuid
      ).to.equal(null);
    });

    it('ignores an unknown node', () => {
      state().updateConnection('nonsense', 'exit-1', 'node-2');
      expect(
        state().flowDefinition.nodes[0].exits[0].destination_uuid
      ).to.equal(null);
    });

    it('ignores an unknown exit', () => {
      state().updateConnection('node-1', 'nonsense', 'node-2');
      expect(
        state().flowDefinition.nodes[0].exits[0].destination_uuid
      ).to.equal(null);
    });
  });

  describe('updateNodeUIConfig', () => {
    beforeEach(() => {
      zustand.setState({
        flowDefinition: definition({
          _ui: {
            nodes: { 'node-1': { type: 'wait_for_response', position: { left: 0, top: 0 } } },
            languages: []
          }
        })
      } as any);
    });

    it('creates the config when there is none', () => {
      state().updateNodeUIConfig('node-1', { localizeRules: true });
      expect(
        state().flowDefinition._ui.nodes['node-1'].config.localizeRules
      ).to.equal(true);
    });

    it('merges into an existing config', () => {
      state().updateNodeUIConfig('node-1', { localizeRules: true });
      state().updateNodeUIConfig('node-1', { localizeCategories: true });
      const config = state().flowDefinition._ui.nodes['node-1'].config;
      expect(config.localizeRules).to.equal(true);
      expect(config.localizeCategories).to.equal(true);
    });

    it('updates the node type separately from the config', () => {
      state().updateNodeUIConfig('node-1', {
        type: 'split_by_expression',
        localizeRules: true
      });
      const nodeUI = state().flowDefinition._ui.nodes['node-1'];
      expect(nodeUI.type).to.equal('split_by_expression');
      expect(nodeUI.config.localizeRules).to.equal(true);
      // the type is not duplicated into the config
      expect(nodeUI.config.type).to.equal(undefined);
    });

    it('ignores an unknown node', () => {
      state().updateNodeUIConfig('nonsense', { localizeRules: true });
      expect(state().flowDefinition._ui.nodes['nonsense']).to.equal(undefined);
    });
  });

  describe('removeStickyNotes', () => {
    beforeEach(() => {
      zustand.setState({
        flowDefinition: definition({
          _ui: {
            nodes: {},
            languages: [],
            stickies: {
              'sticky-1': { title: 'One', body: '', position: { left: 0, top: 0 }, color: 'yellow' },
              'sticky-2': { title: 'Two', body: '', position: { left: 0, top: 0 }, color: 'blue' },
              'sticky-3': { title: 'Three', body: '', position: { left: 0, top: 0 }, color: 'gray' }
            }
          }
        })
      } as any);
    });

    it('removes a single note', () => {
      state().removeStickyNotes(['sticky-2']);
      const stickies = state().flowDefinition._ui.stickies;
      expect(Object.keys(stickies)).to.deep.equal(['sticky-1', 'sticky-3']);
    });

    it('removes several notes at once', () => {
      state().removeStickyNotes(['sticky-1', 'sticky-3']);
      expect(
        Object.keys(state().flowDefinition._ui.stickies)
      ).to.deep.equal(['sticky-2']);
    });

    it('ignores unknown uuids', () => {
      state().removeStickyNotes(['nonsense']);
      expect(
        Object.keys(state().flowDefinition._ui.stickies)
      ).to.have.length(3);
    });

    it('copes with a flow that has no stickies', () => {
      zustand.setState({ flowDefinition: definition() } as any);
      state().removeStickyNotes(['sticky-1']);
      expect(state().flowDefinition._ui.stickies).to.equal(undefined);
    });
  });

  describe('setTranslationFilters', () => {
    beforeEach(() => {
      zustand.setState({ flowDefinition: definition() } as any);
    });

    it('turns the category filter on', () => {
      state().setTranslationFilters({ categories: true });
      expect(
        state().flowDefinition._ui.translation_filters.categories
      ).to.equal(true);
    });

    it('turns the category filter back off', () => {
      state().setTranslationFilters({ categories: true });
      state().setTranslationFilters({ categories: false });
      expect(
        state().flowDefinition._ui.translation_filters.categories
      ).to.equal(false);
    });

    it('does nothing when the filter is unchanged', () => {
      state().setTranslationFilters({ categories: true });
      const before = state().dirtyDate;
      state().setTranslationFilters({ categories: true });
      expect(state().dirtyDate).to.equal(before);
    });

    it('ignores a flow with no ui', () => {
      zustand.setState({ flowDefinition: { ...definition(), _ui: null } } as any);
      // no throw is the assertion here
      state().setTranslationFilters({ categories: true });
    });
  });

  describe('fetchRevision', () => {
    const REVISION_URL = '/flow/revisions/flow-1';

    const mockRevision = (overrides: any = {}) => {
      clearMockGets();
      mockGET(/\/flow\/revisions\/flow-1\//, {
        definition: definition({ language: 'fra' }),
        info: info({ counts: { nodes: 1, languages: 1 } }),
        ...overrides
      });
    };

    it('loads the latest revision by default', async () => {
      mockRevision();
      await state().fetchRevision(REVISION_URL);
      expect(state().flowDefinition.uuid).to.equal('flow-1');
      expect(state().viewingRevision).to.equal(false);
    });

    it('adopts the language of the loaded flow', async () => {
      mockRevision();
      await state().fetchRevision(REVISION_URL);
      expect(state().languageCode).to.equal('fra');
      expect(state().isTranslating).to.equal(false);
    });

    it('marks an explicit revision as being viewed', async () => {
      mockRevision();
      await state().fetchRevision(REVISION_URL, '12345');
      expect(state().viewingRevision).to.equal(true);
    });

    it('does not treat "latest" as viewing an older revision', async () => {
      mockRevision();
      await state().fetchRevision(REVISION_URL, 'latest');
      expect(state().viewingRevision).to.equal(false);
    });

    it('indexes any issues that come back', async () => {
      mockRevision({
        info: info({
          issues: [
            {
              type: 'missing_dependency',
              node_uuid: 'node-9',
              action_uuid: null,
              description: 'missing'
            }
          ]
        })
      });
      await state().fetchRevision(REVISION_URL);
      expect(state().issuesByNode.get('node-9')).to.have.length(1);
    });

    it('raises when the request fails', async () => {
      clearMockGets();
      mockGET(/\/flow\/revisions\/flow-1\//, { detail: 'boom' }, {}, '500');
      let raised = false;
      try {
        await state().fetchRevision(REVISION_URL);
      } catch (error) {
        raised = true;
      }
      expect(raised).to.equal(true);
    });
  });
});
