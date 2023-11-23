import { assert, expect } from '@open-wc/testing';

import { TembaMenu } from '../src/list/TembaMenu';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { extractInitials } from '../src/utils/index';

const TAG = 'temba-menu';
const getMenu = async (attrs: any = {}, width = 0) => {
  const menu = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    0,
    'display:inline-block'
  )) as TembaMenu;

  // wait for the fetch
  await menu.httpComplete;

  return menu;
};

const IDX_CHOOSER = 0;
const IDX_TASKS = 1;
const IDX_SCHEDULE = 2;

describe('temba-menu', () => {
  it('can be created', async () => {
    const list: TembaMenu = await getMenu();
    assert.instanceOf(list, TembaMenu);
    expect(list.root).is.undefined;
  });

  it('renders with endpoint', async () => {
    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/menu/menu-root.json',
    });

    expect(menu.root.items.length).to.equal(3);
    await assertScreenshot('menu/menu-root', getClip(menu));
  });

  it('supports submenu', async () => {
    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/menu/menu-root.json',
    });

    // click our tasks
    menu.getDiv('#menu-tasks').click();
    await menu.httpComplete;
    menu.requestUpdate();
    // await menu.updateComplete;

    expect(menu.root.items[IDX_TASKS].items.length).to.equal(3);
    await assertScreenshot('menu/menu-submenu', getClip(menu));
  });

  it('sets focus', async () => {
    // setting focus just shows the selection, it does
    // not trigger events such as loading or dispatching

    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/menu/menu-root.json',
    });

    // click our tasks
    menu.getDiv('#menu-tasks').click();
    await menu.httpComplete;

    // now set the focus manually
    menu.setFocusedItem('schedule');

    // setting focus does NOT fetch items
    expect(menu.root.items[IDX_SCHEDULE].items).to.equal(undefined);

    // now load the items explicitly
    menu.getDiv('#menu-schedule').click();
    await menu.httpComplete;
    expect(menu.root.items[IDX_SCHEDULE].items.length).to.equal(3);

    await assertScreenshot('menu/menu-focused-with items', getClip(menu));

    menu.setFocusedItem('tasks');
    await assertScreenshot('menu/menu-tasks', getClip(menu));

    menu.setFocusedItem('tasks/todo');
    await assertScreenshot('menu/menu-tasks-nextup', getClip(menu));
  });

  it('refreshes', async () => {
    // the menu should refresh along the selection path without destroying state
    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/menu/menu-root.json',
    });

    // click our tasks
    menu.getDiv('#menu-tasks').click();
    menu.requestUpdate();
    await menu.httpComplete;
    // await menu.updateComplete;

    // now click on the todo
    menu.getDiv('#menu-todo').click();
    menu.requestUpdate();
    // await menu.updateComplete;

    expect(menu.root.items[IDX_TASKS].items.length).to.equal(3);
    await assertScreenshot('menu/menu-refresh-1', getClip(menu));

    // now refresh!
    menu.refresh();
    await menu.httpComplete;

    // we should still have our task items
    expect(menu.root.items[IDX_TASKS].items.length).to.equal(3);
    await assertScreenshot('menu/menu-refresh-2', getClip(menu));
  });
});

describe('avatars', () => {
  it('can generate initials from text', async () => {
    assert.equal(extractInitials(''), '?');
    assert.equal(extractInitials('X'), 'X');
    assert.equal(extractInitials('Acme'), 'AC');
    assert.equal(extractInitials('al-Jazeera News'), 'AJ');
    assert.equal(extractInitials('Cool Flows'), 'CF');
    assert.equal(extractInitials('Very Cool Flows'), 'VC');
    assert.equal(extractInitials('UNICEF - Ireland'), 'UI');
    assert.equal(extractInitials('Dave & Busters'), 'DB');
    assert.equal(extractInitials('Dave and Busters'), 'DB');
  });
});
