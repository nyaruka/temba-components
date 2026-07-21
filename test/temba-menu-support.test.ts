import { expect } from '@open-wc/testing';

import { TembaMenu } from '../src/list/TembaMenu';
import { getComponent } from './utils.test';
import { CustomEventType } from '../src/interfaces';

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
  await menu.httpComplete;
  return menu;
};

describe('temba-menu support item', () => {
  it('fires button clicked for event items', async () => {
    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/menu/menu-support.json'
    });

    let clickedItem: any = null;
    menu.addEventListener(CustomEventType.ButtonClicked, (event: any) => {
      clickedItem = event.detail.item;
    });

    const supportItem = menu.getDiv('#menu-support') as HTMLElement;
    expect(supportItem, 'support item should render').to.exist;

    // mobile items should be visible on desktop too
    const style = window.getComputedStyle(supportItem);
    expect(style.display).to.not.equal('none');

    supportItem.click();
    await menu.updateComplete;

    expect(clickedItem, 'button clicked event should fire').to.exist;
    expect(clickedItem.event).to.equal('temba-show-support');
  });

  it('invokes the -temba-button-clicked attribute handler like frame.html', async () => {
    // replicate frame.js handleMenuClicked + frame_top.html listener
    let supportShown = false;
    document.addEventListener('temba-show-support', () => {
      supportShown = true;
    });
    (window as any).handleMenuClicked = (event: any) => {
      const item = event.detail.item;
      if (item.event) {
        document.dispatchEvent(new CustomEvent(item.event, { detail: item }));
      }
    };

    const menu: TembaMenu = await getMenu({
      endpoint: '/test-assets/menu/menu-support.json',
      '-temba-button-clicked': 'handleMenuClicked(event)'
    });

    const supportItem = menu.getDiv('#menu-support') as HTMLElement;
    supportItem.click();
    await menu.updateComplete;

    expect(supportShown, 'temba-show-support should be dispatched').to.equal(
      true
    );
  });

  it('only shows the hamburger when collapsed on mobile', async () => {
    (window as any).isMobile = () => true;
    try {
      const menu: TembaMenu = await getMenu({
        endpoint: '/test-assets/menu/menu-support.json',
        collapsed: 'collapsed'
      });
      await menu.updateComplete;

      const hamburger = menu.getDiv('.expand-icon') as HTMLElement;
      expect(window.getComputedStyle(hamburger).display).to.not.equal('none');

      // everything else in the header should be hidden, including popups
      const support = menu.getDiv('#menu-support') as HTMLElement;
      expect(window.getComputedStyle(support).display).to.equal('none');

      const notifications = menu.getDiv('#dd-notifications') as HTMLElement;
      expect(window.getComputedStyle(notifications).display).to.equal('none');
    } finally {
      delete (window as any).isMobile;
    }
  });
});
