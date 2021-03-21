import { fixture, expect, assert } from '@open-wc/testing';
import { Modax } from './Modax';
import moxios from 'moxios';
import sinon from 'sinon';
import { Button } from '../button/Button';

const getModaxHTML = (hideOnClick = false) => {
  return `
      <temba-modax endpoint="/endpoint"><div>Open Me</div></temba-modax>
    `;
};

const getButtons = (modax: Modax, type: string = null) => {
  return modax.shadowRoot
    .querySelector('temba-dialog')
    .shadowRoot.querySelectorAll(
      type ? `temba-button[${type}='']` : 'temba-button'
    );
};

const clickPrimary = async (modax: Modax) => {
  const primary = getButtons(modax, 'primary')[0] as Button;
  expect(primary).not.equals(undefined, 'Missing primary button');

  primary.click();
  await clock.tick(1);
  await clock.tick(1);
  await clock.tick(1);
  await clock.tick(1);

  await clock.tick(2000);
};

const open = async (selector: string) => {
  await click(selector);
  await clock.tick(1);
};

var clock: any;
describe('temba-modax', () => {
  beforeEach(function () {
    clock = sinon.useFakeTimers();
    moxios.install();
  });

  afterEach(function () {
    moxios.uninstall();
    clock.restore();
  });

  it('can be created', async () => {
    const modax: Modax = await fixture(getModaxHTML());
    assert.instanceOf(modax, Modax);
  });

  it('opens', async () => {
    moxios.stubRequest(/endpoint.*/, {
      status: 200,
      // responseText: JSON.stringify(colorResponse),
    });

    const modax: Modax = await fixture(getModaxHTML());
    expect(modax.open).to.equal(false);
    await click('temba-modax');
    expect(modax.open).to.equal(true);
  });

  it('fetches', async () => {
    moxios.stubRequest(/endpoint.*/, {
      status: 200,
      responseText: 'Hello World',
    });

    const modax: Modax = await fixture(getModaxHTML());
    await click('temba-modax');
    expect(modax.open).equals(true);

    // Now our body should have our endpoint text
    expect(modax.shadowRoot.innerHTML).to.contain('Hello World');
  });

  it('closes after redirect', async () => {
    moxios.stubOnce('GET', /endpoint.*/, {
      status: 200,
      responseText: "<input type='submit' name='Submit' value='Submit'/>",
    });

    const modax: Modax = await fixture(getModaxHTML());

    // we can't hijack the entire browser during our tests
    modax.updateLocation = (location: string) => {
      // console.log("updating location", location);
    };

    await open('temba-modax');
    expect(modax.open).equals(true);

    const primary = getButtons(modax, 'primary')[0] as Button;
    expect(primary).not.equals(undefined, 'Missing primary button');

    moxios.stubOnce('POST', /endpoint.*/, {
      status: 200,
      headers: {
        'Temba-Success': '/redirect',
      },
    });

    await clickPrimary(modax);

    expect(modax.open).equals(false, 'Modal still visible');
  });
});
