import { assert, expect } from '@open-wc/testing';
import { ContentMenu, ContentMenuItemType } from '../src/list/ContentMenu';
// import { assertScreenshot, getClip, getComponent } from './utils.test';
import { getComponent } from './utils.test';

const TAG = 'temba-content-menu';
const getContentMenu = async (attrs: any = {}, width = 0) => {
  const contentMenu = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    0,
    'display:inline-block'
  )) as ContentMenu;

  return contentMenu;
};

describe('temba-content-menu', () => {
  it('can initially be created without endpoint', async () => {
    const contentMenu: ContentMenu = await getContentMenu();
    assert.instanceOf(contentMenu, ContentMenu);
    expect(contentMenu).is.undefined;
  });

  it('renders with 1+ items and 1+ buttons', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-contact-read.json',
    });
    const contentMenuItems = contentMenu.items;
    expect(contentMenuItems.length).to.equal(6);
    const buttons = contentMenuItems.filter(item => item.as_button);
    expect(buttons.length).to.equal(1);
    const items = contentMenuItems.filter(item => !item.as_button);
    expect(items.length).to.equal(5);
    // await assertScreenshot(
    //   'content-menu/with-items-and-buttons',
    //   getClip(contentMenu)
    // );
  });

  it('renders with 1+ items and 0 buttons', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-archived-contacts.json',
    });
    const contentMenuItems = contentMenu.items;
    expect(contentMenuItems.length).to.equal(1);
    const buttons = contentMenuItems.filter(item => item.as_button);
    expect(buttons.length).to.equal(0);
    const items = contentMenuItems.filter(item => !item.as_button);
    expect(items.length).to.equal(1);
  });

  it('renders with 0 items and 1+ buttons', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-new-campaign.json',
    });
    const contentMenuItems = contentMenu.items;
    expect(contentMenuItems.length).to.equal(1);
    const buttons = contentMenuItems.filter(item => item.as_button);
    expect(buttons.length).to.equal(1);
    const items = contentMenuItems.filter(item => !item.as_button);
    expect(items.length).to.equal(0);
    // await assertScreenshot(
    //   'content-menu/no-items-only-buttons',
    //   getClip(contentMenu)
    // );
  });

  it('renders with 0 items and 0 buttons', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-wrong-endpoint.json',
    });
    const contentMenuItems = contentMenu.items;
    expect(contentMenuItems.length).to.equal(0);
    const buttons = contentMenuItems.filter(item => item.as_button);
    expect(buttons.length).to.equal(0);
    const items = contentMenuItems.filter(item => !item.as_button);
    expect(items.length).to.equal(0);
  });

  it('fetches link items with correct properties', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-contact-read.json',
    });
    const contentMenuItems = contentMenu.items;
    expect(contentMenuItems.length).to.equal(6);
    const links = contentMenuItems.filter(
      item => item.type === ContentMenuItemType.LINK
    );
    for (const link in links) {
      expect(link).should.include.keys(['type', 'title', 'href', 'as_button']);
    }
  });

  it('fetches js items with correct properties', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-archived-contacts.json',
    });
    const contentMenuItems = contentMenu.items;
    expect(contentMenuItems.length).to.equal(6);
    const jsItems = contentMenuItems.filter(
      item => item.type === ContentMenuItemType.JS
    );
    for (const jsItem in jsItems) {
      expect(jsItem).should.include.keys([
        'type',
        'id',
        'title',
        'href',
        'on_click',
        'js_class',
        'as_button',
      ]);
    }
  });

  it('fetches url_post items with correct properties', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-contact-read.json',
    });
    const contentMenuItems = contentMenu.items;
    expect(contentMenuItems.length).to.equal(6);
    const urlPosts = contentMenuItems.filter(
      item => item.type === ContentMenuItemType.URL_POST
    );
    for (const urlPost in urlPosts) {
      expect(urlPost).should.include.keys([
        'type',
        'title',
        'href',
        'js_class',
        'as_button',
      ]);
    }
  });

  it('fetches modax items with correct properties', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-new-campaign.json',
    });
    const contentMenuItems = contentMenu.items;
    expect(contentMenuItems.length).to.equal(6);
    const modaxes = contentMenuItems.filter(
      item => item.type === ContentMenuItemType.MODAX
    );
    for (const modax in modaxes) {
      expect(modax).should.include.keys([
        'type',
        'id',
        'title',
        'href',
        'modax',
        'on_submit',
        'style',
        'disabled',
        'as_button',
      ]);
    }
  });

  it('fetches divider items with correct properties', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-new-campaign.json',
    });
    const contentMenuItems = contentMenu.items;
    expect(contentMenuItems.length).to.equal(6);
    const dividers = contentMenuItems.filter(
      item => item.type === ContentMenuItemType.DIVIDER
    );
    for (const divider in dividers) {
      expect(divider).should.include.keys(['type', 'divider']);
    }
  });
});
