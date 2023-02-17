import { assert, expect, fixture } from '@open-wc/testing';
import { Attachment, Compose } from '../src/compose/Compose';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { Button } from '../src/button/Button';

const TAG = 'temba-compose';
const getCompose = async (attrs: any = {}, width = 500, height = 500) => {
  console.log('getCompose height ' + height);
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

const upload_endpoint = '/msgmedia/upload/';

const getSuccessFiles = () => {
  const s1 = 's1';
  const success1 = {
    uuid: s1,
    content_type: 'image/png',
    type: 'image/png',
    name: 'name_' + s1,
    url: 'url_' + s1,
    size: 1024,
    error: null,
  } as Attachment;

  const s2 = 's2';
  const success2 = {
    uuid: s2,
    content_type: 'image/jpeg',
    type: 'image/jpeg',
    name: 'name_' + s2,
    url: 'url_' + s2,
    size: 1024,
    error: null,
  } as Attachment;

  return [success1, success2];
};

const getFailFiles = () => {
  const f1 = 'f1';
  const fail1 = {
    uuid: f1,
    content_type: 'image/png',
    type: 'image/png',
    name: 'name_' + f1,
    url: 'url_' + f1,
    size: 26624,
    error: 'Limit for file uploads is 25.0 MB',
  } as Attachment;
  const f2 = 'f2';
  const fail2 = {
    uuid: f2,
    content_type: 'application/octet-stream',
    type: 'application/octet-stream',
    name: 'name_' + f2,
    url: 'url_' + f2,
    size: 1024,
    error: 'Unsupported file type',
  } as Attachment;

  return [fail1, fail2];
};

describe('temba-compose chatbox', () => {
  it('can be created', async () => {
    const compose: Compose = await getCompose();
    assert.instanceOf(compose, Compose);
    expect(compose.endpoint).equals(upload_endpoint);
  });

  it('cannot be created with a different endpoint', async () => {
    const compose: Compose = await getCompose({
      endpoint: '/schmsgmedia/schmupload/',
    });
    assert.instanceOf(compose, Compose);
    expect(compose.endpoint).equals(upload_endpoint);
  });

  it('chatbox no counter no send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
    });
    await assertScreenshot(
      'compose/chatbox-no-counter-no-send-button',
      getClip(compose)
    );
  });

  it('chatbox no counter and send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      button: true,
    });
    await assertScreenshot(
      'compose/chatbox-no-counter-and-send-button',
      getClip(compose)
    );
  });

  it('chatbox counter no send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
    });
    await assertScreenshot(
      'compose/chatbox-counter-no-send-button',
      getClip(compose)
    );
  });

  it('chatbox counter and send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
    });
    await assertScreenshot(
      'compose/chatbox-counter-and-send-button',
      getClip(compose)
    );
  });

  it('chatbox with text', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    await assertScreenshot('compose/chatbox-with-text', getClip(compose));
  });

  it('chatbox with text and click send', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();
    await assertScreenshot(
      'compose/chatbox-with-text-and-click-send',
      getClip(compose)
    );
  });

  it('chatbox with text and hit enter', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    await pressKey('Enter', 1);
    await assertScreenshot(
      'compose/chatbox-with-text-and-hit-enter',
      getClip(compose)
    );
  });
});

describe('temba-compose attachments', () => {
  it('attachments no send button', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
    });
    await assertScreenshot(
      'compose/attachments-no-send-button',
      getClip(compose)
    );
  });

  it('attachments and send button', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true,
    });
    await assertScreenshot(
      'compose/attachments-and-send-button',
      getClip(compose)
    );
  });

  it('attachments with success uploaded files', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true,
    });
    compose.values = getSuccessFiles();
    await assertScreenshot(
      'compose/attachments-with-success-files',
      getClip(compose)
    );
  });

  it('attachments with failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true,
    });
    compose.errorValues = getFailFiles();
    await assertScreenshot(
      'compose/attachments-with-failure-files',
      getClip(compose)
    );
  });

  it('attachments with success and failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true,
    });
    compose.values = getSuccessFiles();
    compose.errorValues = getFailFiles();
    await assertScreenshot(
      'compose/attachments-with-all-files',
      getClip(compose)
    );
  });

  it('attachments with success uploaded files and click send', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true,
    });
    compose.values = getSuccessFiles();
    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();
    await assertScreenshot(
      'compose/attachments-with-success-files-and-click-send',
      getClip(compose)
    );
  });

  it('attachments with success and failure uploaded files and click send', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true,
    });
    compose.values = getSuccessFiles();
    compose.errorValues = getFailFiles();
    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();
    await assertScreenshot(
      'compose/attachments-with-all-files-and-click-send',
      getClip(compose)
    );
  });
});

describe('temba-compose chatbox and attachments', () => {
  it('chatbox and attachments no counter no send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
    });
    await assertScreenshot(
      'compose/chatbox-attachments-no-counter-no-send-button',
      getClip(compose)
    );
  });

  it('chatbox and attachments no counter and send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    await assertScreenshot(
      'compose/chatbox-attachments-no-counter-and-send-button',
      getClip(compose)
    );
  });

  it('chatbox and attachments counter no send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      counter: true,
    });
    await assertScreenshot(
      'compose/chatbox-attachments-counter-no-send-button',
      getClip(compose)
    );
  });

  it('chatbox and attachments counter and send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      counter: true,
      button: true,
    });
    await assertScreenshot(
      'compose/chatbox-attachments-counter-and-send-button',
      getClip(compose)
    );
  });
});

describe('temba-compose chatbox with text and attachments no files', () => {
  it('chatbox with text, attachments no files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      counter: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-no-files',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments no files, and click send', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      counter: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-no-files-and-click-send',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments no files, and hit enter', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      counter: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    await pressKey('Enter', 1);
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-no-files-and-hit-enter',
      getClip(compose)
    );
  });
});

describe('temba-compose chatbox no text and attachments with files', () => {
  it('chatbox no text, attachments with success uploaded files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.values = getSuccessFiles();
    await assertScreenshot(
      'compose/chatbox-no-text-attachments-with-success-files',
      getClip(compose)
    );
  });

  it('chatbox no text, attachments with failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.errorValues = getFailFiles();
    await assertScreenshot(
      'compose/chatbox-no-text-attachments-with-failure-files',
      getClip(compose)
    );
  });

  it('chatbox no text, attachments with success and failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.values = getSuccessFiles();
    compose.errorValues = getFailFiles();
    await assertScreenshot(
      'compose/chatbox-no-text-attachments-with-all-files',
      getClip(compose)
    );
  });

  // todo fix this test - button should be enabled
  it('chatbox no text, attachments with success uploaded files, and click send', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.values = getSuccessFiles();
    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();
    await assertScreenshot(
      'compose/chatbox-no-text-attachments-with-success-files-and-click-send',
      getClip(compose)
    );
  });

  it('chatbox no text, attachments with success and failure uploaded files, and click send', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.values = getSuccessFiles();
    compose.errorValues = getFailFiles();
    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();
    await assertScreenshot(
      'compose/chatbox-no-text-attachments-with-all-files-and-click-send',
      getClip(compose)
    );
  });
});

describe('temba-compose chatbox with text and attachments with files', () => {
  it('chatbox with text, attachments with success uploaded files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    compose.values = getSuccessFiles();
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-success-files',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments with failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    compose.errorValues = getFailFiles();
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-failure-files',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments with success and failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    compose.values = getSuccessFiles();
    compose.errorValues = getFailFiles();
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-all-files',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments with success uploaded files, and click send', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    compose.values = getSuccessFiles();
    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-success-files-and-click-send',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments with success and failure uploaded files, and click send', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    compose.values = getSuccessFiles();
    compose.errorValues = getFailFiles();
    const send = compose.shadowRoot.querySelector(
      'temba-button#send-button'
    ) as Button;
    send.click();
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-all-files-and-click-send',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments with success uploaded files, and hit enter', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    compose.currentChat = 'sà-wàd-dee!';
    compose.values = getSuccessFiles();
    await pressKey('Enter', 1);
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-success-files-and-hit-enter',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments with success and failure uploaded files, and hit enter', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
    });
    console.log('just after getCompose client width ' + compose.clientWidth);
    console.log('just after getCompose offset width ' + compose.offsetWidth);
    console.log('just after getCompose scroll width ' + compose.scrollWidth);
    console.log('just after getCompose client height ' + compose.clientHeight);
    console.log('just after getCompose offset height ' + compose.offsetHeight);
    console.log('just after getCompose scroll height ' + compose.scrollHeight);
    compose.currentChat = 'sà-wàd-dee!';
    compose.values = getSuccessFiles();
    compose.errorValues = getFailFiles();
    await pressKey('Enter', 1);
    const newClip = getClip(compose);
    console.log('just after getClip');
    console.log(newClip);
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-all-files-and-hit-enter',
      newClip
    );
  });
});

// todo contactchat:
// handleSend success responses
// handleSend fail responses
