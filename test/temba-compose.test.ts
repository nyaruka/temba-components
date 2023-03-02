import { assert, expect, fixture } from '@open-wc/testing';
import { Attachment, Compose } from '../src/compose/Compose';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { Button } from '../src/button/Button';
import { Completion } from '../src/completion/Completion';

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

const upload_endpoint = '/msgmedia/upload/';

export const updateComponent = async (
  compose: Compose,
  text?: string,
  attachments?: Attachment[],
  errorAttachments?: Attachment[]
): Promise<void> => {
  compose.currentChat = text ? text : '';
  compose.values = attachments ? attachments : [];
  compose.errorValues = errorAttachments ? errorAttachments : [];
  await compose.updateComplete;
};
export const getSuccessText = () => {
  return 'sà-wàd-dee!';
};
export const getFailText = () => {
  // return a string that is 640+ chars
  return "p}h<r0P<?SCIbV1+pwW1Hj8g^J&=Sm2f)K=5LjFFUZ№5@ybpoLZ7DJ(27qdWxQMaO)I1nB4(D%d3c(H)QXOF6F?4>&d{lhd5?0`Lio!yAGMO№*AxN5{z5s.IO*dy?tm}vXJ#Lf-HlD;xmNp}0<P42=w#ll9)B-e9>Q#'{~Vp<dl:xC9`T^lhh@TosCZ^:(H<Ji<E(~PojvYk^rPB+poYy^Ne~Su1:9?IgH'4S5Q9v0g№FEIUc~!{S7;746j'Sd@Nfu3=x?CsuR;YLP4j+AOzDARZG?0(Ji(NMg=r%n0Fq?R1?E%Yf`bcoVZAJ^bl0J'^@;lH>T.HmxYxwS;1?(bfrh?pRdd73:iMxrfx5luQ(}<dCD1b3g'G0CtkB№;8KkbL=>krG{RO%Va4wwr%P>jE*+n(E11}Ju9#<.f^)<MTH09^b{RQv7~H`#@Hda6{MV&H@xdyEKq#M@nZng8WTU66!F@*!)w*EpQ+65XKuQCaESgq=PHmtqi@l;F?PHvl^g@Z:+}}Xyr`IC2=3?20^I'qSU*tkyinM^JF.ZI>}~XzRQJn№v3o-w?Vy&gC:c.l(&9{`M#-'N}{T#7lw8(4:iY621'>C^.&hVZn:R!G}Ek){D#'KkiJWawq#7~GLBN*?V!ncw)d%&(tXj";
};

export const getSuccessFiles = (numFiles = 2): Attachment[] => {
  const attachments = [];
  let index = 1;
  while (index <= numFiles) {
    const s = 's' + index;
    const attachment = {
      uuid: s,
      content_type: 'image/png',
      type: 'image/png',
      name: 'name_' + s,
      url: 'url_' + s,
      size: 1024,
      error: null,
    } as Attachment;
    attachments.push(attachment);
    index++;
  }
  return attachments;
};
export const getFailFiles = (): Attachment[] => {
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

const getLongTextWithSpaces = () => {
  // for a test width of 500, return a string that is 60+ chars with spaces
  return 'bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb bbbbbbbbbb ';
};
const getLongTextWithNoSpaces = () => {
  // for a test width of 500, return a string that is 60+ chars with no spaces
  return 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
};
const getLongTextWithUrl = () => {
  // for a test width of 500, return a url that is 60+ chars with no spaces
  return 'http://www.yourmomyourmomyourmomyourmomyourmomyourmomyourmomyourmomyourmomyourmomyourmom.com';
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
    await updateComponent(compose, getSuccessText());
    await assertScreenshot('compose/chatbox-with-text', getClip(compose));
  });

  it('chatbox with text and spaces', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
    });
    await updateComponent(compose, getLongTextWithSpaces());
    await assertScreenshot(
      'compose/chatbox-with-text-and-spaces',
      getClip(compose)
    );
  });

  it('chatbox with text and no spaces', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
    });
    await updateComponent(compose, getLongTextWithNoSpaces());
    await assertScreenshot(
      'compose/chatbox-with-text-no-spaces',
      getClip(compose)
    );
  });

  it('chatbox with text and url', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
    });
    await updateComponent(compose, getLongTextWithUrl());
    await assertScreenshot(
      'compose/chatbox-with-text-and-url',
      getClip(compose)
    );
  });

  it('chatbox with text and click send', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
    });
    await updateComponent(compose, getSuccessText());
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
    await updateComponent(compose, getSuccessText());
    const completion = compose.shadowRoot.querySelector(
      'temba-completion'
    ) as Completion;
    completion.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
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
    await updateComponent(compose, null, getSuccessFiles());
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
    await updateComponent(compose, null, null, getFailFiles());
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
    await updateComponent(compose, null, getSuccessFiles(), getFailFiles());
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
    await updateComponent(compose, null, getSuccessFiles());
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
    await updateComponent(compose, null, getSuccessFiles(), getFailFiles());
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
    await updateComponent(compose, getSuccessText());
    const completion = compose.shadowRoot.querySelector(
      'temba-completion'
    ) as Completion;
    completion.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
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
    await updateComponent(compose, null, getSuccessFiles());
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
    await updateComponent(compose, null, null, getFailFiles());
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
    await updateComponent(compose, null, getSuccessFiles(), getFailFiles());
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
    await updateComponent(compose, null, getSuccessFiles());
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
    await updateComponent(compose, null, getSuccessFiles(), getFailFiles());
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
    await updateComponent(compose, getSuccessText(), getSuccessFiles());
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
    await updateComponent(compose, getSuccessText(), null, getFailFiles());
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
    await updateComponent(
      compose,
      getSuccessText(),
      getSuccessFiles(),
      getFailFiles()
    );
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
    await updateComponent(compose, getSuccessText(), getSuccessFiles());
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
    await updateComponent(
      compose,
      getSuccessText(),
      getSuccessFiles(),
      getFailFiles()
    );
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
    await updateComponent(compose, getSuccessText(), getSuccessFiles());
    const completion = compose.shadowRoot.querySelector(
      'temba-completion'
    ) as Completion;
    completion.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
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
    await updateComponent(
      compose,
      getSuccessText(),
      getSuccessFiles(),
      getFailFiles()
    );
    const completion = compose.shadowRoot.querySelector(
      'temba-completion'
    ) as Completion;
    completion.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const newClip = getClip(compose);
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-all-files-and-hit-enter',
      newClip
    );
  });
});