import { assert, expect, fixture } from '@open-wc/testing';
import { Compose } from '../src/compose/Compose';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { CustomEventType } from '../src/interfaces';
import { Button } from '../src/button/Button';
import { Completion } from '../src/completion/Completion';

describe('temba-compose chatbox', () => {
  it('can be created', async () => {
    const compose: Compose = (await getComponent(
      '<temba-compose></temba-compose>'
    )) as Compose;
    assert.instanceOf(compose, Compose);
    expect(compose.endpoint).equals('/msgmedia/upload/');
  });

  it('cannot be created with a different endpoint', async () => {
    //because at the moment endpoint is not a public attribute
    const compose: Compose = (await getComponent(
      "<temba-compose endpoint='/schmsgmedia/schupload/'></temba-compose>"
    )) as Compose;
    assert.instanceOf(compose, Compose);
    expect(compose.endpoint).equals('/msgmedia/upload/');
  });

  it('chatbox no send button', async () => {
    const compose: Compose = (await getComponent(
      '<temba-compose chatbox></temba-compose>'
    )) as Compose;
    await assertScreenshot('compose/chatbox-no-send-button', getClip(compose));
  });

  it('chatbox and send button', async () => {
    const compose: Compose = (await getComponent(
      '<temba-compose chatbox button></temba-compose>'
    )) as Compose;
    await assertScreenshot('compose/chatbox-and-send-button', getClip(compose));
  });

  it('chatbox with text', async () => {
    const compose: Compose = (await getComponent(
      '<temba-compose chatbox button></temba-compose>'
    )) as Compose;

    compose.currentChat = 'sa-wad-dee!';

    await assertScreenshot('compose/chatbox-with-text', getClip(compose));
  });

  // it('chatbox with text and hit enter', async () => {
  //   const compose: Compose = await getCompose(
  //     "<temba-compose chatbox counter button></temba-compose>");

  //   compose.currentChat = 'sà-wàd-dee!';
  //   // const completion = compose.shadowRoot.querySelector('temba-completion') as Completion;
  //   // completion.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

  //   await assertScreenshot(
  //     'compose/chatbox-with-text-and-hit-enter',
  //     getClip(compose)
  //   );
  // });

  // it('chatbox with text and click send', async () => {
  //   const compose: Compose = await getCompose(
  //     "<temba-compose chatbox counter button></temba-compose>");

  //   compose.currentChat = 'sà-wàd-dee!';
  //   // const send = compose.shadowRoot.querySelector('temba-button') as Button;
  //   // send.click();

  //   await assertScreenshot(
  //     'compose/chatbox-with-text-and-click-send',
  //     getClip(compose)
  //   );
  // });
});

// todo temba-compose attachments

// todo temba-compose chatbox and attachments

// describe('temba-compose', () => {

// it('with chatbox and attachments no send button', async () => {
//   const compose: Compose = await getCompose({
//     endpoint: endpoint,
//     button: false,
//   });
//   assert.instanceOf(compose, Compose);
//   const chatboxDiv = compose.shadowRoot.querySelector(
//     '.items .chatbox'
//   ) as HTMLDivElement;
//   expect(chatboxDiv).to.not.equal(null);
//   const attachmentsDiv = compose.shadowRoot.querySelector(
//     '.items .attachments'
//   ) as HTMLDivElement;
//   expect(attachmentsDiv).to.not.equal(null);
//   const sendButton = compose.shadowRoot.querySelector(
//     'temba-button#send-button'
//   ) as Button;
//   expect(sendButton).to.equal(null);
// });

// it('with chatbox and attachments and send button', async () => {
//   const compose: Compose = await getCompose({
//     endpoint: endpoint,
//   });
//   assert.instanceOf(compose, Compose);
//   const chatboxDiv = compose.shadowRoot.querySelector(
//     '.items .chatbox'
//   ) as HTMLDivElement;
//   expect(chatboxDiv).to.not.equal(null);
//   const attachmentsDiv = compose.shadowRoot.querySelector(
//     '.items .attachments'
//   ) as HTMLDivElement;
//   expect(attachmentsDiv).to.not.equal(null);
//   const sendButton = compose.shadowRoot.querySelector(
//     'temba-button#send-button'
//   ) as Button;
//   expect(sendButton).to.not.equal(null);
//   // todo check value of counter
//   // todo check value of currentChat
//   // todo check value of values
//   // todo check that send button is disabled
// });

// // todo tests for when all 3 are actively displaying

// it('with attachments no send button', async () => {
//   const compose: Compose = await getCompose({
//     endpoint: endpoint,
//     chatbox: false,
//     button: false,
//   });
//   assert.instanceOf(compose, Compose);
//   const chatboxDiv = compose.shadowRoot.querySelector(
//     '.items .chatbox'
//   ) as HTMLDivElement;
//   expect(chatboxDiv).to.equal(null);
//   const attachmentsDiv = compose.shadowRoot.querySelector(
//     '.items .attachments'
//   ) as HTMLDivElement;
//   expect(attachmentsDiv).to.not.equal(null);
//   const sendButton = compose.shadowRoot.querySelector(
//     'temba-button#send-button'
//   ) as Button;
//   expect(sendButton).to.equal(null);
//   // todo check value of values
// });

// it('with attachments and send button', async () => {
//   const compose: Compose = await getCompose({
//     endpoint: endpoint,
//     chatbox: false,
//   });
//   assert.instanceOf(compose, Compose);
//   const chatboxDiv = compose.shadowRoot.querySelector(
//     '.items .chatbox'
//   ) as HTMLDivElement;
//   expect(chatboxDiv).to.equal(null);
//   const attachmentsDiv = compose.shadowRoot.querySelector(
//     '.items .attachments'
//   ) as HTMLDivElement;
//   expect(attachmentsDiv).to.not.equal(null);
//   const sendButton = compose.shadowRoot.querySelector(
//     'temba-button#send-button'
//   ) as Button;
//   expect(sendButton).to.not.equal(null);
//   // todo check value of values
// });

// it('with attachments list and send button', async () => {
//   const compose: Compose = await getCompose({
//     endpoint: endpoint,
//     chatbox: false,
//   });
//   assert.instanceOf(compose, Compose);
//   const chatboxDiv = compose.shadowRoot.querySelector(
//     '.items .chatbox'
//   ) as HTMLDivElement;
//   expect(chatboxDiv).to.equal(null);
//   const attachmentsDiv = compose.shadowRoot.querySelector(
//     '.items .attachments'
//   ) as HTMLDivElement;
//   expect(attachmentsDiv).to.not.equal(null);
//   const sendButton = compose.shadowRoot.querySelector(
//     'temba-button#send-button'
//   ) as Button;
//   expect(sendButton).to.not.equal(null);
//   // todo check value of values
// });

// todo test for attachment manual upload
// todo test for attachment drag and drop upload
// todo test for attachment upload with errors
// todo test for attachment send with errors?
// });
