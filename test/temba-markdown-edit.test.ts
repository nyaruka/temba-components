import { fixture, assert, expect } from '@open-wc/testing';
import { MarkdownEditor } from '../src/form/MarkdownEditor';
import {
  blockOf,
  joinBlocks,
  renderBlock,
  splitBlocks
} from '../src/form/MarkdownDocument';
import {
  assertScreenshot,
  clearMockPosts,
  getClip,
  getComponent,
  mockPOST,
  mouseClickElement,
  waitForImages
} from './utils.test';

const TAG = 'temba-markdown-edit';
const UPLOAD = '/msgmedia/upload/';

const getEditor = async (
  value = '',
  minHeight = 0
): Promise<MarkdownEditor> => {
  const editor = (await fixture(
    `<${TAG} widget_only endpoint="${UPLOAD}"></${TAG}>`
  )) as MarkdownEditor;

  editor.minHeight = minHeight;
  editor.value = value;
  await editor.updateComplete;
  return editor;
};

const doc = (editor: MarkdownEditor): HTMLElement => editor.doc;

/** the document's top level blocks, which are the rendered article itself */
const blocks = (editor: MarkdownEditor): HTMLElement[] =>
  [...editor.doc.children] as HTMLElement[];

const selectionOf = (editor: MarkdownEditor): Selection => {
  const root = editor.shadowRoot as any;
  return root.getSelection ? root.getSelection() : document.getSelection();
};

/** puts the caret in a block at an offset into its text, the way clicking there would */
const caretIn = async (
  editor: MarkdownEditor,
  index: number,
  offset: number
): Promise<void> => {
  const block = blocks(editor)[index];
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const range = document.createRange();

  let seen = 0;
  let node: Text;
  let placed = false;

  while ((node = walker.nextNode() as Text)) {
    if (seen + node.length >= offset) {
      range.setStart(node, offset - seen);
      placed = true;
      break;
    }
    seen += node.length;
  }

  if (!placed) {
    range.selectNodeContents(block);
    range.collapse(false);
  }

  range.collapse(true);

  doc(editor).focus();
  const selection = selectionOf(editor);
  selection.removeAllRanges();
  selection.addRange(range);

  // selectionchange is a task of its own, and it's what tells the toolbar and the link bar where the caret went
  await new Promise((resolve) => setTimeout(resolve, 0));
  await editor.updateComplete;
};

/** selects from one place in the document to another, across blocks if asked */
const selectAcross = async (
  editor: MarkdownEditor,
  from: [number, number],
  to: [number, number]
): Promise<void> => {
  await caretIn(editor, from[0], from[1]);
  const start = selectionOf(editor).getRangeAt(0);

  await caretIn(editor, to[0], to[1]);
  const end = selectionOf(editor).getRangeAt(0);

  const range = document.createRange();
  range.setStart(start.startContainer, start.startOffset);
  range.setEnd(end.startContainer, end.startOffset);

  const selection = selectionOf(editor);
  selection.removeAllRanges();
  selection.addRange(range);
};

const selectAll = async (editor: MarkdownEditor): Promise<void> => {
  doc(editor).focus();
  const range = document.createRange();
  range.selectNodeContents(doc(editor));
  const selection = selectionOf(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  await editor.updateComplete;
};

const toolbar = async (
  editor: MarkdownEditor,
  label: string
): Promise<void> => {
  const button = [
    ...editor.shadowRoot.querySelectorAll('.toolbar .format')
  ].find((ele) => ele.textContent.trim() === label) as HTMLElement;

  button.click();

  // formatting puts the caret back in the document when nothing is focused, so let that settle before looking
  await new Promise((resolve) => setTimeout(resolve, 0));
  await editor.updateComplete;
};

const uploadFile = (name = 'shot.png'): File =>
  new File(['shot'], name, { type: 'image/png' });

/** everything the author can see in the document */
const shown = (editor: MarkdownEditor): string => doc(editor).textContent;

describe('splitBlocks', () => {
  const roundTrips = (markdown: string) => {
    assert.equal(joinBlocks(splitBlocks(markdown)), markdown);
  };

  it('splits on blank lines', () => {
    const blocks = splitBlocks('# Title\n\nA paragraph.');
    assert.deepEqual(
      blocks.map((block) => block.source),
      ['# Title', 'A paragraph.']
    );
  });

  it('keeps a fenced block whole', () => {
    const blocks = splitBlocks('intro\n\n```\none\n\ntwo\n```\n\nafter');
    assert.deepEqual(
      blocks.map((block) => block.source),
      ['intro', '```\none\n\ntwo\n```', 'after']
    );
  });

  it('does not close a fence on an info string inside it', () => {
    const blocks = splitBlocks(
      '```\n```js is how you tag one\n\nstill code\n```'
    );
    assert.equal(blocks.length, 1);
  });

  it('keeps a loose list whole', () => {
    const blocks = splitBlocks('* one\n\n* two\n\n* three');
    assert.equal(blocks.length, 1);
  });

  it('keeps a list item with more than one paragraph whole', () => {
    assert.equal(
      splitBlocks('1. one\n\n   more about one\n\n2. two').length,
      1
    );
  });

  it('keeps a blockquote whole across blank lines', () => {
    assert.equal(splitBlocks('> one\n\n> two').length, 1);
  });

  it('always has somewhere to type', () => {
    assert.deepEqual(splitBlocks(''), [{ source: '', trailer: '' }]);
  });

  it('round trips byte for byte', () => {
    roundTrips('');
    roundTrips('one');
    roundTrips('one\n');
    roundTrips('one\n\n\n\ntwo');
    roundTrips('\n\nleading blanks\n\nand more');
    roundTrips(
      '# Title\n\nBody\n\n* a\n* b\n\n```js\nlet x = 1;\n\nlet y = 2;\n```\n\n'
    );
    roundTrips('trailing space   \n\nand\ttabs\n');
  });
});

describe('blockOf', () => {
  /** renders markdown and reads the rendered elements straight back */
  const trip = (source: string): string => {
    const host = document.createElement('div');
    host.innerHTML = renderBlock(source);
    return [...host.children].map(blockOf).join('\n\n');
  };

  it('writes rendered blocks back as the markdown they came from', () => {
    // everything an article actually uses comes back as itself, so editing one block doesn't rewrite it
    for (const source of [
      '# Heading',
      '## Heading with **bold**',
      'A plain paragraph.',
      'Some **bold** and _em_ and `code` here.',
      'A [link](https://example.com) inline.',
      'A [titled](https://example.com "hover") link.',
      'An ![alt text](/a.png) image.',
      '* one\n* two',
      '* one\n\n* two',
      '1. one\n2. two',
      '> quoted **text**',
      '> one\n>\n> two',
      '```js\nlet x = 1;\n```',
      '```\nplain\n```',
      '---',
      'line one  \nline two',
      'line one\nline two',
      'snake_case_word stays'
    ]) {
      assert.equal(trip(source), source, `round trip of ${source}`);
    }
  });

  it('escapes text that would otherwise become markup', () => {
    // a paragraph that starts like a list has to still be a paragraph next time it is read
    for (const [source, expected] of [
      [
        'a literal * star and _ underscore',
        'a literal \\* star and \\_ underscore'
      ],
      ['1\\. not a list', '1\\. not a list'],
      ['\\- not a bullet', '\\- not a bullet'],
      ['\\# not a heading', '\\# not a heading'],
      ['text with `back``ticks` inside', 'text with ```back``ticks``` inside']
    ]) {
      assert.equal(trip(source), expected);
    }
  });

  it('keeps emphasis that touches a word renderable', () => {
    // an underscore doesn't open or close emphasis against a word character, so writing italics out that way would
    // silently unitalicize them the next time the markdown was rendered
    for (const source of [
      'word*star*word',
      'an *em*phasis inside',
      '*lead*word'
    ]) {
      const out = trip(source);
      assert.equal(out, source, `round trip of ${source}`);

      const host = document.createElement('div');
      host.innerHTML = renderBlock(out);
      assert.isOk(host.querySelector('em'), `italic lost in ${out}`);
    }
  });

  it('does not compound its escaping when written out again', () => {
    // an escape that markdown doesn't honour would be escaped again on the next save, growing a backslash each time
    for (const source of [
      '1\\. not a list',
      '\\- not a bullet',
      'a literal \\* star'
    ]) {
      assert.equal(trip(trip(source)), trip(source));
      assert.equal(renderBlock(trip(source)), renderBlock(source));
    }
  });
});

describe(TAG, () => {
  beforeEach(() => {
    clearMockPosts();
  });

  it('can be created', async () => {
    const editor = await getEditor();
    assert.instanceOf(editor, MarkdownEditor);
    assert.equal(editor.value, '');
  });

  it('renders the document rather than showing its source', async () => {
    const editor = await getEditor('# Hello\n\nSome *words*.');

    const children = blocks(editor);
    assert.equal(children.length, 2);
    assert.equal(children[0].tagName, 'H1');
    assert.equal(children[0].textContent, 'Hello');
    assert.isOk(children[1].querySelector('em'));

    // nothing anywhere is showing source
    assert.isNotOk(editor.textArea);
  });

  it('renders images inline', async () => {
    const editor = await getEditor(
      '![a shot](/test-assets/img/sim_image_c.jpg)'
    );
    const img = blocks(editor)[0].querySelector('img');
    assert.equal(img.getAttribute('src'), '/test-assets/img/sim_image_c.jpg');
    assert.equal(img.getAttribute('alt'), 'a shot');
  });

  it('escapes markup rather than running it', async () => {
    const editor = await getEditor('<img src=x onerror="alert(1)">');
    assert.isNotOk(blocks(editor)[0].querySelector('img'));
  });

  // ==========================================================
  // The thing the whole editor is for
  // ==========================================================

  describe('rich editing', () => {
    const ARTICLE = [
      '# Getting started',
      '',
      'Open the **Flows** tab and pick a [flow](https://example.com) to edit.',
      '',
      '* Add a node',
      '* Connect it up'
    ].join('\n');

    it('never shows markdown when the author clicks into it', async () => {
      const editor = await getEditor(ARTICLE);
      const before = shown(editor);

      for (const block of blocks(editor)) {
        await mouseClickElement(block);
        await editor.updateComplete;

        // no part of the document has turned into its source
        assert.isNotOk(
          editor.shadowRoot.querySelector('textarea'),
          'clicking opened a source view'
        );

        // and what is on screen is still the rendered article, character for character
        assert.equal(shown(editor), before);
      }

      // none of the markers that make up the markdown are anywhere on screen
      for (const marker of ['**', '# ', '](', '* Add']) {
        assert.notInclude(shown(editor), marker);
      }

      // the caret really is in the document rather than simply absent
      assert.isAbove(selectionOf(editor).rangeCount, 0);
    });

    it('never shows markdown while typing', async () => {
      const editor = await getEditor(ARTICLE);

      await caretIn(editor, 2, 0);
      await type('First: ');
      await editor.updateComplete;

      assert.isNotOk(editor.shadowRoot.querySelector('textarea'));
      assert.notInclude(shown(editor), '**');
      assert.notInclude(shown(editor), '](');
      assert.include(editor.value, 'Open the **Flows** tab');
    });

    it('types into the rendered text', async () => {
      const editor = await getEditor('# Hello\n\nSome words.');

      await caretIn(editor, 0, 5);
      await type(' there');
      await editor.updateComplete;

      // realtime - the value is current without the caret going anywhere
      assert.equal(editor.value, '# Hello there\n\nSome words.');
      assert.equal(blocks(editor)[0].tagName, 'H1');
    });

    it('leaves untouched blocks exactly as they were authored', async () => {
      // deliberately non-canonical markdown: setext heading, + bullets, __ emphasis, hard wrapped prose
      const original = [
        'Title',
        '=====',
        '',
        'Some __prose__ that is',
        'hard wrapped across lines.',
        '',
        '+ first',
        '+ second',
        '',
        'Last paragraph.'
      ].join('\n');

      const editor = await getEditor(original);
      assert.equal(blocks(editor).length, 4);

      await caretIn(editor, 3, 'Last paragraph.'.length);
      await type(' Edited.');
      await editor.updateComplete;

      // only the block that was touched is rewritten - everything else comes back byte for byte
      assert.equal(
        editor.value,
        original.replace('Last paragraph.', 'Last paragraph. Edited.')
      );
    });

    it('keeps italic that touches a word when its block is edited', async () => {
      const editor = await getEditor('an *em*phasis inside');

      await caretIn(editor, 0, 0);
      await type('X');
      await editor.updateComplete;

      assert.equal(editor.value, 'Xan *em*phasis inside');

      // and what was written out still renders as italic rather than as literal markers
      const host = document.createElement('div');
      host.innerHTML = renderBlock(editor.value);
      assert.isOk(host.querySelector('em'), `italic lost: ${editor.value}`);
    });

    it('splits a paragraph on enter', async () => {
      const editor = await getEditor('one two');

      await caretIn(editor, 0, 4);
      await pressKey('Enter', 1);
      await editor.updateComplete;

      assert.equal(editor.value, 'one\n\ntwo');
      assert.equal(blocks(editor).length, 2);
      assert.deepEqual(
        blocks(editor).map((block) => block.tagName),
        ['P', 'P']
      );
    });

    it('starts a paragraph when enter is pressed at the end of a heading', async () => {
      const editor = await getEditor('# Hello');

      await caretIn(editor, 0, 5);
      await pressKey('Enter', 1);
      await type('body');
      await editor.updateComplete;

      // the browser leaves a bare <div> here, which is not something the document is made of
      assert.equal(editor.value, '# Hello\n\nbody');
      assert.deepEqual(
        blocks(editor).map((block) => block.tagName),
        ['H1', 'P']
      );
    });

    it('merges a block into the one above on backspace', async () => {
      const editor = await getEditor('one\n\ntwo');

      await caretIn(editor, 1, 0);
      await pressKey('Backspace', 1);
      await editor.updateComplete;

      assert.equal(editor.value, 'onetwo');
      assert.equal(blocks(editor).length, 1);
    });

    it('adds a line to a fenced block rather than splitting it', async () => {
      const editor = await getEditor('```js\nlet x = 1;\n```');

      await caretIn(editor, 0, 'let x = 1;'.length);
      await pressKey('Enter', 1);
      await type('let y = 2;');
      await editor.updateComplete;

      // a fenced block is one block however many lines it has
      assert.equal(blocks(editor).length, 1);
      assert.equal(editor.value, '```js\nlet x = 1;\nlet y = 2;\n```');
    });

    it('deletes a selection that spans blocks', async () => {
      const editor = await getEditor('alpha\n\nbravo\n\ncharlie');

      await selectAcross(editor, [0, 2], [2, 3]);
      await pressKey('Backspace', 1);
      await editor.updateComplete;

      // the two ends join up, which is what selecting across blocks is for
      assert.equal(editor.value, 'alrlie');
      assert.equal(blocks(editor).length, 1);
    });

    it('empties the whole document on select all and delete', async () => {
      const editor = await getEditor('# Title\n\nbody\n\n* a\n* b');

      await selectAll(editor);
      await pressKey('Backspace', 1);
      await editor.updateComplete;

      assert.equal(editor.value, '');
      assert.equal(blocks(editor).length, 1);

      // an author who has just emptied the article is starting a paragraph, not another heading
      assert.equal(blocks(editor)[0].tagName, 'P');

      await type('fresh start');
      await editor.updateComplete;
      assert.equal(editor.value, 'fresh start');
    });

    it('replaces the whole document when select all is typed over', async () => {
      const editor = await getEditor('# Title\n\nbody');

      await selectAll(editor);
      await type('replaced');
      await editor.updateComplete;

      assert.equal(editor.value, 'replaced');
    });

    it('rebuilds the document when the value is set from outside', async () => {
      const editor = await getEditor('one');
      await caretIn(editor, 0, 0);

      editor.value = '# two\n\nthree';
      await editor.updateComplete;

      assert.equal(blocks(editor).length, 2);
      assert.equal(blocks(editor)[0].tagName, 'H1');
      assert.equal(blocks(editor)[0].textContent, 'two');
    });

    it('keeps content it cannot write back out from being edited', async () => {
      const table = '| a | b |\n| --- | --- |\n| 1 | 2 |';
      const editor = await getEditor(`intro\n\n${table}\n\nafter`);

      const kept = blocks(editor)[1];
      assert.isOk(kept.querySelector('table'), 'the table still renders');
      assert.equal(
        kept.getAttribute('contenteditable'),
        'false',
        'a table is not edited richly'
      );

      // editing around it leaves it exactly as it was authored
      await caretIn(editor, 2, 'after'.length);
      await type('!');
      await editor.updateComplete;

      assert.equal(editor.value, `intro\n\n${table}\n\nafter!`);
    });

    it('stays realtime on a long article', async () => {
      const article: string[] = [];
      for (let section = 0; section < 150; section++) {
        article.push(`## Section ${section}`);
        article.push(
          `Body for section ${section} with **bold** and a [link](https://example.com/${section}).`
        );
      }

      const editor = await getEditor(article.join('\n\n'));
      assert.equal(blocks(editor).length, 300);

      const target = blocks(editor)[299];
      const started = performance.now();

      for (let stroke = 0; stroke < 20; stroke++) {
        target.firstChild.textContent += 'x';
        doc(editor).dispatchEvent(
          new InputEvent('input', { inputType: 'insertText' })
        );
      }

      const each = (performance.now() - started) / 20;

      // a block that hasn't changed is recognized rather than re-serialized, so this stays flat as articles grow
      assert.isBelow(
        each,
        25,
        `a keystroke over 300 blocks took ${each.toFixed(2)}ms`
      );
      assert.include(editor.value, 'Section 149');
    });
  });

  // ==========================================================
  // Toolbar
  // ==========================================================

  describe('toolbar', () => {
    it('bolds the selection', async () => {
      const editor = await getEditor('# Title\n\nhello world');

      await selectAcross(editor, [1, 6], [1, 11]);
      await toolbar(editor, 'B');

      assert.equal(editor.value, '# Title\n\nhello **world**');
      // and what is on screen is the bold word, not the markers around it
      assert.equal(shown(editor), 'Titlehello world');
    });

    it('makes the block a heading and takes it back', async () => {
      const editor = await getEditor('hello world');

      await caretIn(editor, 0, 2);
      await toolbar(editor, 'H2');
      assert.equal(editor.value, '## hello world');
      assert.equal(blocks(editor)[0].tagName, 'H2');

      await caretIn(editor, 0, 2);
      await toolbar(editor, 'H2');
      assert.equal(editor.value, 'hello world');
      assert.equal(blocks(editor)[0].tagName, 'P');
    });

    it('makes a list', async () => {
      const editor = await getEditor('one');

      await caretIn(editor, 0, 1);
      await toolbar(editor, 'List');

      // the browser nests the list inside the block it was made from, which is not somewhere a list can live
      assert.equal(blocks(editor)[0].tagName, 'UL');
      assert.equal(editor.value, '* one');
    });

    it('makes a quote', async () => {
      const editor = await getEditor('one');

      await caretIn(editor, 0, 1);
      await toolbar(editor, 'Quote');

      assert.equal(blocks(editor)[0].tagName, 'BLOCKQUOTE');
      assert.equal(editor.value, '> one');
    });

    it('marks the selection as code', async () => {
      const editor = await getEditor('run npm install now');

      await selectAcross(editor, [0, 4], [0, 15]);
      await toolbar(editor, 'Code');

      assert.equal(editor.value, 'run `npm install` now');
      assert.isOk(blocks(editor)[0].querySelector('code'));
    });

    it('says what the caret is sitting in', async () => {
      const editor = await getEditor('## Heading\n\nplain');

      await caretIn(editor, 0, 3);
      const heading = editor.shadowRoot.querySelector('.format.h2');
      assert.include([...heading.classList], 'on');

      await caretIn(editor, 1, 2);
      assert.notInclude([...heading.classList], 'on');
    });

    it('writes into the document when nothing is focused', async () => {
      const editor = await getEditor('# Title\n\nlast');
      doc(editor).blur();

      await toolbar(editor, 'H2');

      // falls through to where the caret last was rather than doing nothing
      assert.equal(editor.value, '# Title\n\n## last');
    });

    it('toggles modes', async () => {
      const editor = await getEditor('# Hello');
      const toggle = editor.shadowRoot.querySelector('.toggle') as HTMLElement;

      toggle.click();
      await editor.updateComplete;
      assert.isTrue(editor.sourceMode);

      toggle.click();
      await editor.updateComplete;
      assert.isFalse(editor.sourceMode);
    });

    it('stays in reach while the article scrolls under it', async () => {
      // the scroller is outside the component, as the dialog's body is - sticky has to hold across the shadow boundary
      const scroller = (await fixture(`
        <div style="height: 150px; overflow-y: auto">
          <${TAG} widget_only endpoint="${UPLOAD}"></${TAG}>
        </div>
      `)) as HTMLElement;

      const editor = scroller.querySelector(TAG) as MarkdownEditor;
      editor.minHeight = 0;
      editor.value = new Array(40)
        .fill('A paragraph of the article.')
        .join('\n\n');
      await editor.updateComplete;

      const chrome = editor.shadowRoot.querySelector('.chrome') as HTMLElement;
      assert.equal(getComputedStyle(chrome).position, 'sticky');

      scroller.scrollTop = 300;
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // the article moved, and the controls held at the top of what moved it
      assert.isAbove(scroller.scrollTop, 0);
      assert.closeTo(
        chrome.getBoundingClientRect().top,
        scroller.getBoundingClientRect().top,
        1
      );

      // and the toolbar is opaque, so the article passes behind it rather than through it
      assert.notEqual(
        getComputedStyle(chrome).backgroundColor,
        'rgba(0, 0, 0, 0)'
      );
    });

    it('scrolls the article inside itself when it fills what holds it', async () => {
      const holder = (await fixture(`
        <div style="height: 200px; display: flex">
          <${TAG} widget_only fill endpoint="${UPLOAD}"></${TAG}>
        </div>
      `)) as HTMLElement;

      const editor = holder.querySelector(TAG) as MarkdownEditor;
      editor.value = new Array(40)
        .fill('A paragraph of the article.')
        .join('\n\n');
      await editor.updateComplete;

      const article = editor.doc;
      assert.equal(getComputedStyle(article).overflowY, 'auto');

      // the editor is the height it was given rather than the height of the article, so nothing outside it scrolls
      assert.closeTo(editor.getBoundingClientRect().height, 200, 1);
      assert.isAbove(article.scrollHeight, article.clientHeight);

      // and the toolbar sits above the part that scrolls, so it can't be scrolled away at all
      const chrome = editor.shadowRoot.querySelector('.chrome') as HTMLElement;
      article.scrollTop = 300;
      await new Promise((resolve) => requestAnimationFrame(resolve));

      assert.isAbove(article.scrollTop, 0);
      assert.isAtMost(
        chrome.getBoundingClientRect().bottom,
        article.getBoundingClientRect().top + 1
      );
    });
  });

  describe('links', () => {
    it('offers a link to edit without showing its markdown', async () => {
      const editor = await getEditor('see the [docs](https://example.com) now');

      await caretIn(editor, 0, 10);
      await editor.updateComplete;

      const bar = editor.shadowRoot.querySelector('.linkbar input');
      assert.isOk(bar, 'no link bar for a caret inside a link');
      assert.equal((bar as HTMLInputElement).value, 'https://example.com');

      // the document still reads as prose
      assert.equal(shown(editor), 'see the docs now');
    });

    it('changes where a link points', async () => {
      const editor = await getEditor('see the [docs](https://example.com) now');

      await caretIn(editor, 0, 10);
      await editor.updateComplete;

      const bar = editor.shadowRoot.querySelector(
        '.linkbar input'
      ) as HTMLInputElement;
      bar.value = 'https://nyaruka.com';
      bar.dispatchEvent(new Event('input'));
      await editor.updateComplete;

      assert.equal(editor.value, 'see the [docs](https://nyaruka.com) now');
    });

    it('removes a link and keeps its text', async () => {
      const editor = await getEditor('see the [docs](https://example.com) now');

      await caretIn(editor, 0, 10);
      await editor.updateComplete;

      (
        editor.shadowRoot.querySelector('.linkbar .link-action') as HTMLElement
      ).click();
      await editor.updateComplete;

      assert.equal(editor.value, 'see the docs now');
      assert.isNotOk(editor.shadowRoot.querySelector('.linkbar'));
    });

    it('shows no link bar when the caret is not in a link', async () => {
      const editor = await getEditor('nothing linked here');
      await caretIn(editor, 0, 4);
      await editor.updateComplete;

      assert.isNotOk(editor.shadowRoot.querySelector('.linkbar'));
    });
  });

  describe('pasting', () => {
    const paste = async (
      editor: MarkdownEditor,
      data: { html?: string; text?: string }
    ): Promise<void> => {
      const transfer = new DataTransfer();
      if (data.html) {
        transfer.setData('text/html', data.html);
      }
      if (data.text) {
        transfer.setData('text/plain', data.text);
      }

      doc(editor).dispatchEvent(
        new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: transfer
        })
      );
      await editor.updateComplete;
    };

    it('keeps the formatting of markup it can express', async () => {
      const editor = await getEditor('');
      await caretIn(editor, 0, 0);

      await paste(editor, {
        html: '<p>some <strong>bold</strong> text</p>',
        text: 'some bold text'
      });

      assert.equal(editor.value, 'some **bold** text');
    });

    it('falls back to plain text for markup it cannot', async () => {
      const editor = await getEditor('');
      await caretIn(editor, 0, 0);

      // a paste off the web is a pile of divs and spans, none of which the document can hold
      await paste(editor, {
        html: '<div><span style="color:red">styled</span></div>',
        text: 'styled'
      });

      assert.equal(editor.value, 'styled');
      assert.isNotOk(doc(editor).querySelector('span'));
    });

    it('does not let pasted markup smuggle in anything that runs', async () => {
      const editor = await getEditor('');
      await caretIn(editor, 0, 0);

      await paste(editor, {
        html: '<p onclick="alert(1)">safe<script>alert(2)</script></p>',
        text: 'safe'
      });

      assert.isNotOk(doc(editor).querySelector('script'));
      assert.isNotOk(doc(editor).querySelector('[onclick]'));
      assert.include(editor.value, 'safe');
    });

    it('takes plain text as the text it is', async () => {
      const editor = await getEditor('');
      await caretIn(editor, 0, 0);

      await paste(editor, { text: 'one\n\ntwo' });

      assert.equal(editor.value, 'one\n\ntwo');
    });
  });

  describe('source mode', () => {
    it('toggles to the raw markdown and back', async () => {
      const editor = await getEditor('# Hello');
      assert.isNotOk(editor.textArea);

      editor.sourceMode = true;
      await editor.updateComplete;

      assert.isOk(editor.textArea);
      assert.equal(editor.textArea.value, '# Hello');
      assert.isNotOk(editor.doc);

      editor.sourceMode = false;
      await editor.updateComplete;

      assert.isNotOk(editor.textArea);
      assert.equal(blocks(editor).length, 1);
    });

    it('carries edits made in the source back to the rendered document', async () => {
      const editor = await getEditor('# Hello');
      editor.sourceMode = true;
      await editor.updateComplete;

      editor.textArea.value = '# Hello\n\nAnd a paragraph.';
      editor.textArea.dispatchEvent(new Event('input'));
      await editor.updateComplete;

      editor.sourceMode = false;
      await editor.updateComplete;

      assert.equal(blocks(editor).length, 2);
      assert.equal(blocks(editor)[1].textContent, 'And a paragraph.');
    });

    it('carries edits made in the document back to the source', async () => {
      const editor = await getEditor('# Hello\n\nwords');

      await caretIn(editor, 1, 5);
      await type(' here');
      await editor.updateComplete;

      editor.sourceMode = true;
      await editor.updateComplete;

      assert.equal(editor.textArea.value, '# Hello\n\nwords here');
    });

    it('still formats in source mode, where markdown is what the caret is in', async () => {
      const editor = await getEditor('hello world');
      editor.sourceMode = true;
      await editor.updateComplete;

      editor.textArea.setSelectionRange(6, 11);
      await toolbar(editor, 'B');

      assert.equal(editor.value, 'hello **world**');
    });

    it('applies block formatting to every line of the selection in source mode', async () => {
      const editor = await getEditor('one\ntwo\nthree');
      editor.sourceMode = true;
      await editor.updateComplete;

      editor.textArea.setSelectionRange(1, 9);
      await toolbar(editor, 'List');

      // marking only the first line would leave one list item and two loose lines
      assert.equal(editor.value, '* one\n* two\n* three');
    });
  });

  describe('uploads', () => {
    const ok = () =>
      mockPOST(/msgmedia\/upload/, {
        url: '/test-assets/img/sim_image_c.jpg',
        name: 'shot.png'
      });

    it('inserts an image at the caret and shows it straight away', async () => {
      ok();
      const editor = await getEditor('before after');
      await caretIn(editor, 0, 7);

      await (editor as any).upload([uploadFile()]);
      await editor.updateComplete;

      assert.equal(
        editor.value,
        'before ![shot.png](/test-assets/img/sim_image_c.jpg)after'
      );

      // it is in the document as an image, not as the markdown for one
      assert.isOk(blocks(editor)[0].querySelector('img'));
      assert.notInclude(shown(editor), '![');
    });

    it('stacks files up in the order they were given', async () => {
      ok();
      const editor = await getEditor('');
      await caretIn(editor, 0, 0);

      await (editor as any).upload([uploadFile(), uploadFile()]);
      await editor.updateComplete;

      assert.equal(
        editor.value,
        '![shot.png](/test-assets/img/sim_image_c.jpg)![shot.png](/test-assets/img/sim_image_c.jpg)'
      );
      assert.equal(blocks(editor)[0].querySelectorAll('img').length, 2);
      assert.isFalse(editor.uploading);
    });

    it('writes to where the caret was, not wherever it ended up', async () => {
      ok();
      const editor = await getEditor('alpha\n\nbravo');
      await caretIn(editor, 0, 5);

      // an upload takes seconds and the author is free to click elsewhere while it runs
      const pending = (editor as any).upload([uploadFile()]);
      await caretIn(editor, 1, 5);
      await pending;
      await editor.updateComplete;

      assert.equal(
        editor.value,
        'alpha![shot.png](/test-assets/img/sim_image_c.jpg)\n\nbravo'
      );
    });

    it('goes back to where the caret was when the file dialog blurred the document', async () => {
      ok();
      const editor = await getEditor('alpha\n\nbravo');

      // picking a file takes the window, which blurs the document
      await caretIn(editor, 0, 5);
      doc(editor).dispatchEvent(new FocusEvent('blur'));
      doc(editor).blur();
      await editor.updateComplete;

      await (editor as any).upload([uploadFile()]);
      await editor.updateComplete;

      // the end of the article would have been wrong - the caret was in the first block
      assert.equal(
        editor.value,
        'alpha![shot.png](/test-assets/img/sim_image_c.jpg)\n\nbravo'
      );
    });

    it('writes no reference when the response carries no url', async () => {
      // a session that expired mid-upload redirects to a login page, which resolves as a success with nothing usable
      mockPOST(/msgmedia\/upload/, { name: 'shot.png' });

      const editor = await getEditor('body');
      await caretIn(editor, 0, 4);

      await (editor as any).upload([uploadFile()]);
      await editor.updateComplete;

      assert.equal(editor.value, 'body');
      assert.equal(editor.error, 'Unable to upload file.');
      assert.isNotOk(doc(editor).querySelector('img'));
    });

    it('strips the delimiters out of alt text', async () => {
      // clean_name deliberately keeps [ ] ( ) in filenames, which are what delimit a markdown image
      mockPOST(/msgmedia\/upload/, {
        url: '/test-assets/img/sim_image_c.jpg',
        name: 'a [weird] (name).png'
      });

      const editor = await getEditor('');
      await caretIn(editor, 0, 0);

      await (editor as any).upload([uploadFile()]);
      await editor.updateComplete;

      assert.equal(
        editor.value,
        '![a weird name.png](/test-assets/img/sim_image_c.jpg)'
      );
    });

    it('inserts into the source in source mode', async () => {
      ok();
      const editor = await getEditor('body');
      editor.sourceMode = true;
      await editor.updateComplete;
      editor.textArea.setSelectionRange(4, 4);

      await (editor as any).upload([uploadFile()]);
      await editor.updateComplete;

      assert.equal(
        editor.value,
        'body![shot.png](/test-assets/img/sim_image_c.jpg)'
      );
    });

    it('accepts a drag so the browser does not navigate to the dropped file', async () => {
      const editor = await getEditor('body');
      const over = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true
      });
      doc(editor).dispatchEvent(over);

      assert.isTrue(over.defaultPrevented);
    });
  });

  describe('screenshots', () => {
    const ARTICLE = [
      '# Getting started',
      '',
      'Open the **Flows** tab and pick a flow to edit. See the [docs](https://example.com) for more.',
      '',
      '* Add a node',
      '* Connect it up',
      '',
      '![a screenshot](/test-assets/img/sim_image_c.jpg)'
    ].join('\n');

    // the rendered document sizes itself to its content, so the screenshots only need a floor for source mode
    const getArticle = async (minHeight = 0): Promise<MarkdownEditor> => {
      const editor = (await getComponent(
        TAG,
        { widget_only: true },
        '',
        500
      )) as MarkdownEditor;

      editor.minHeight = minHeight;
      editor.value = ARTICLE;
      await editor.updateComplete;
      await waitForImages(editor.shadowRoot);
      return editor;
    };

    it('renders the document', async () => {
      const editor = await getArticle();
      expect(blocks(editor).length).to.equal(4);
      await assertScreenshot('markdown-editor/document', getClip(editor));
    });

    it('shows the toolbar following the caret while editing', async () => {
      const editor = await getArticle();

      // the caret in the heading - the toolbar says what it is sitting in, and the article stays an article
      await caretIn(editor, 0, 7);
      await editor.updateComplete;

      await assertScreenshot('markdown-editor/editing', getClip(editor));
    });

    it('shows the link bar for a caret inside a link', async () => {
      const editor = await getArticle();

      // inside "docs", which is the link's own text
      const at = blocks(editor)[1].textContent.indexOf('docs') + 2;
      await caretIn(editor, 1, at);
      await editor.updateComplete;

      assert.isOk(
        editor.shadowRoot.querySelector('.linkbar'),
        'the caret is not in the link'
      );

      await assertScreenshot('markdown-editor/link', getClip(editor));
    });

    it('shows the whole document as markdown', async () => {
      const editor = await getArticle(220);
      editor.sourceMode = true;
      await editor.updateComplete;
      await assertScreenshot('markdown-editor/source', getClip(editor));
    });
  });
});
