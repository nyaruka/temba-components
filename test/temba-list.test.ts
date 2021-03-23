import { fixture, assert } from '@open-wc/testing';
import { TembaList } from '../src/list/TembaList';
import './utils.test';

export const getHTML = () => {
  return `<temba-list></temba-list>`;
};

describe('temba-list', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('can be created', async () => {
    const list: TembaList = await fixture(getHTML());
    assert.instanceOf(list, TembaList);
  });
});
