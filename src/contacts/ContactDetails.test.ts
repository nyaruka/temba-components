import { fixture, expect, assert } from '@open-wc/testing';
import { ContactDetails } from './ContactDetails';

export const getHTML = () => {
  return `<temba-contact-details></temba-contact-details>`;
};

describe('temba-contact-details', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('can be created', async () => {
    const ele: ContactDetails = await fixture(getHTML());
    assert.instanceOf(ele, ContactDetails);
  });
});
