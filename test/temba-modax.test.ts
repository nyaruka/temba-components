import { fixture, expect, assert } from '@open-wc/testing';
import { Button } from '../src/button/Button';
import { Modax } from '../src/dialog/Modax';
import { useFakeTimers } from 'sinon';
import {
  assertScreenshot,
  checkTimers,
  getClip,
  mockGET,
  mockPOST,
} from './utils.test';

import './utils.test';

var clock: any;

const getModaxHTML = (endpoint: string, hideOnClick = false): string => {
  return `
      <temba-modax header="Hello Modax" endpoint="${endpoint}">
        <div>Open Me</div>
      </temba-modax>
    `;
};

const getButtons = (modax: Modax, type: string = null) => {
  return modax.shadowRoot
    .querySelector('temba-dialog')
    .shadowRoot.querySelectorAll(
      type ? `temba-button[${type}='']` : 'temba-button'
    );
};

const open = async (modax: Modax) => {
  modax.open = true;
  await modax.updateComplete;
  await modax.httpComplete;
  await clock.tick(400);
};

const clickPrimary = async (modax: Modax) => {
  const primary = getButtons(modax, 'primary')[0] as Button;
  expect(primary).not.equals(undefined, 'Missing primary button');
  primary.click();
  await clock.tick(500);
  await clock.tick(100);
  await waitFor(0);
  await clock.tick(1000);
};

const getDialogClip = (modax: Modax) => {
  const dialog = modax.shadowRoot.querySelector('temba-dialog');

  return getClip(
    dialog.shadowRoot.querySelector('.dialog-container') as HTMLElement
  );
};

describe('temba-modax', () => {
  beforeEach(function () {
    clock = useFakeTimers();
  });

  afterEach(function () {
    clock.restore();
  });

  it('can be created', async () => {
    const modax: Modax = await fixture(
      getModaxHTML('/test-assets/modax/hello.html')
    );
    assert.instanceOf(modax, Modax);
  });

  it('opens', async () => {
    const modax: Modax = await fixture(
      getModaxHTML('/test-assets/modax/hello.html')
    );

    await click('temba-modax');
    expect(modax.open).equals(true);
    await modax.httpComplete;
    await clock.tick(400);
    checkTimers(clock);

    // Now our body should have our endpoint text
    expect(modax.getBody().innerHTML).to.contain('Hello World');
    await assertScreenshot('modax/simple', getDialogClip(modax));
  });

  it('fetches forms', async () => {
    const modax: Modax = await fixture(
      getModaxHTML('/test-assets/modax/form.html')
    );
    expect(modax.open).to.equal(false);
    await open(modax);

    expect(modax.open).to.equal(true);
    await assertScreenshot('modax/form', getDialogClip(modax));
  });

  it('closes after redirect', async () => {
    const modax: Modax = await fixture(
      getModaxHTML('/test-assets/modax/form.html')
    );

    // we don't want to hijack the browser during our tests
    modax.updateLocation = (location: string) => {};

    await open(modax);
    const primary = getButtons(modax, 'primary')[0] as Button;
    expect(primary.name).equals('Save Everything');

    // click the submit button
    mockPOST('/test-assets/modax/form.html', '', {
      'Temba-Success': '/newpage',
    });
    await clickPrimary(modax);

    // our modal should go away as we redirect
    expect(modax.open).equals(false, 'Modal still visible');
  });
});
