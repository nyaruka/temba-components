import { expect, fixture } from '@open-wc/testing';
import { html } from 'lit';
import { FieldManager } from '../src/fields/FieldManager';
import {
  assertScreenshot,
  delay,
  getAttributes,
  getClip,
  loadStore,
} from './utils.test';

const BORING_LIST = html`<temba-field-manager />`;

export const getEle = async (attrs: any = {}) => {
  const fm = html`<temba-field-manager
    ${getAttributes(attrs)}
  ></temba-field-manager>`;
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', 'width: 600px;');
  return (await fixture(fm, { parentNode })) as FieldManager;
};

describe('temba-field-manager', () => {
  it('renders default', async () => {
    await loadStore();
    const fm: FieldManager = await getEle();
    await assertScreenshot('list/fields', getClip(fm));
  });

  it('filters', async () => {
    await loadStore();
    const fm: FieldManager = await getEle();
    (fm.shadowRoot.querySelector('#search') as HTMLDivElement).click();
    await type('at');
    await assertScreenshot('list/fields-filtered', getClip(fm));
  });

  it('hovers', async () => {
    await loadStore();
    const fm: FieldManager = await getEle();

    // hover over the first item
    const first = fm.shadowRoot.querySelector('.sortable') as HTMLDivElement;
    const bounds = first.getBoundingClientRect();
    await moveMouse(bounds.left + 20, bounds.top + 10);
    await assertScreenshot('list/fields-hovered', getClip(fm));
  });

  it('drags featured down', async () => {
    await loadStore();
    const fm: FieldManager = await getEle();
    let first = fm.shadowRoot.querySelector('.sortable') as HTMLDivElement;
    const bounds = first.getBoundingClientRect();

    // drag our item
    await moveMouse(bounds.left + 20, bounds.top + 10);
    await mouseDown();
    await moveMouse(bounds.left + 30, bounds.bottom + 20);
    await assertScreenshot('list/fields-dragging', getClip(fm));

    // we can't easily test reordering since the store is static
    await mouseUp();
    first = fm.shadowRoot.querySelector('.sortable') as HTMLDivElement;
    expect(first.id).to.equal('ward');

    // it'll trigger a refresh from the store which is static and put it back though
    await delay(100);
    first = fm.shadowRoot.querySelector('.sortable') as HTMLDivElement;
    expect(first.id).to.equal('rating');
  });
});
