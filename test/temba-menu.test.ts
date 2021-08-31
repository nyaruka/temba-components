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
    expect(list.root).is.undefined;
  });

  it('renders with endpoint', async () => {
    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/list/menu-root.json',
    });

    expect(menu.root.items.length).to.equal(2);
    await assertScreenshot('list/menu-root', getClip(menu));
  });

  it('supports submenu', async () => {
    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/list/menu-root.json',
    });

    // click our first item
    menu.getDiv('#menu-tasks').click();
    await menu.httpComplete;

    expect(menu.root.items[0].items.length).to.equal(3);

    await assertScreenshot('list/menu-submenu', getClip(menu));
  });

  // TODO: general menu doesn't support collapse yet
  xit('supports collapse', async () => {
    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/list/menu-root.json',
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
