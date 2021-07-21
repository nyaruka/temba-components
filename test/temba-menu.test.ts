import { assert, expect } from '@open-wc/testing';

import { TembaMenu } from '../src/list/TembaMenu';
import { assertScreenshot, getClip, getComponent } from './utils.test';

const TAG = 'temba-menu';
const getMenu = async (attrs: any = {}, width = 0) => {
  const menu = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    'display:inline-block'
  )) as TembaMenu;

  // wait for the fetch
  await menu.httpComplete;

  return menu;
};

describe('temba-menu', () => {
  it('can be created', async () => {
    const list: TembaMenu = await getMenu();
    assert.instanceOf(list, TembaMenu);
    expect(list.items.length).to.equal(0);
  });

  it('renders with endpoint', async () => {
    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/list/menu-counts.json',
    });
    expect(menu.items.length).to.equal(3);
    await assertScreenshot('list/menu-counts', getClip(menu));
  });

  it('supports collapse', async () => {
    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/list/menu-counts.json',
      collapsible: true,
    });

    // collapse our menu
    menu.collapsed = true;
    await menu.updateComplete;
    await waitFor(0);

    // selfie time!
    await assertScreenshot('list/menu-collapsed', getClip(menu));
  });
});
