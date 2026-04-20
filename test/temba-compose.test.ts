import { assert, expect } from '@open-wc/testing';
import { Compose } from '../src/form/Compose';
import {
  assertScreenshot,
  getClip,
  getComponent,
  getValidAttachments,
  getValidText,
  updateComponent
} from './utils.test';
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

  it('keeps template variable session completion disabled by default', async () => {
    const compose: Compose = await getCompose({
      templates: true
    });

    const templateEditor = compose.shadowRoot.querySelector(
      'temba-template-editor'
    ) as HTMLElement;
    expect(templateEditor).to.not.be.null;
    expect(templateEditor.hasAttribute('session')).to.be.false;
  });

  it('enables template variable session completion with template-session attribute', async () => {
    const compose: Compose = await getCompose({
      templates: true,
      'template-session': true
    });

    const templateEditor = compose.shadowRoot.querySelector(
      'temba-template-editor'
    ) as HTMLElement;
    expect(templateEditor).to.not.be.null;
    expect(templateEditor.hasAttribute('session')).to.be.true;
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

describe('temba-compose broadcast edit', () => {
  it('initializes with languages and value like Django', async () => {
    // Simulate Django broadcast edit: value keyed by language iso
    const langValue = {
      eng: {
        text: 'Hello from broadcast',
        attachments: [],
        quick_replies: ['Yes', 'No'],
        optin: null,
        template: null,
        variables: []
      }
    };
    const languages = JSON.stringify([{ iso: 'eng', name: 'English' }]);

    const compose: Compose = await getCompose({
      counter: true,
      attachments: true,
      completion: true,
      quickreplies: true,
      optins: true,
      templates: true,
      maxlength: 4096,
      languages: languages,
      value: JSON.stringify(langValue)
    });

    // Verify the compose initialized correctly
    expect(compose.currentLanguage).to.equal('eng');
    expect(compose.currentText).to.equal('Hello from broadcast');
    expect(compose.currentQuickReplies).to.have.length(2);

    // Verify the message editor exists in shadow DOM and has content
    const editor = compose.shadowRoot.querySelector('temba-message-editor');
    expect(editor).to.not.be.null;
    expect((editor as any).value).to.equal('Hello from broadcast');

    // Verify accordion sections are rendered
    const accordion = compose.shadowRoot.querySelector('temba-accordion');
    expect(accordion).to.not.be.null;
  });

  it('initializes with template value missing attachments and quick_replies', async () => {
    // Django may omit attachments/quick_replies when a template is set
    const langValue = {
      eng: {
        text: 'Hello',
        template: 'd6a73193-c31e-4943-bd2d-edf920fb82eb',
        variables: ['world']
      }
    };
    const languages = JSON.stringify([
      { iso: 'eng', name: 'English' },
      { iso: 'spa', name: 'Spanish' }
    ]);

    const compose: Compose = await getCompose({
      counter: true,
      attachments: true,
      completion: true,
      quickreplies: true,
      optins: true,
      templates: true,
      maxlength: 4096,
      languages: languages,
      value: JSON.stringify(langValue)
    });

    expect(compose.currentLanguage).to.equal('eng');
    expect(compose.currentText).to.equal('Hello');
    expect(compose.currentAttachments).to.deep.equal([]);
    expect(compose.currentQuickReplies).to.deep.equal([]);

    // Verify the shadow DOM rendered (not empty)
    const editor = compose.shadowRoot.querySelector('temba-message-editor');
    expect(editor).to.not.be.null;
  });
});
