import { html, fixture, expect } from '@open-wc/testing';
import { Checkbox } from '../src/checkbox/Checkbox.js';
import { assertScreenshot, getClip } from './utils.test.js';
import './utils.test';

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

  it('fires change event on click', async () => {
    return new Promise<void>(async (resolve, reject) => {
      const checkbox: Checkbox = await fixture(html`
        <temba-checkbox label="My Checkbox"></temba-checkbox>
      `);

      checkbox.addEventListener('change', () => {
        resolve();
      });

      click('temba-checkbox');
    });
  });

  it('checks via click method', async () => {
    const checkbox: Checkbox = await fixture(html`
      <temba-checkbox label="My Checkbox"></temba-checkbox>
    `);
    checkbox.click();
    expect(checkbox.checked).to.equal(true);
  });
});
