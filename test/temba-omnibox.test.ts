import { fixture, assert } from '@open-wc/testing';
import { Omnibox } from '../src/omnibox/Omnibox';
import './utils.test';

export const getHTML = () => {
  return `<temba-omnibox></temba-omnibox>`;
};

describe('temba-omnibox', () => {
  it('can be created', async () => {
    const omnibox: Omnibox = await fixture(getHTML());
    assert.instanceOf(omnibox, Omnibox);
  });
});
