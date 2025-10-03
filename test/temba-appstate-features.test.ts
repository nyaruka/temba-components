import { expect } from '@open-wc/testing';
import { zustand } from '../src/store/AppState';

describe('AppState Features', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const state = zustand.getState();
    zustand.setState({
      ...state,
      features: []
    });
  });

  it('should initialize with empty features array', () => {
    const state = zustand.getState();
    expect(state.features).to.be.an('array');
    expect(state.features).to.have.lengthOf(0);
  });

  it('should set features via setFeatures', () => {
    const state = zustand.getState();
    state.setFeatures(['HAS_LOCATIONS']);

    expect(zustand.getState().features).to.deep.equal(['HAS_LOCATIONS']);
  });

  it('should update features with multiple values', () => {
    const state = zustand.getState();
    state.setFeatures(['HAS_LOCATIONS', 'OTHER_FEATURE']);

    expect(zustand.getState().features).to.deep.equal([
      'HAS_LOCATIONS',
      'OTHER_FEATURE'
    ]);
  });

  it('should replace features when set again', () => {
    const state = zustand.getState();
    state.setFeatures(['HAS_LOCATIONS']);
    expect(zustand.getState().features).to.deep.equal(['HAS_LOCATIONS']);

    state.setFeatures(['DIFFERENT_FEATURE']);
    expect(zustand.getState().features).to.deep.equal(['DIFFERENT_FEATURE']);
  });

  it('should clear features when set to empty array', () => {
    const state = zustand.getState();
    state.setFeatures(['HAS_LOCATIONS', 'OTHER_FEATURE']);
    expect(zustand.getState().features).to.have.lengthOf(2);

    state.setFeatures([]);
    expect(zustand.getState().features).to.have.lengthOf(0);
  });

  it('should maintain features independently of other state', () => {
    const state = zustand.getState();

    // Set up a minimal flow definition to avoid null reference errors
    const flowContents = {
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
    state.setFlowContents(flowContents);

    state.setFeatures(['HAS_LOCATIONS']);
    state.setLanguageCode('es');

    expect(zustand.getState().features).to.deep.equal(['HAS_LOCATIONS']);
    expect(zustand.getState().languageCode).to.equal('es');

    state.setFeatures([]);
    expect(zustand.getState().features).to.have.lengthOf(0);
    expect(zustand.getState().languageCode).to.equal('es');
  });
});
