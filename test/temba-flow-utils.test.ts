import { expect } from '@open-wc/testing';
import { zustand } from '../src/store/AppState';
import { shouldExcludeFlow } from '../src/flow/flow-utils';
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

describe('getLanguageDisplayName', () => {
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
});
