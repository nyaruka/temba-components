import { expect } from '@open-wc/testing';
import { zustand } from '../src/store/AppState';
import { shouldExcludeFlow, hasLLMRole } from '../src/flow/flow-utils';
import { getLanguageDisplayName } from '../src/flow/utils';

function setFlowType(type: string) {
  const state = zustand.getState();
  zustand.setState({
    ...state,
    flowDefinition: {
      language: 'en',
      localization: {},
      name: 'Test Flow',
      nodes: [],
      uuid: 'test-uuid',
      type: type as any,
      revision: 1,
      spec_version: '14.3',
      _ui: { nodes: {}, languages: [] }
    }
  });
}

describe('shouldExcludeFlow', () => {
  it('excludes message flows when current flow is background', () => {
    setFlowType('messaging_background');
    expect(shouldExcludeFlow({ type: 'message' })).to.be.true;
  });

  it('allows background flows when current flow is background', () => {
    setFlowType('messaging_background');
    expect(shouldExcludeFlow({ type: 'background' })).to.be.false;
  });

  it('allows message flows when current flow is messaging', () => {
    setFlowType('messaging');
    expect(shouldExcludeFlow({ type: 'message' })).to.be.false;
  });

  it('allows background flows when current flow is messaging', () => {
    setFlowType('messaging');
    expect(shouldExcludeFlow({ type: 'background' })).to.be.false;
  });

  it('returns false when flow definition is null', () => {
    zustand.setState({ ...zustand.getState(), flowDefinition: null });
    expect(shouldExcludeFlow({ type: 'message' })).to.be.false;
  });
});

describe('hasLLMRole', () => {
  it('returns true when the model has the role', () => {
    expect(hasLLMRole({ roles: ['engine'] }, 'engine')).to.be.true;
    expect(hasLLMRole({ roles: ['editing', 'engine'] }, 'editing')).to.be.true;
  });

  it('returns false when the model has roles but not the requested one', () => {
    expect(hasLLMRole({ roles: ['editing'] }, 'engine')).to.be.false;
    expect(hasLLMRole({ roles: ['engine'] }, 'editing')).to.be.false;
    expect(hasLLMRole({ roles: [] }, 'engine')).to.be.false;
  });

  // Backwards-compat: treat models with a missing roles field as inclusive
  // so a UI rollout ahead of the API doesn't silently hide every model.
  it('returns true when the model has no roles field', () => {
    expect(hasLLMRole({}, 'engine')).to.be.true;
    expect(hasLLMRole({}, 'editing')).to.be.true;
    expect(hasLLMRole({ roles: undefined }, 'engine')).to.be.true;
  });

  it('returns false when the model is null or undefined', () => {
    expect(hasLLMRole(null, 'engine')).to.be.false;
    expect(hasLLMRole(undefined, 'editing')).to.be.false;
  });
});

describe('getLanguageDisplayName', () => {
  afterEach(() => {
    zustand.setState({ languageNames: {} });
  });

  it('returns "Unknown" for the "und" code', () => {
    expect(getLanguageDisplayName('und')).to.equal('Unknown');
  });

  it('returns the display name for known codes', () => {
    expect(getLanguageDisplayName('eng')).to.equal('English');
  });

  it('falls back to the raw code for unknown codes', () => {
    expect(getLanguageDisplayName('xx-invalid-code')).to.equal(
      'xx-invalid-code'
    );
  });

  it('uses names from the store for ISO 639-3 codes Intl does not cover', () => {
    zustand.setState({
      languageNames: { prd: 'Parsi-Dari', pst: 'Central Pashto' }
    });
    expect(getLanguageDisplayName('prd')).to.equal('Parsi-Dari');
    expect(getLanguageDisplayName('pst')).to.equal('Central Pashto');
  });

  it('prefers store names over Intl lookups', () => {
    zustand.setState({ languageNames: { eng: 'Anglais' } });
    expect(getLanguageDisplayName('eng')).to.equal('Anglais');
  });
});
