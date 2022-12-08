import { assert, expect } from '@open-wc/testing';

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

  return contentMenu;
};

describe('temba-content-menu', () => {
  it('can be created', async () => {
    const contentMenu: ContentMenu = await getContentMenu();
    assert.instanceOf(contentMenu, ContentMenu);
    expect(contentMenu).is.undefined;
  });

  it('renders with endpoint', async () => {
    const contentMenu: ContentMenu = await getContentMenu({
      endpoint: '/test-assets/list/content-menu.json',
    });

    expect(contentMenu.items.length).to.equal(6);
    await assertScreenshot('list/content-menu', getClip(contentMenu));
  });
});
