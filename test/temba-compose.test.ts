import { assert, expect } from '@open-wc/testing';
import { Compose } from '../src/compose/Compose';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { Button } from '../src/button/Button';
import { Completion } from '../src/completion/Completion';
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
  attachments?: Attachment[],
  errorAttachments?: Attachment[]
): Promise<void> => {
  compose.initialText = text ? text : '';
  compose.currentAttachments = attachments ? attachments : [];
  compose.failedAttachments = errorAttachments ? errorAttachments : [];
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
      optin: null
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
// for a server limit of 640 chars, return a string that is 640+ chars
export const getInvalidText = () => {
  return "p}h<r0P<?SCIbV1+pwW1Hj8g^J&=Sm2f)K=5LjFFUZ№5@ybpoLZ7DJ(27qdWxQMaO)I1nB4(D%d3c(H)QXOF6F?4>&d{lhd5?0`Lio!yAGMO№*AxN5{z5s.IO*dy?tm}vXJ#Lf-HlD;xmNp}0<P42=w#ll9)B-e9>Q#'{~Vp<dl:xC9`T^lhh@TosCZ^:(H<Ji<E(~PojvYk^rPB+poYy^Ne~Su1:9?IgH'4S5Q9v0g№FEIUc~!{S7;746j'Sd@Nfu3=x?CsuR;YLP4j+AOzDARZG?0(Ji(NMg=r%n0Fq?R1?E%Yf`bcoVZAJ^bl0J'^@;lH>T.HmxYxwS;1?(bfrh?pRdd73:iMxrfx5luQ(}<dCD1b3g'G0CtkB№;8KkbL=>krG{RO%Va4wwr%P>jE*+n(E11}Ju9#<.f^)<MTH09^b{RQv7~H`#@Hda6{MV&H@xdyEKq#M@nZng8WTU66!F@*!)w*EpQ+65XKuQCaESgq=PHmtqi@l;F?PHvl^g@Z:+}}Xyr`IC2=3?20^I'qSU*tkyinM^JF.ZI>}~XzRQJn№v3o-w?Vy&gC:c.l(&9{`M#-'N}{T#7lw8(4:iY621'>C^.&hVZn:R!G}Ek){D#'KkiJWawq#7~GLBN*?V!ncw)d%&(tXj";
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
// invalid = attachments that are not uploaded and are not sent to the server when the user clicks send
export const getInvalidAttachments = (): Attachment[] => {
  const f1 = 'f1';
  const fail1 = {
    uuid: f1,
    content_type: 'image/png',
    type: 'image/png',
    filename: 'name_' + f1,
    url: 'url_' + f1,
    size: 26624,
    error: 'Limit for file uploads is 25.0 MB'
  } as Attachment;
  const f2 = 'f2';
  const fail2 = {
    uuid: f2,
    content_type: 'application/octet-stream',
    type: 'application/octet-stream',
    filename: 'name_' + f2,
    url: 'url_' + f2,
    size: 1024,
    error: 'Unsupported file type'
  } as Attachment;

  return [fail1, fail2];
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

  it('chatbox no counter no send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true
    });
    await assertScreenshot(
      'compose/chatbox-no-counter-no-send-button',
      getClip(compose)
    );
  });

  it('chatbox no counter and send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      button: true
    });
    await assertScreenshot(
      'compose/chatbox-no-counter-and-send-button',
      getClip(compose)
    );
  });

  it('chatbox counter no send button', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true
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
      button: true
    });
    await assertScreenshot(
      'compose/chatbox-counter-and-send-button',
      getClip(compose)
    );
  });

  it('chatbox counter and send button deserialize and serialize', async () => {
    const initialValue = getInitialValue();
    const composeValue = getComposeValue(initialValue);

    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
      value: composeValue
    });
    // deserialize
    expect(compose.currentText).to.equal('');
    expect(compose.currentAttachments).to.deep.equal([]);
    // serialize
    expect(compose.value).to.equal('{}');
  });

  it('chatbox with text', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true
    });
    await updateComponent(compose, getValidText());
    await assertScreenshot('compose/chatbox-with-text', getClip(compose));
  });

  it('chatbox with text deserialize and serialize', async () => {
    const initialValue = getInitialValue(getValidText());
    const composeValue = getComposeValue(initialValue);

    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
      value: composeValue
    });
    // deserialize
    expect(compose.currentText).to.equal(getValidText());
    expect(compose.currentAttachments).to.deep.equal([]);
    // serialize
    expect(compose.value).to.equal(composeValue);
  });

  it('chatbox with text and spaces', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true
    });
    await updateComponent(compose, getValidText_Long_WithSpaces());
    await assertScreenshot(
      'compose/chatbox-with-text-and-spaces',
      getClip(compose)
    );
  });

  it('chatbox with text and no spaces', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true
    });
    await updateComponent(compose, getValidText_Long_WithNoSpaces());
    await assertScreenshot(
      'compose/chatbox-with-text-no-spaces',
      getClip(compose)
    );
  });

  it('chatbox with text and url', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true
    });
    await updateComponent(compose, getValidText_Long_WithUrl());
    await assertScreenshot(
      'compose/chatbox-with-text-and-url',
      getClip(compose)
    );
  });

  it('chatbox with text and click send', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true
    });
    await updateComponent(compose, getValidText());
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
      button: true
    });
    await updateComponent(compose, getValidText());
    const chatbox = compose.shadowRoot.querySelector('.chatbox') as Completion;
    chatbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await assertScreenshot(
      'compose/chatbox-with-text-and-hit-enter',
      getClip(compose)
    );
  });
});

describe('temba-compose attachments', () => {
  it('attachments no send button', async () => {
    const compose: Compose = await getCompose({
      attachments: true
    });
    await assertScreenshot(
      'compose/attachments-no-send-button',
      getClip(compose)
    );
  });

  it('attachments and send button', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true
    });
    await assertScreenshot(
      'compose/attachments-and-send-button',
      getClip(compose)
    );
  });

  it('attachments and send button deserialize and serialize', async () => {
    const initialValue = getInitialValue();
    const composeValue = getComposeValue(initialValue);

    const compose: Compose = await getCompose({
      attachments: true,
      button: true,
      value: composeValue
    });
    // deserialize
    expect(compose.currentText).to.equal('');
    expect(compose.currentAttachments).to.deep.equal([]);
    // serialize
    expect(compose.value).to.equal('{}');
  });

  it('attachments with success uploaded files', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true
    });
    await updateComponent(compose, null, getValidAttachments());
    await assertScreenshot(
      'compose/attachments-with-success-files',
      getClip(compose)
    );
  });

  it('attachments with success uploaded files deserialize and serialize', async () => {
    const initialValue = getInitialValue(null, getValidAttachments());
    const composeValue = getComposeValue(initialValue);
    const compose: Compose = await getCompose({
      attachments: true,
      button: true,
      value: composeValue
    });
    // deserialize
    expect(compose.currentText).to.equal('');
    expect(compose.currentAttachments).to.deep.equal(getValidAttachments());
    // serialize
    expect(compose.value).to.equal(composeValue);
  });

  it('attachments with failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true
    });
    await updateComponent(compose, null, null, getInvalidAttachments());
    await assertScreenshot(
      'compose/attachments-with-failure-files',
      getClip(compose)
    );
  });

  it('attachments with success and failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true
    });
    await updateComponent(
      compose,
      null,
      getValidAttachments(),
      getInvalidAttachments()
    );
    await assertScreenshot(
      'compose/attachments-with-all-files',
      getClip(compose)
    );
  });

  it('attachments with success uploaded files and click send', async () => {
    const compose: Compose = await getCompose({
      attachments: true,
      button: true
    });
    await updateComponent(compose, null, getValidAttachments());
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
      button: true
    });
    await updateComponent(
      compose,
      null,
      getValidAttachments(),
      getInvalidAttachments()
    );
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
      attachments: true
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
      button: true
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
      counter: true
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
      button: true
    });
    await assertScreenshot(
      'compose/chatbox-attachments-counter-and-send-button',
      getClip(compose)
    );
  });

  it('chatbox and attachments counter and send button deserialize and serialize', async () => {
    const initialValue = getInitialValue();
    const composeValue = getComposeValue(initialValue);

    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      counter: true,
      button: true,
      value: composeValue
    });
    // deserialize
    expect(compose.currentText).to.equal('');
    expect(compose.currentAttachments).to.deep.equal([]);
    // serialize
    expect(compose.value).to.equal('{}');
  });
});

describe('temba-compose chatbox with text and attachments no files', () => {
  it('chatbox with text, attachments no files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      counter: true,
      button: true
    });
    updateComponent(compose, getValidText());
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-no-files',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments no files deserialize and serialize', async () => {
    const initialValue = getInitialValue(getValidText());
    const composeValue = getComposeValue(initialValue);

    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      counter: true,
      button: true,
      value: composeValue
    });
    // deserialize
    expect(compose.currentText).to.equal(getValidText());
    expect(compose.currentAttachments).to.deep.equal([]);
    // serialize
    expect(compose.value).to.equal(composeValue);
  });

  it('chatbox with text, attachments no files, and click send', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      counter: true,
      button: true
    });
    updateComponent(compose, getValidText());
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
      button: true
    });
    await updateComponent(compose, getValidText());
    const chatbox = compose.shadowRoot.querySelector('.chatbox') as HTMLElement;
    chatbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
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
      button: true
    });
    await updateComponent(compose, null, getValidAttachments());
    await assertScreenshot(
      'compose/chatbox-no-text-attachments-with-success-files',
      getClip(compose)
    );
  });

  it('chatbox no text, attachments with success uploaded files deserialize and serialize', async () => {
    const initialValue = getInitialValue(null, getValidAttachments());
    const composeValue = getComposeValue(initialValue);

    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
      value: composeValue
    });
    // deserialize
    expect(compose.currentText).to.equal('');
    expect(compose.currentAttachments).to.deep.equal(getValidAttachments());
    // serialize
    expect(compose.value).to.equal(composeValue);
  });

  it('chatbox no text, attachments with failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true
    });
    await updateComponent(compose, null, null, getInvalidAttachments());
    await assertScreenshot(
      'compose/chatbox-no-text-attachments-with-failure-files',
      getClip(compose)
    );
  });

  it('chatbox no text, attachments with success and failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true
    });
    await updateComponent(
      compose,
      null,
      getValidAttachments(),
      getInvalidAttachments()
    );
    await assertScreenshot(
      'compose/chatbox-no-text-attachments-with-all-files',
      getClip(compose)
    );
  });

  it('chatbox no text, attachments with success uploaded files, and click send', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true
    });
    await updateComponent(compose, null, getValidAttachments());
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
      button: true
    });
    await updateComponent(
      compose,
      null,
      getValidAttachments(),
      getInvalidAttachments()
    );
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
      button: true
    });
    await updateComponent(compose, getValidText(), getValidAttachments());
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-success-files',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments with success uploaded files deserialize and serialize', async () => {
    const initialValue = getInitialValue(getValidText(), getValidAttachments());
    const composeValue = getComposeValue(initialValue);

    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true,
      value: composeValue
    });
    // deserialize
    expect(compose.currentText).to.equal(getValidText());
    expect(compose.currentAttachments).to.deep.equal(getValidAttachments());
    // serialize
    expect(compose.value).to.equal(composeValue);
  });

  it('chatbox with text, attachments with failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true
    });
    await updateComponent(
      compose,
      getValidText(),
      null,
      getInvalidAttachments()
    );
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-failure-files',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments with success and failure uploaded files', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true
    });
    await updateComponent(
      compose,
      getValidText(),
      getValidAttachments(),
      getInvalidAttachments()
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
      button: true
    });
    await updateComponent(compose, getValidText(), getValidAttachments());
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
      button: true
    });
    await updateComponent(
      compose,
      getValidText(),
      getValidAttachments(),
      getInvalidAttachments()
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
      button: true
    });
    await updateComponent(compose, getValidText(), getValidAttachments());
    const chatbox = compose.shadowRoot.querySelector('.chatbox') as HTMLElement;
    chatbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-success-files-and-hit-enter',
      getClip(compose)
    );
  });

  it('chatbox with text, attachments with success and failure uploaded files, and hit enter', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      attachments: true,
      button: true
    });
    await updateComponent(
      compose,
      getValidText(),
      getValidAttachments(),
      getInvalidAttachments()
    );
    const chatbox = compose.shadowRoot.querySelector(
      '.chatbox'
    ) as HTMLInputElement;
    chatbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const newClip = getClip(compose);
    await assertScreenshot(
      'compose/chatbox-with-text-attachments-with-all-files-and-hit-enter',
      newClip
    );
  });
});
