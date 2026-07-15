import { expect, fixture, waitUntil } from '@open-wc/testing';
import { html } from 'lit';
import { ContactNotepad } from '../src/live/ContactNotepad';
import { getComponent, loadStore, mockGET } from './utils.test';

const TAG = 'temba-contact-notepad';

const getNotepad = async (attrs: any = {}) => {
  const notepad = (await getComponent(TAG, attrs, '', 400)) as ContactNotepad;
  await waitUntil(() => !!notepad.data);
  await notepad.updateComplete;
  return notepad;
};

describe('temba-contact-notepad', () => {
  beforeEach(() => {
    mockGET(
      /\/api\/v2\/contacts\.json\?uuid=notepad-contact/,
      '/test-assets/contacts/contact-notepad.json'
    );
  });

  it('hugs the note text in autogrow mode', async () => {
    await loadStore();
    const notepad = await getNotepad({
      contact: 'notepad-contact',
      autogrow: true
    });

    const textarea = notepad.shadowRoot.querySelector(
      '.notepad'
    ) as HTMLTextAreaElement;

    // autosized to the content — no leftover empty height
    await waitUntil(
      () => Math.abs(textarea.clientHeight - textarea.scrollHeight) <= 2
    );

    // a one-line note stays a one-line notepad
    expect(textarea.clientHeight).to.be.lessThan(80);

    // growing the note grows the textarea to match
    const before = textarea.clientHeight;
    textarea.value = 'line\n'.repeat(10);
    textarea.dispatchEvent(new Event('input'));
    await notepad.updateComplete;

    await waitUntil(() => textarea.clientHeight > before + 50);
    expect(
      Math.abs(textarea.clientHeight - textarea.scrollHeight)
    ).to.be.lessThanOrEqual(2);
  });

  it('fills a bounded pane without overflowing it', async () => {
    // tab-mode arrangement: a plain bleed card of fixed height with the
    // notepad inside — the note surface fills the pane, toolbar at the
    // bottom, and nothing scrolls
    await loadStore();

    const parentNode = document.createElement('div');
    parentNode.setAttribute(
      'style',
      'width: 400px; height: 300px; display: flex;'
    );
    const card = (await fixture(
      html`
        <temba-card plain bleed>
          <temba-contact-notepad contact="notepad-contact" autogrow>
          </temba-contact-notepad>
        </temba-card>
      `,
      { parentNode }
    )) as HTMLElement;

    const notepad = card.querySelector(
      'temba-contact-notepad'
    ) as ContactNotepad;
    await waitUntil(() => !!notepad.data);
    await notepad.updateComplete;

    const content = card.shadowRoot.querySelector('.content') as HTMLElement;
    const toolbar = notepad.shadowRoot.querySelector('.toolbar') as HTMLElement;

    // give the resize-driven autosize a beat, then check for overflow
    await waitUntil(
      () => content.scrollHeight <= content.clientHeight + 1,
      'tab pane overflowed'
    );

    // the toolbar sits at the bottom of the pane
    const cardRect = card.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    expect(Math.abs(cardRect.bottom - toolbarRect.bottom)).to.be.lessThan(4);
  });

  it('re-autosizes when its width changes', async () => {
    await loadStore();
    const notepad = await getNotepad({
      contact: 'notepad-contact',
      autogrow: true
    });

    const textarea = notepad.shadowRoot.querySelector(
      '.notepad'
    ) as HTMLTextAreaElement;

    // a single long line that wraps more as the notepad narrows
    textarea.value = 'wrap '.repeat(60);
    textarea.dispatchEvent(new Event('input'));
    await waitUntil(
      () => Math.abs(textarea.clientHeight - textarea.scrollHeight) <= 2
    );
    const wideHeight = textarea.clientHeight;

    // squeeze the notepad — the text rewraps and needs more height
    (notepad.parentElement as HTMLElement).style.width = '200px';
    await waitUntil(() => textarea.clientHeight > wideHeight + 20);
    expect(
      Math.abs(textarea.clientHeight - textarea.scrollHeight)
    ).to.be.lessThanOrEqual(2);
  });
});
