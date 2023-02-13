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

// todo attachments
// todo manual upload
// todo drag and drop upload
// todo upload with no errors
// todo upload with errors

// todo chatbox and attachments
// todo mix of the above

// todo temba-contactchat tests for handleSend success responses
// todo temba-contactchat tests for handleSend fail responses
