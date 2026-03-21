import '../temba-modules';
import { fixture, html, expect } from '@open-wc/testing';

describe('temba-rich-edit', () => {
  it('emits input when selecting a completion option', async () => {
    const editor = (await fixture(html`
      <temba-rich-edit
        value="@con"
        session
      ></temba-rich-edit>
    `)) as any;

    await editor.updateComplete;

    const editableDiv = editor.shadowRoot.querySelector(
      '.highlight-editor'
    ) as any;
    const options = editor.shadowRoot.querySelector('temba-options') as any;

    // Place caret at end so completion replacement applies to the query.
    editableDiv.focus();
    editableDiv.setSelectionRange(4, 4);
    editor.query = 'con';

    let inputEvents = 0;
    let changeEvents = 0;
    editor.addEventListener('input', () => {
      inputEvents += 1;
    });
    editor.addEventListener('change', () => {
      changeEvents += 1;
    });

    options.dispatchEvent(
      new CustomEvent('temba-selection', {
        detail: {
          selected: { name: 'contact.name' },
          tabbed: false
        },
        bubbles: true,
        composed: true
      })
    );

    expect(editor.value).to.equal('@contact.name');
    expect(inputEvents).to.equal(1);
    expect(changeEvents).to.equal(1);
  });

  it('emits input when selecting completion via keyboard', async () => {
    const editor = (await fixture(html`
      <temba-rich-edit
        value="@con"
        session
      ></temba-rich-edit>
    `)) as any;

    await editor.updateComplete;

    const editableDiv = editor.shadowRoot.querySelector(
      '.highlight-editor'
    ) as any;
    editor.query = 'con';
    editor.options = [{ name: 'contact.name' }];
    await editor.updateComplete;

    editableDiv.focus();
    editableDiv.setSelectionRange(4, 4);

    let inputEvents = 0;
    editor.addEventListener('input', () => {
      inputEvents += 1;
    });

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true
      })
    );

    expect(editor.value).to.equal('@contact.name');
    expect(inputEvents).to.equal(1);
  });
});
