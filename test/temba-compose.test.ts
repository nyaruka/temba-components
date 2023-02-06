import { assert, expect } from '@open-wc/testing';
import { CustomEventType } from '../src/interfaces';
import { Compose } from '../src/compose/Compose';
import { getComponent } from './utils.test';
import { Button } from '../src/button/Button';

const TAG = 'temba-attachment-editor';
const getCompose = async (attrs: any = {}, width = 0) => {
  const compose = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    0,
    'display:inline-block'
  )) as Compose;

  // return right away if we don't have an endpoint
  if (!compose.endpoint) {
    return compose;
  }

  // if we have an endpoint, wait for a loaded event before returning
  return new Promise<Compose>(resolve => {
    compose.addEventListener(
      CustomEventType.Loaded,
      async () => {
        resolve(compose);
      },
      { once: true }
    );
  });
};

describe('temba-compose', () => {
  it('can initially be created without endpoint', async () => {
    const compose: Compose = await getCompose();
    assert.instanceOf(compose, Compose);
    expect(compose.endpoint).is.undefined;
  });

  it('can initially be created with endpoint', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/msgmedia/upload/',
    });
    assert.instanceOf(compose, Compose);
    expect(compose.endpoint).equals('/msgmedia/upload/');
  });

  it('with chatbox and attachments no send button', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/msgmedia/upload/',
      button: false,
    });
    assert.instanceOf(compose, Compose);
    const chatboxDiv = compose.shadowRoot.querySelector(
      '.items .chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.not.equal(null);
    const attachmentsDiv = compose.shadowRoot.querySelector(
      '.items .attachments'
    ) as HTMLDivElement;
    expect(attachmentsDiv).to.not.equal(null);
    const sendButton = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    expect(sendButton).to.equal(null);
  });

  it('with chatbox and attachments and send button', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/msgmedia/upload/',
    });
    assert.instanceOf(compose, Compose);
    const chatboxDiv = compose.shadowRoot.querySelector(
      '.items .chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.not.equal(null);
    const attachmentsDiv = compose.shadowRoot.querySelector(
      '.items .attachments'
    ) as HTMLDivElement;
    expect(attachmentsDiv).to.not.equal(null);
    const sendButton = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    expect(sendButton).to.not.equal(null);
    // todo check value of counter
    // todo check value of currentChat
    // todo check value of values
    // todo check that send button is disabled
  });

  // todo tests for when all 3 are actively displaying

  it('with chatbox no send button', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/msgmedia/upload/',
      attachments: false,
      button: false,
    });
    assert.instanceOf(compose, Compose);
    const chatboxDiv = compose.shadowRoot.querySelector(
      '.items .chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.not.equal(null);
    const attachmentsDiv = compose.shadowRoot.querySelector(
      '.items .attachments'
    ) as HTMLDivElement;
    expect(attachmentsDiv).to.equal(null);
    const sendButton = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    expect(sendButton).to.equal(null);
    // todo check value of counter
    // todo check value of currentChat
  });

  it('with chatbox and send button', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/msgmedia/upload/',
      attachments: false,
    });
    assert.instanceOf(compose, Compose);
    const chatboxDiv = compose.shadowRoot.querySelector(
      '.items .chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.not.equal(null);
    const attachmentsDiv = compose.shadowRoot.querySelector(
      '.items .attachments'
    ) as HTMLDivElement;
    expect(attachmentsDiv).to.equal(null);
    const sendButton = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    expect(sendButton).to.not.equal(null);
    // todo check value of counter
    // todo check value of currentChat
    // todo check that send button is disabled
  });

  it('with chatbox text and send button', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/msgmedia/upload/',
      attachments: false,
    });
    assert.instanceOf(compose, Compose);
    const chatboxDiv = compose.shadowRoot.querySelector(
      '.items .chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.not.equal(null);
    const sendButton = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    expect(sendButton).to.not.equal(null);
    // todo check value of counter
    // todo check value of currentChat
    // todo check that send button is disabled
  });

  // todo test for chatbox input with errors?
  // todo test for chatbox send with errors?

  it('with attachments no send button', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/msgmedia/upload/',
      chatbox: false,
      button: false,
    });
    assert.instanceOf(compose, Compose);
    const chatboxDiv = compose.shadowRoot.querySelector(
      '.items .chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);
    const attachmentsDiv = compose.shadowRoot.querySelector(
      '.items .attachments'
    ) as HTMLDivElement;
    expect(attachmentsDiv).to.not.equal(null);
    const sendButton = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    expect(sendButton).to.equal(null);
    // todo check value of values
  });

  it('with attachments and send button', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/msgmedia/upload/',
      chatbox: false,
    });
    assert.instanceOf(compose, Compose);
    const chatboxDiv = compose.shadowRoot.querySelector(
      '.items .chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);
    const attachmentsDiv = compose.shadowRoot.querySelector(
      '.items .attachments'
    ) as HTMLDivElement;
    expect(attachmentsDiv).to.not.equal(null);
    const sendButton = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    expect(sendButton).to.not.equal(null);
    // todo check value of values
  });

  it('with attachments list and send button', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/msgmedia/upload/',
      chatbox: false,
    });
    assert.instanceOf(compose, Compose);
    const chatboxDiv = compose.shadowRoot.querySelector(
      '.items .chatbox'
    ) as HTMLDivElement;
    expect(chatboxDiv).to.equal(null);
    const attachmentsDiv = compose.shadowRoot.querySelector(
      '.items .attachments'
    ) as HTMLDivElement;
    expect(attachmentsDiv).to.not.equal(null);
    const sendButton = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    expect(sendButton).to.not.equal(null);
    // todo check value of values
  });

  // todo test for attachment manual upload
  // todo test for attachment drag and drop upload
  // todo test for attachment upload with errors
  // todo test for attachment send with errors?
});
