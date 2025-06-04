import { assert } from '@open-wc/testing';
import { zustand } from '../src/store/AppState';

describe('AppState Language Reset', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const state = zustand.getState();
    zustand.setState({
      ...state,
      languageCode: '',
      isTranslating: false,
      flowDefinition: null,
      flowInfo: null
    });
  });

  it('should reset language when loading a new flow', () => {
    const state = zustand.getState();

    // First, load an initial flow to establish state
    const initialFlowContents = {
      definition: {
        language: 'en',
        localization: {},
        name: 'Initial Flow',
        nodes: [],
        uuid: 'initial-uuid',
        type: 'messaging' as const,
        revision: 1,
        spec_version: '14.3',
        _ui: {
          nodes: {},
          languages: []
        }
      },
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 0, languages: 1 },
        locals: []
      }
    };

    state.setFlowContents(initialFlowContents);

    // Simulate having a previous flow with localization
    state.setLanguageCode('es'); // User selected Spanish for localization
    assert.equal(zustand.getState().languageCode, 'es');
    assert.equal(zustand.getState().isTranslating, true); // Now translating from English to Spanish

    // Simulate loading a new flow with English as default
    const mockFlowContents = {
      definition: {
        language: 'en',
        localization: {},
        name: 'Test Flow',
        nodes: [],
        uuid: 'test-uuid',
        type: 'messaging' as const,
        revision: 1,
        spec_version: '14.3',
        _ui: {
          nodes: {},
          languages: []
        }
      },
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 0, languages: 1 },
        locals: []
      }
    };

    state.setFlowContents(mockFlowContents);

    // The language should reset to the flow's default language
    assert.equal(
      zustand.getState().languageCode,
      'en',
      'Language should reset to flow default'
    );
    assert.equal(
      zustand.getState().isTranslating,
      false,
      'Should not be in translation mode'
    );
  });

  it('should set isTranslating correctly when languages differ', () => {
    const state = zustand.getState();

    // Load a flow with Spanish as default
    const mockFlowContents = {
      definition: {
        language: 'es',
        localization: {},
        name: 'Test Flow',
        nodes: [],
        uuid: 'test-uuid',
        type: 'messaging' as const,
        revision: 1,
        spec_version: '14.3',
        _ui: {
          nodes: {},
          languages: []
        }
      },
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 0, languages: 1 },
        locals: []
      }
    };

    state.setFlowContents(mockFlowContents);

    // Should be in Spanish and not translating
    assert.equal(zustand.getState().languageCode, 'es');
    assert.equal(zustand.getState().isTranslating, false);

    // Now switch to English for localization
    state.setLanguageCode('en');
    assert.equal(zustand.getState().languageCode, 'en');
    assert.equal(
      zustand.getState().isTranslating,
      true,
      'Should be translating when language differs from flow default'
    );
  });

  it('should preserve flow default language when no previous language is set', () => {
    const state = zustand.getState();

    // Load a flow with French as default, no previous language set
    const mockFlowContents = {
      definition: {
        language: 'fr',
        localization: {},
        name: 'Test Flow',
        nodes: [],
        uuid: 'test-uuid',
        type: 'messaging' as const,
        revision: 1,
        spec_version: '14.3',
        _ui: {
          nodes: {},
          languages: []
        }
      },
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 0, languages: 1 },
        locals: []
      }
    };

    state.setFlowContents(mockFlowContents);

    // Should use the flow's default language
    assert.equal(
      zustand.getState().languageCode,
      'fr',
      'Should use flow default language'
    );
    assert.equal(
      zustand.getState().isTranslating,
      false,
      'Should not be translating'
    );
  });

  it('should handle language switching after flow is loaded', () => {
    const state = zustand.getState();

    // Load a flow with English as default
    const mockFlowContents = {
      definition: {
        language: 'en',
        localization: {},
        name: 'Test Flow',
        nodes: [],
        uuid: 'test-uuid',
        type: 'messaging' as const,
        revision: 1,
        spec_version: '14.3',
        _ui: {
          nodes: {},
          languages: []
        }
      },
      info: {
        results: [],
        dependencies: [],
        counts: { nodes: 0, languages: 1 },
        locals: []
      }
    };

    state.setFlowContents(mockFlowContents);

    // Should start in English, not translating
    assert.equal(zustand.getState().languageCode, 'en');
    assert.equal(zustand.getState().isTranslating, false);

    // Switch to Spanish for localization
    state.setLanguageCode('es');
    assert.equal(zustand.getState().languageCode, 'es');
    assert.equal(zustand.getState().isTranslating, true);

    // Switch back to English
    state.setLanguageCode('en');
    assert.equal(zustand.getState().languageCode, 'en');
    assert.equal(zustand.getState().isTranslating, false);
  });
});
