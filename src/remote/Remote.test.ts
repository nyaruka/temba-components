import { fixture, assert } from '@open-wc/testing';
import Remote from './Remote';

export const getHTML = () => {
  return `<temba-remote></temba-remove>`;
};

describe('temba-remote', () => {
  it('can be created', async () => {
    const remote: Remote = await fixture(getHTML());
    assert.instanceOf(remote, Remote);
  });
});
