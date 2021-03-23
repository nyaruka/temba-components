import { fixture, assert } from '@open-wc/testing';
import { VectorIcon } from '../src/vectoricon/VectorIcon';
import './utils.test';

export const getHTML = (name: string) => {
  return `<temba-icon name=${name}></temba-icon>`;
};

describe('temba-icon', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('can be created', async () => {
    const icon: VectorIcon = await fixture(getHTML('checkmark'));
    assert.instanceOf(icon, VectorIcon);
  });
});
