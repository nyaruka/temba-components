import { expect } from '@open-wc/testing';
import { summarizeChanges } from '../src/flow/revision-summary';

describe('summarizeChanges', () => {
  it('returns empty string for null/undefined/empty tags', () => {
    expect(summarizeChanges(null)).to.equal('');
    expect(summarizeChanges(undefined)).to.equal('');
    expect(summarizeChanges({ tags: [] })).to.equal('');
  });

  it('renders a single tag verb-first', () => {
    expect(summarizeChanges({ tags: ['actions'] })).to.equal('Changed actions');
    expect(summarizeChanges({ tags: ['metadata'] })).to.equal(
      'Changed metadata'
    );
  });

  it('joins two tags with "and"', () => {
    expect(summarizeChanges({ tags: ['actions', 'positions'] })).to.equal(
      'Changed actions and positions'
    );
  });

  it('orders tags by category priority regardless of input order', () => {
    expect(summarizeChanges({ tags: ['positions', 'metadata'] })).to.equal(
      'Changed metadata and positions'
    );
    expect(
      summarizeChanges({ tags: ['stickies', 'nodes', 'metadata'] })
    ).to.equal('Changed metadata, nodes, and stickies');
  });

  it('lists all tags with an Oxford comma when there are 3+', () => {
    expect(
      summarizeChanges({ tags: ['metadata', 'actions', 'positions'] })
    ).to.equal('Changed metadata, actions, and positions');
    expect(
      summarizeChanges({
        tags: ['positions', 'stickies', 'metadata', 'actions', 'nodes']
      })
    ).to.equal('Changed metadata, nodes, actions, stickies, and positions');
  });

  it('collapses multiple localization:<lang> tags into a single "translations" label', () => {
    expect(
      summarizeChanges({ tags: ['localization:spa', 'localization:fra'] })
    ).to.equal('Changed translations');
  });

  it('treats a localization tag as one label alongside other tags', () => {
    expect(
      summarizeChanges({
        tags: ['actions', 'localization:spa', 'localization:fra']
      })
    ).to.equal('Changed actions and translations');
  });

  it('ignores unknown tags', () => {
    expect(summarizeChanges({ tags: ['actions', 'something_new'] })).to.equal(
      'Changed actions'
    );
    // an entirely unknown set yields nothing
    expect(summarizeChanges({ tags: ['something_new'] })).to.equal('');
  });
});
