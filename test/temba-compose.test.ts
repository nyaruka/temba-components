import { assert, expect } from '@open-wc/testing';
import { Compose } from '../src/compose/Compose';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { DEFAULT_MEDIA_ENDPOINT } from '../src/utils';
import { Attachment } from '../src/interfaces';

const TAG = 'temba-compose';
const getCompose = async (attrs: any = {}, width = 500, height = 500) => {
  const compose = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    height,
    'display:flex;flex-direction:column;flex-grow:1;'
  )) as Compose;
  return compose;
};

export const updateComponent = async (
  compose: Compose,
  text?: string,
  attachments?: Attachment[]
): Promise<void> => {
  compose.initialText = text ? text : '';
  compose.currentAttachments = attachments ? attachments : [];
  await compose.updateComplete;
};

const getInitialValue = (
  text?: string,
  attachments?: Attachment[],
  quick_replies?: []
): any => {
  const composeValue = {
    und: {
      text: text ? text : '',
      attachments: attachments ? attachments : [],
      quick_replies: quick_replies ? quick_replies : [],
      optin: null,
      template: null,
      variables: []
    }
  };
  return composeValue;
};
const getComposeValue = (value: any): string => {
  return JSON.stringify(value);
};

export const getValidText = () => {
  return 'sà-wàd-dee!';
};

// valid = attachments that are uploaded sent to the server when the user clicks send
export const getValidAttachments = (numFiles = 2): Attachment[] => {
  const attachments = [];
  let index = 1;
  while (index <= numFiles) {
    const s = 's' + index;
    const attachment = {
      uuid: s,
      content_type: 'image/png',
      type: 'image/png',
      filename: 'name_' + s,
      url: 'url_' + s,
      size: 1024,
      error: null
    } as Attachment;
    attachments.push(attachment);
    index++;
  }
  return attachments;
};

// for a test width of 500, return a string that is 60+ chars with spaces
// to test that line breaks / word wrapping works as expected
const getValidText_Long_WithSpaces = () => {
  return 'bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb ';
};

const getValidText_Long_WithNoSpaces = () => {
  return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
};

const getValidText_Long_WithUrl = () => {
  return 'http://www.yourmomyourmomyourmomyourmomyourmomyourmomyourmomyourmomyourmomyourmomyourmom.com';
};

describe('temba-compose chatbox', () => {
  it('can be created', async () => {
    const compose: Compose = await getCompose();
    assert.instanceOf(compose, Compose);
    expect(compose.endpoint).equals(DEFAULT_MEDIA_ENDPOINT);
  });

  it('cannot be created with a different endpoint', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/schmsgmedia/schmupload/'
    });
    assert.instanceOf(compose, Compose);
    expect(compose.endpoint).equals(DEFAULT_MEDIA_ENDPOINT);
  });

  it('no counter', async () => {
    const compose: Compose = await getCompose({
      chatbox: true
    });
    await assertScreenshot('compose/no-counter', getClip(compose));
  });

  it('initializes with text', async () => {
    const compose: Compose = await getCompose({
      counter: true
    });
    await updateComponent(compose, getValidText());
    await assertScreenshot('compose/intial-text', getClip(compose));
  });

  it('serializes', async () => {
    const initialValue = getInitialValue(getValidText());
    const composeValue = getComposeValue(initialValue);

    const compose: Compose = await getCompose({
      counter: true,
      value: composeValue
    });

    // deserialize
    expect(compose.currentText).to.equal(getValidText());
    expect(compose.currentAttachments).to.deep.equal([]);

    // serialize
    expect(compose.value).to.equal(composeValue);
  });

  // TODO: these are better suited for textinput tests
  it('wraps text and spaces', async () => {
    const compose: Compose = await getCompose({
      counter: true
    });
    await updateComponent(compose, getValidText_Long_WithSpaces());
    await assertScreenshot('compose/wraps-text-and-spaces', getClip(compose));
  });

  it('wraps text and no spaces', async () => {
    const compose: Compose = await getCompose({
      counter: true
    });
    await updateComponent(compose, getValidText_Long_WithNoSpaces());
    await assertScreenshot('compose/wraps-text-no-spaces', getClip(compose));
  });

  it('wraps with text and url', async () => {
    const compose: Compose = await getCompose({
      counter: true
    });
    await updateComponent(compose, getValidText_Long_WithUrl());
    await assertScreenshot('compose/wraps-text-and-url', getClip(compose));
  });
});

describe('temba-compose attachments', () => {
  it('supports attachments tab', async () => {
    const compose: Compose = await getCompose({
      attachments: true
    });
    await assertScreenshot('compose/attachments-tab', getClip(compose));
  });

  it('shows valid attachments', async () => {
    const compose: Compose = await getCompose({
      attachments: true
    });
    await updateComponent(compose, null, getValidAttachments());
    await assertScreenshot('compose/attachments-with-files', getClip(compose));

    // click on tab
    const tabs = compose.getTabs();
    tabs.focusTab('Attachments');

    await assertScreenshot(
      'compose/attachments-with-files-focused',
      getClip(compose)
    );
  });

  it('serializes attachments', async () => {
    const initialValue = getInitialValue(null, getValidAttachments());
    const composeValue = getComposeValue(initialValue);
    const compose: Compose = await getCompose({
      attachments: true,
      value: composeValue
    });
    // deserialize
    expect(compose.currentText).to.equal('');
    expect(compose.currentAttachments).to.deep.equal(getValidAttachments());
    // serialize
    expect(compose.value).to.equal(composeValue);
  });
});
