import { expect } from '@open-wc/testing';
import {
  isSignificantChange,
  summarizeChanges
} from '../src/flow/revision-summary';

describe('summarizeChanges', () => {
  it('returns empty string for null/empty changes', () => {
    expect(summarizeChanges(null)).to.equal('');
    expect(summarizeChanges(undefined)).to.equal('');
    expect(summarizeChanges([])).to.equal('');
  });

  it('uses singular noun without count when there is exactly one change', () => {
    expect(
      summarizeChanges([
        { type: 'action_updated', node: 'n1', uuid: 'a1', subtype: 'send_msg' }
      ])
    ).to.equal('Updated message');
  });

  it('collapses same-subtype actions into a count + plural', () => {
    expect(
      summarizeChanges([
        { type: 'action_updated', node: 'n1', uuid: 'a1', subtype: 'send_msg' },
        { type: 'action_updated', node: 'n2', uuid: 'a2', subtype: 'send_msg' }
      ])
    ).to.equal('Updated 2 messages');
  });

  it('does not collapse different verbs for the same subtype', () => {
    expect(
      summarizeChanges([
        { type: 'action_added', node: 'n1', uuid: 'a1', subtype: 'send_msg' },
        { type: 'action_updated', node: 'n2', uuid: 'a2', subtype: 'send_msg' }
      ])
    ).to.equal('Added message and updated message');
  });

  it('does not collapse different subtypes', () => {
    expect(
      summarizeChanges([
        { type: 'action_added', node: 'n1', uuid: 'a1', subtype: 'send_msg' },
        {
          type: 'action_added',
          node: 'n2',
          uuid: 'a2',
          subtype: 'add_contact_groups'
        }
      ])
    ).to.equal('Added message and added group');
  });

  it('falls back to "action" for unknown subtypes', () => {
    expect(
      summarizeChanges([
        { type: 'action_updated', node: 'n1', uuid: 'a1', subtype: 'unknown' }
      ])
    ).to.equal('Updated action');
  });

  it('summarizes action reordering without a count', () => {
    expect(
      summarizeChanges([{ type: 'action_reordered', node: 'n1' }])
    ).to.equal('Reordered actions');
    expect(
      summarizeChanges([
        { type: 'action_reordered', node: 'n1' },
        { type: 'action_reordered', node: 'n2' }
      ])
    ).to.equal('Reordered actions');
  });

  it('shows up to two specific phrases joined by "and"', () => {
    expect(
      summarizeChanges([
        { type: 'metadata_changed', field: 'name' },
        { type: 'action_added', node: 'n1', uuid: 'a1', subtype: 'send_msg' }
      ])
    ).to.equal('Changed name and added message');
  });

  it('flags a single category as significant when overflow collapses to one', () => {
    expect(
      summarizeChanges([
        { type: 'node_added', uuid: 'n1' },
        { type: 'node_added', uuid: 'n2' },
        { type: 'router_updated', node: 'n3' },
        { type: 'connection_changed', node: 'n4', uuid: 'e1' }
      ])
    ).to.equal('Significantly changed structure');
  });

  it('flags two categories as significant when overflow spans two', () => {
    expect(
      summarizeChanges([
        { type: 'metadata_changed', field: 'name' },
        { type: 'base_language_changed' },
        { type: 'translation_updated', lang: 'spa', uuid: 't1' },
        { type: 'translation_updated', lang: 'fra', uuid: 't2' }
      ])
    ).to.equal('Significantly changed metadata and translations');
  });

  it('caps generalized output at two categories without an overflow tail', () => {
    expect(
      summarizeChanges([
        { type: 'metadata_changed', field: 'name' },
        { type: 'sticky_added', uuid: 's1' },
        { type: 'sticky_moved', uuid: 's2' },
        { type: 'translation_updated', lang: 'spa', uuid: 't1' },
        { type: 'translation_updated', lang: 'fra', uuid: 't2' }
      ])
    ).to.equal('Significantly changed metadata and translations');
  });

  it('orders categories metadata, structure, content, translations, notes, layout', () => {
    expect(
      summarizeChanges([
        { type: 'sticky_moved', uuid: 's1' },
        { type: 'action_added', node: 'n1', uuid: 'a1', subtype: 'send_msg' },
        { type: 'metadata_changed', field: 'name' }
      ])
    ).to.equal('Significantly changed metadata and structure');
  });

  it('skips unknown change types', () => {
    expect(
      summarizeChanges([
        { type: 'action_updated', node: 'n1', uuid: 'a1', subtype: 'send_msg' },
        { type: 'something_new' as any }
      ])
    ).to.equal('Updated message');
  });
});

describe('isSignificantChange', () => {
  it('returns false for null/empty changes', () => {
    expect(isSignificantChange(null)).to.be.false;
    expect(isSignificantChange(undefined)).to.be.false;
    expect(isSignificantChange([])).to.be.false;
  });

  it('returns false when there are at most two distinct phrase groups', () => {
    expect(
      isSignificantChange([
        { type: 'action_updated', node: 'n1', uuid: 'a1', subtype: 'send_msg' },
        { type: 'action_added', node: 'n2', uuid: 'a2', subtype: 'send_msg' }
      ])
    ).to.be.false;
  });

  it('returns true when there are more than two distinct phrase groups', () => {
    expect(
      isSignificantChange([
        { type: 'metadata_changed', field: 'name' },
        { type: 'action_added', node: 'n1', uuid: 'a1', subtype: 'send_msg' },
        { type: 'sticky_added', uuid: 's1' }
      ])
    ).to.be.true;
  });
});
