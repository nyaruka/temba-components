import { html, fixture, expect } from '@open-wc/testing';
import { Checkbox } from '../src/checkbox/Checkbox.js';
import { assertScreenshot, getClip } from './utils.js';
import './utils';

describe('temba-checkbox', () => {
  it('renders default checkbox', async () => {
    const el: Checkbox = await fixture(html`
      <temba-checkbox label="My Checkbox"></temba-checkbox>
    `);

    expect(el.label).to.equal('My Checkbox');
    await assertScreenshot('checkbox/default', getClip(el));
  });

  it('can select by clicking on the label', async () => {
    const el: Checkbox = await fixture(html`
      <temba-checkbox label="My Checkbox"></temba-checkbox>
    `);

    (el.shadowRoot.querySelector('.checkbox-label') as HTMLDivElement).click();
    expect(el.checked).to.equal(true);
    await assertScreenshot('checkbox/checked', getClip(el));
  });
});
