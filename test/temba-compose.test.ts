import { assert, expect, fixture } from '@open-wc/testing';
import { Attachment, Compose } from '../src/compose/Compose';
import { assertScreenshot, getClip, getComponent } from './utils.test';
import { CustomEventType } from '../src/interfaces';
import { Button } from '../src/button/Button';
import { Completion } from '../src/completion/Completion';

// interface MockFile {
//   name: string;
//   body: string;
//   mimeType: string;
// }

// interface iBlob extends Blob, File {
//   name: string;
//   lastModifiedDate: Date;
//   lastModified: number;
//   webkitRelativePathts: string;
// }

// const createFileFromMockFile = (file: MockFile): File => {
//   const blob: Partial<iBlob> = new Blob([file.body], { type: file.mimeType });
//   blob.lastModifiedDate = new Date();
//   blob.name = file.name;
//   blob.lastModified = Date.now();
//   return blob as File;
// };

// const createMockFileList = (files: MockFile[]) => {
//   const fileList: FileList = {
//       length: files.length,
//       item(index: number): File {
//           return fileList[index];
//       }
//   };
//   files.forEach((file, index) => fileList[index] = createFileFromMockFile(file));

//   return fileList;
// };

const TAG = 'temba-compose';

const getCompose = async (attrs: any = {}, width = 500) => {
  const compose = (await getComponent(
    TAG,
    attrs,
    '',
    width,
    0,
    'display:inline-block'
  )) as Compose;
  return compose;
};

const upload_endpoint = '/msgmedia/upload/';

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

  //todo fix this test - send button should be enabled (works in demo)
  it('chatbox with text', async () => {
    const compose: Compose = await getCompose({
      chatbox: true,
      counter: true,
      button: true,
    });

    compose.currentChat = 'sà-wàd-dee!';
    compose.requestUpdate('buttonDisabled');
    await compose.updateComplete;

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
  //todo fix this test - send button should be enabled (works in demo)
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

    // todo
    const dataTransfer = new DataTransfer();
    const aFileParts = ['<a id="a"><b id="b">hey!</b></a>'];
    dataTransfer.items.add(
      new File([new Blob(aFileParts, { type: 'text/html' })], 'test.txt')
    );
    const fileList = dataTransfer.files;
    console.log('fileList', fileList);
    [...fileList].map(file => {
      console.log('file', file);
      console.log(file.name);
      console.log(file.size);
      console.log(file.type);
      console.log(file.lastModified);
      console.log(file.webkitRelativePath);
    });
    // compose.uploadFiles(fileList);

    // todo
    // const fileList = new FileList()
    // todo compose.uploadFiles(fileList)

    const s1 = 's1';
    const success1 = {
      uuid: s1, //file.uuid,
      content_type: 'image/png', //file.type,
      type: 'image/png', //file.type,
      name: 'success_name_' + s1, //file.name,
      url: 'success_url_' + s1, //file.name,
      size: 1024, //file.size,
      error: null,
    } as Attachment;

    const s2 = 's2';
    const success2 = {
      uuid: s2, //file.uuid,
      content_type: 'image/jpeg', //file.type,
      type: 'image/jpeg', //file.type,
      name: 'success_name_' + s2, //file.name,
      url: 'success_url_' + s2, //file.name,
      size: 1024, //file.size,
      error: null,
    } as Attachment;

    compose.values = [success1, success2];

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

    // todo
    // const fileList = new FileList()
    // todo compose.uploadFiles(fileList)

    const f1 = 'f1';
    const fail1 = {
      uuid: f1, //file.uuid,
      content_type: 'image/png', //file.type,
      type: 'image/png', //file.type,
      name: 'fail_name_' + f1, //file.name,
      url: 'fail_url_' + f1, //file.name,
      size: 26624, //file.size,
      error: 'Limit for file uploads is 25.0 MB',
    } as Attachment;
    const f2 = 'f2';
    const fail2 = {
      uuid: f2, //file.uuid,
      content_type: 'application/octet-stream', //file.type,
      type: 'application/json', //file.type,
      name: 'fail_name_' + f2, //file.name,
      url: 'fail_url_' + f2, //file.name,
      size: 1024, //file.size,
      error: 'Unsupported file type',
    } as Attachment;
    compose.errorValues = [fail1, fail2];

    await assertScreenshot(
      'compose/attachments-with-failure-files',
      getClip(compose)
    );
  });

  // it('attachments with no duplicate uploaded files', async () => {
  //   // todo compose.uploadFiles(fileList1)
  //   // todo compose.uploadFiles(fileList2)
  // });

  // it('attachments with a mix of success and failure uploaded files', async () => {
  //   // todo
  // });

  // it('attachments with success uploaded files and click send', async () => {
  //   // todo
  // });

  // it('attachments with fail uploaded files and click send', async () => {
  //   // todo
  // });
});

// todo attachments:
// todo manual upload
// todo drag and drop upload

// todo contactchat:
// handleSend success responses
// handleSend fail responses
