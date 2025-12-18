import { fixture, assert, expect } from '@open-wc/testing';
import { MessageEditor } from '../src/form/MessageEditor';
import { assertScreenshot, getClip, getComponent } from './utils.test';

export const getHTML = (options: any = {}) => {
  const attrs = Object.keys(options)
    .map((key) => `${key}="${options[key]}"`)
    .join(' ');
  return `<temba-message-editor ${attrs}></temba-message-editor>`;
};

describe('temba-message-editor', () => {
  it('can be created', async () => {
    const editor: MessageEditor = await fixture(getHTML());
    assert.instanceOf(editor, MessageEditor);
  });

  it('has default properties', async () => {
    const editor = (await getComponent(
      'temba-message-editor'
    )) as MessageEditor;

    expect(editor.name).to.equal('');
    expect(editor.value).to.equal('');
    expect(editor.placeholder).to.equal('');
    expect(editor.textarea).to.be.true;
    expect(editor.autogrow).to.be.true;
    expect(editor.minHeight).to.equal(60);
    expect(editor.attachments).to.deep.equal([]);
    expect(editor.maxAttachments).to.equal(3);

    await assertScreenshot(
      'message-editor/default',
      getClip(editor as HTMLElement)
    );
  });

  it('can set properties', async () => {
    const editor = (await getComponent('temba-message-editor', {
      name: 'message',
      value: 'Hello world',
      placeholder: 'Type your message...',
      'max-attachments': '5'
    })) as MessageEditor;

    expect(editor.name).to.equal('message');
    expect(editor.value).to.equal('Hello world');
    expect(editor.placeholder).to.equal('Type your message...');
    expect(editor.maxAttachments).to.equal(5);

    await assertScreenshot(
      'message-editor/with-properties',
      getClip(editor as HTMLElement)
    );
  });

  it('renders completion component', async () => {
    const editor = (await getComponent('temba-message-editor', {
      value: 'Test message',
      placeholder: 'Enter message'
    })) as MessageEditor;

    const completion = editor.shadowRoot.querySelector(
      'temba-completion'
    ) as any;
    expect(completion).to.not.be.null;
    expect(completion.hasAttribute('widgetOnly')).to.be.true;

    await assertScreenshot(
      'message-editor/with-completion',
      getClip(editor as HTMLElement)
    );
  });

  it('filters runtime attachments', async () => {
    const attachments = [
      'image/jpeg:http://example.com/image.jpg',
      'image:@fields.profile_pic',
      'video:@fields.intro_video',
      'application/pdf:http://example.com/doc.pdf'
    ];

    const editor = (await getComponent('temba-message-editor', {
      attachments: JSON.stringify(attachments)
    })) as MessageEditor;

    // Wait for component to update
    await editor.updateComplete;

    const mediaPicker = editor.shadowRoot.querySelector(
      'temba-media-picker'
    ) as any;
    expect(mediaPicker).to.not.be.null;

    // Should only have the static attachments (those with '/' in content type)
    expect(mediaPicker.attachments.length).to.equal(2);
    expect(mediaPicker.attachments[0].content_type).to.equal('image/jpeg');
    expect(mediaPicker.attachments[1].content_type).to.equal('application/pdf');

    await assertScreenshot(
      'message-editor/filtered-attachments',
      getClip(editor as HTMLElement)
    );
  });

  it('handles completion change events', async () => {
    const editor = (await getComponent(
      'temba-message-editor'
    )) as MessageEditor;
    let changeEvent: CustomEvent = null;

    editor.addEventListener('change', (e: CustomEvent) => {
      changeEvent = e;
    });

    const completion = editor.shadowRoot.querySelector(
      'temba-completion'
    ) as any;
    completion.value = 'New message';
    completion.dispatchEvent(new Event('change'));

    expect(editor.value).to.equal('New message');
    expect(changeEvent).to.not.be.null;
  });

  it('handles media picker change events', async () => {
    const editor = (await getComponent(
      'temba-message-editor'
    )) as MessageEditor;
    let changeEvent: CustomEvent = null;

    editor.addEventListener('change', (e: CustomEvent) => {
      changeEvent = e;
    });

    const mediaPicker = editor.shadowRoot.querySelector(
      'temba-media-picker'
    ) as any;
    mediaPicker.attachments = [
      {
        content_type: 'image/jpeg',
        url: 'http://example.com/test.jpg',
        filename: 'test.jpg',
        size: 1024
      }
    ];
    mediaPicker.dispatchEvent(new Event('change'));

    expect(editor.attachments).to.include(
      'image/jpeg:http://example.com/test.jpg'
    );
    expect(changeEvent).to.not.be.null;
  });

  it('preserves runtime attachments when media changes', async () => {
    const initialAttachments = [
      'image:@fields.profile_pic',
      'image/jpeg:http://example.com/existing.jpg'
    ];

    const editor = (await getComponent('temba-message-editor', {
      attachments: JSON.stringify(initialAttachments)
    })) as MessageEditor;

    await editor.updateComplete;

    // Simulate media picker change
    const mediaPicker = editor.shadowRoot.querySelector(
      'temba-media-picker'
    ) as any;
    mediaPicker.attachments = [
      {
        content_type: 'image/png',
        url: 'http://example.com/new.png',
        filename: 'new.png',
        size: 2048
      }
    ];
    mediaPicker.dispatchEvent(new Event('change'));

    // Should preserve runtime attachments and add new static ones
    expect(editor.attachments).to.include('image:@fields.profile_pic');
    expect(editor.attachments).to.include(
      'image/png:http://example.com/new.png'
    );
    expect(editor.attachments.length).to.equal(2);
  });

  it('supports drag and drop highlighting', async () => {
    const editor = (await getComponent(
      'temba-message-editor'
    )) as MessageEditor;
    const container = editor.shadowRoot.querySelector(
      '.message-editor-container'
    );

    // Simulate drag enter
    const dragEvent = new DragEvent('dragenter', {
      bubbles: true,
      dataTransfer: new DataTransfer()
    });
    container.dispatchEvent(dragEvent);

    // Wait for the update
    await editor.updateComplete;

    expect(editor.pendingDrop).to.be.true;
    expect(container.classList.contains('highlight')).to.be.true;

    await assertScreenshot(
      'message-editor/drag-highlight',
      getClip(editor as HTMLElement)
    );

    // Simulate drag leave
    const dragLeaveEvent = new DragEvent('dragleave', {
      bubbles: true,
      dataTransfer: new DataTransfer()
    });
    container.dispatchEvent(dragLeaveEvent);

    expect(editor.pendingDrop).to.be.false;
  });

  it('focuses completion on focus', async () => {
    const editor = (await getComponent(
      'temba-message-editor'
    )) as MessageEditor;
    const completion = editor.shadowRoot.querySelector(
      'temba-completion'
    ) as any;

    let focusCalled = false;
    completion.focus = () => {
      focusCalled = true;
    };

    editor.focus();
    expect(focusCalled).to.be.true;
  });

  it('clicks completion on click', async () => {
    const editor = (await getComponent(
      'temba-message-editor'
    )) as MessageEditor;
    const completion = editor.shadowRoot.querySelector(
      'temba-completion'
    ) as any;

    let clickCalled = false;
    completion.click = () => {
      clickCalled = true;
    };

    editor.click();
    expect(clickCalled).to.be.true;
  });

  it('initializes with correct height for long text content', async () => {
    const longText =
      'This is a very long text that should span multiple lines and cause the autogrow functionality to kick in and expand the textarea to accommodate all the content. This text should be long enough to trigger the autogrow behavior during initialization.';

    const editor = (await getComponent('temba-message-editor', {
      value: longText,
      'min-height': '60'
    })) as MessageEditor;

    // Wait for component to fully render
    await editor.updateComplete;

    // Get the text input element to verify its height
    const completion = editor.shadowRoot.querySelector(
      'temba-completion'
    ) as any;
    expect(completion).to.not.be.null;

    // The completion should have the long text value
    expect(completion.value).to.equal(longText);

    // Get the actual TextInput component inside the completion
    const textInput = completion.getTextInput();
    expect(textInput).to.not.be.null;

    // The textarea should be in autogrow mode
    expect(textInput.autogrow).to.be.true;
    expect(textInput.textarea).to.be.true;

    // Check that the autogrow div has been updated with content
    const autogrowDiv = textInput.shadowRoot.querySelector(
      '.grow-wrap > div'
    ) as HTMLDivElement;
    expect(autogrowDiv).to.not.be.null;
    expect(autogrowDiv.innerText).to.include(longText);

    await assertScreenshot(
      'message-editor/autogrow-initial-content',
      getClip(editor as HTMLElement)
    );
  });

  it('passes rtl property to underlying completion', async () => {
    const editor = (await getComponent('temba-message-editor', {
      value: 'مرحبا بك في نظامنا',
      rtl: true
    })) as MessageEditor;

    await editor.updateComplete;

    const completion = editor.shadowRoot.querySelector('temba-completion');
    expect(completion).to.exist;
    expect(completion.hasAttribute('rtl')).to.be.true;

    await assertScreenshot(
      'message-editor/rtl',
      getClip(editor as HTMLElement)
    );
  });

  it('does not pass rtl when property is false', async () => {
    const editor = (await getComponent('temba-message-editor', {
      value: 'Hello world'
    })) as MessageEditor;

    await editor.updateComplete;

    const completion = editor.shadowRoot.querySelector('temba-completion');
    expect(completion).to.exist;
    expect(completion.hasAttribute('rtl')).to.be.false;
  });
});
