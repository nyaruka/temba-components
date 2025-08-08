import { assert, expect } from '@open-wc/testing';
import { CustomEventType } from '../src/interfaces';
import { ContentMenu } from '../src/list/ContentMenu';
import { assertScreenshot, getClip, getComponent } from './utils.test';

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

  // return right away if we don't have an endpoint
  if (!contentMenu.endpoint) {
    return contentMenu;
  }

  // Wait for the component to be loaded by checking if items and buttons are populated
  // This is more reliable than waiting for events in the test environment
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    // Check if the component has loaded (items or buttons populated)
    if (contentMenu.items.length > 0 || contentMenu.buttons.length > 0) {
      return contentMenu;
    }
    
    // Wait a short time before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  // If we still don't have data, return the component anyway for error tests
  return contentMenu;
};

describe('temba-content-menu', () => {
  it('can initially be created without endpoint', async () => {
    const contentMenu: ContentMenu = await getContentMenu();
    assert.instanceOf(contentMenu, ContentMenu);
    expect(contentMenu.endpoint).is.undefined;
  });

  it('with 1+ items and 1+ buttons', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-contact-read.json'
    });

    expect(contentMenu.items.length).equals(5);
    expect(contentMenu.buttons.length).equals(1);
    await assertScreenshot(
      'content-menu/items-and-buttons',
      getClip(contentMenu)
    );
  });

  it('with 1+ items and 0 buttons', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-archived-contacts.json'
    });

    expect(contentMenu.items.length).equals(1);
    expect(contentMenu.buttons.length).equals(0);
    await assertScreenshot(
      'content-menu/item-no-buttons',
      getClip(contentMenu)
    );
  });

  it('with 0 items and 1+ buttons', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-new-campaign.json'
    });

    expect(contentMenu.items.length).equals(0);
    expect(contentMenu.buttons.length).equals(1);
    await assertScreenshot(
      'content-menu/button-no-items',
      getClip(contentMenu)
    );
  });

  it('bad endpoint', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-bad-endpoint.json'
    });

    expect(contentMenu.items.length).equals(0);
    expect(contentMenu.buttons.length).equals(0);
  });

  it('is spa page', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-contact-read.json',
      legacy: 0
    });
    expect(contentMenu.legacy).equals(0);
  });

  it('is legacy page', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu-contact-read.json',
      legacy: 1
    });
    expect(contentMenu.legacy).equals(1);
  });
});
