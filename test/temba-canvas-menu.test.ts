import { expect, assert } from '@open-wc/testing';
import { CanvasMenu } from '../src/flow/CanvasMenu';
import { assertScreenshot, getClip, getComponent } from './utils.test';

describe('temba-canvas-menu', () => {
  const createCanvasMenu = async () => {
    const component = (await getComponent(
      'temba-canvas-menu',
      {},
      '',
      250,
      250
    )) as CanvasMenu;
    await component.updateComplete;
    return component;
  };

  it('can be created', async () => {
    const menu = await createCanvasMenu();
    assert.instanceOf(menu, CanvasMenu);
    expect(menu.open).to.be.false;
  });

  it('is not visible when closed', async () => {
    const menu = await createCanvasMenu();
    expect(menu.open).to.be.false;

    // verify no menu is rendered
    const menuElement = menu.shadowRoot?.querySelector('.menu');
    expect(menuElement).to.be.null;
  });

  it('shows menu when opened', async () => {
    const menu = await createCanvasMenu();

    // open the menu
    menu.show(100, 100, { x: 50, y: 50 });
    await menu.updateComplete;

    expect(menu.open).to.be.true;
    expect(menu.x).to.equal(100);
    expect(menu.y).to.equal(100);

    // verify menu is rendered
    const menuElement = menu.shadowRoot?.querySelector('.menu');
    expect(menuElement).to.not.be.null;

    await assertScreenshot('canvas-menu/open', getClip(menu));
  });

  it('has three menu items', async () => {
    const menu = await createCanvasMenu();
    menu.show(100, 100, { x: 50, y: 50 });
    await menu.updateComplete;

    const menuItems = menu.shadowRoot?.querySelectorAll('.menu-item');
    expect(menuItems?.length).to.equal(3);

    // check menu item titles
    const titles = Array.from(menuItems || []).map(
      (item) => item.querySelector('.menu-item-title')?.textContent
    );
    expect(titles).to.deep.equal([
      'Add Action',
      'Add Split',
      'Add Sticky Note'
    ]);
  });

  it('closes when close() is called', async () => {
    const menu = await createCanvasMenu();
    menu.show(100, 100, { x: 50, y: 50 });
    await menu.updateComplete;

    expect(menu.open).to.be.true;

    menu.close();
    await menu.updateComplete;

    expect(menu.open).to.be.false;
  });

  it('fires selection event when menu item is clicked', async () => {
    const menu = await createCanvasMenu();
    menu.show(100, 100, { x: 50, y: 50 });
    await menu.updateComplete;

    let selectionFired = false;
    let selectionDetail = null;

    menu.addEventListener('temba-selection', (event: any) => {
      selectionFired = true;
      selectionDetail = event.detail;
    });

    // click on sticky note option (now the third item)
    const menuItems = menu.shadowRoot?.querySelectorAll('.menu-item');
    const stickyItem = menuItems?.[2] as HTMLElement;
    stickyItem.click();
    await menu.updateComplete;

    expect(selectionFired).to.be.true;
    expect(selectionDetail).to.deep.equal({
      action: 'sticky',
      position: { x: 50, y: 50 }
    });
    expect(menu.open).to.be.false;
  });

  it('adjusts position to stay within viewport bounds', async () => {
    const menu = await createCanvasMenu();

    // open menu at position that would go off screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10; // matches the margin in CanvasMenu

    // position that would go off the right and bottom edges
    menu.show(viewportWidth - 50, viewportHeight - 50, {
      x: 100,
      y: 100
    });
    await menu.updateComplete;

    // wait for position adjustment
    await new Promise((resolve) => setTimeout(resolve, 100));
    await menu.updateComplete;

    const menuElement = menu.shadowRoot?.querySelector('.menu') as HTMLElement;
    expect(menuElement).to.not.be.null;

    const menuRect = menuElement.getBoundingClientRect();

    // verify menu stays within viewport with margin
    expect(menuRect.right).to.be.at.most(viewportWidth - margin);
    expect(menuRect.bottom).to.be.at.most(viewportHeight - margin);

    // verify click position is preserved (not adjusted)
    let selectionFired = false;
    let selectionDetail = null;

    menu.addEventListener('temba-selection', (event: any) => {
      selectionFired = true;
      selectionDetail = event.detail;
    });

    const menuItems = menu.shadowRoot?.querySelectorAll('.menu-item');
    const actionItem = menuItems?.[0] as HTMLElement;
    actionItem.click();
    await menu.updateComplete;

    expect(selectionFired).to.be.true;
    // click position should remain unchanged
    expect(selectionDetail.position).to.deep.equal({ x: 100, y: 100 });
  });
});
