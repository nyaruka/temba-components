import { fixture, assert, expect } from '@open-wc/testing';
import { Completion } from '../src/form/Completion';
import './utils.test';

export const getHTML = (attrs = '') => {
  return `<temba-completion ${attrs}></temba-completion>`;
};

describe('temba-completion', () => {
  it('can be created', async () => {
    const completion: Completion = await fixture(getHTML());
    assert.instanceOf(completion, Completion);
  });

  it('passes rtl property to underlying textinput', async () => {
    const completion: Completion = await fixture(getHTML('rtl'));
    await completion.updateComplete;

    const textInput = completion.shadowRoot.querySelector('temba-textinput');
    expect(textInput).to.exist;
    expect(textInput.hasAttribute('rtl')).to.be.true;
  });

  it('does not pass rtl when property is false', async () => {
    const completion: Completion = await fixture(getHTML());
    await completion.updateComplete;

    const textInput = completion.shadowRoot.querySelector('temba-textinput');
    expect(textInput).to.exist;
    expect(textInput.hasAttribute('rtl')).to.be.false;
  });
});
