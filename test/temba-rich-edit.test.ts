import '../temba-modules';
import { fixture, html, expect } from '@open-wc/testing';

describe('temba-rich-edit', () => {
  it('emits input when selecting a completion option', async () => {
    const editor = (await fixture(html`
      <temba-rich-edit value="@con" session></temba-rich-edit>
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
      <temba-rich-edit value="@con" session></temba-rich-edit>
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

    editableDiv.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        composed: true
      })
    );

    expect(editor.value).to.equal('@contact.name');
    expect(inputEvents).to.equal(1);
  });

  it('undoes completion back to pre-completion value', async () => {
    const editor = (await fixture(html`
      <temba-rich-edit value="@co" session></temba-rich-edit>
    `)) as any;

    await editor.updateComplete;

    const editableDiv = editor.shadowRoot.querySelector(
      '.highlight-editor'
    ) as any;
    const options = editor.shadowRoot.querySelector('temba-options') as any;

    // Type one character so undo history contains "@co".
    editableDiv.focus();
    editableDiv.setSelectionRange(3, 3);
    editableDiv.textContent = '@con';
    editableDiv.dispatchEvent(new Event('input', { bubbles: true }));
    await editor.updateComplete;
    expect(editor.value).to.equal('@con');

    editor.query = 'con';
    editableDiv.setSelectionRange(4, 4);
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

    // Undo should return to "@con" (state immediately before completion),
    // not to the earlier "@co" typing state.
    editor.performUndo();
    expect(editor.value).to.equal('@con');
  });

  it('does not consume arrow keys in another editor when a sibling has options open', async () => {
    const wrapper = (await fixture(html`
      <div>
        <temba-rich-edit
          id="popup"
          value="@con"
          textarea
          session
        ></temba-rich-edit>
        <temba-rich-edit
          id="active"
          value="line one${'\n'}line two${'\n'}line three"
          textarea
        ></temba-rich-edit>
      </div>
    `)) as HTMLElement;

    const popup = wrapper.querySelector('#popup') as any;
    const active = wrapper.querySelector('#active') as any;
    await popup.updateComplete;
    await active.updateComplete;

    popup.options = [{ name: 'contact.name' }, { name: 'contact.uuid' }];
    await popup.updateComplete;

    const activeDiv = active.shadowRoot.querySelector(
      '.highlight-editor'
    ) as HTMLDivElement;
    activeDiv.focus();
    (activeDiv as any).setSelectionRange(0, 0);

    const evt = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      composed: true,
      cancelable: true
    });
    activeDiv.dispatchEvent(evt);
    await active.updateComplete;

    expect(evt.defaultPrevented).to.equal(false);
  });

  it('still consumes arrow keys when the same editor has options open', async () => {
    const editor = (await fixture(html`
      <temba-rich-edit value="@con" textarea session></temba-rich-edit>
    `)) as any;
    editor.options = [{ name: 'contact.name' }, { name: 'contact.uuid' }];
    await editor.updateComplete;

    const editableDiv = editor.shadowRoot.querySelector(
      '.highlight-editor'
    ) as HTMLDivElement;
    editableDiv.focus();

    const evt = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      composed: true,
      cancelable: true
    });
    editableDiv.dispatchEvent(evt);
    await editor.updateComplete;

    expect(evt.defaultPrevented).to.equal(true);
  });
});
