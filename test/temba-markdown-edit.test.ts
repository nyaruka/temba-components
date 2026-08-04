import { fixture, assert, expect } from '@open-wc/testing';
import {
  blockKind,
  joinBlocks,
  MarkdownEditor,
  sourceOffset,
  splitBlocks
} from '../src/form/MarkdownEditor';
import {
  assertScreenshot,
  clearMockPosts,
  getClip,
  getComponent,
  mockPOST,
  waitForImages
} from './utils.test';

const TAG = 'temba-markdown-edit';
const UPLOAD = '/msgmedia/upload/';

const getEditor = async (value = ''): Promise<MarkdownEditor> => {
  const editor: MarkdownEditor = await fixture(
    `<${TAG} widget_only endpoint="${UPLOAD}"></${TAG}>`
  );
  editor.value = value;
  await editor.updateComplete;
  return editor;
};

/** clicks into a block the way the editor's own mousedown handler would */
const edit = async (
  editor: MarkdownEditor,
  index: number,
  caret: number = Infinity
): Promise<HTMLTextAreaElement> => {
  (editor as any).activate(index, caret);
  await editor.updateComplete;
  return editor.activeArea;
};

/** types into whichever textarea is holding the caret */
const type = async (
  editor: MarkdownEditor,
  area: HTMLTextAreaElement,
  text: string
): Promise<void> => {
  area.value = text;
  area.dispatchEvent(new Event('input'));
  await editor.updateComplete;
};

const rendered = (editor: MarkdownEditor): HTMLElement[] =>
  [...editor.shadowRoot.querySelectorAll('.block.rendered')] as HTMLElement[];

const uploadFile = (name = 'shot.png'): File =>
  new File(['shot'], name, { type: 'image/png' });

/** clicks a rendered block a fraction of the way along its text, the way a real pointer would */
const clickAt = async (
  editor: MarkdownEditor,
  index: number,
  fraction: number
): Promise<void> => {
  const block = rendered(editor)[index];

  // the block and its paragraph are full width, so the fraction is taken against the text's own extent
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let text: Node;
  while ((text = walker.nextNode())) {
    if (text.textContent.trim()) {
      break;
    }
  }

  const range = document.createRange();
  range.selectNodeContents(text);
  const rect = range.getBoundingClientRect();

  block.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width * fraction,
      clientY: rect.top + rect.height / 2
    })
  );
  await editor.updateComplete;
};

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
    assert.equal(blocks[0].source, '* one\n\n* two\n\n* three');
  });

  it('keeps a list item with more than one paragraph whole', () => {
    const blocks = splitBlocks('1. one\n\n   more about one\n\n2. two');
    assert.equal(blocks.length, 1);
  });

  it('keeps a blockquote whole across blank lines', () => {
    const blocks = splitBlocks('> one\n\n> two');
    assert.equal(blocks.length, 1);
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

  it('leaves untouched blocks exactly as they were', () => {
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

    const blocks = splitBlocks(original);
    // rewrite only the final paragraph, the way editing one block does
    blocks[3] = { ...blocks[3], source: 'Last paragraph, edited.' };

    assert.equal(
      joinBlocks(blocks),
      original.replace('Last paragraph.', 'Last paragraph, edited.')
    );
  });
});

describe('blockKind', () => {
  it('names what a block renders to', () => {
    assert.equal(blockKind('# Title'), 'h1');
    assert.equal(blockKind('### Title'), 'h3');
    assert.equal(blockKind('```\ncode\n```'), 'code');
    assert.equal(blockKind('    indented'), 'code');
    assert.equal(blockKind('> quoted'), 'quote');
    assert.equal(blockKind('* item'), 'list');
    assert.equal(blockKind('1. item'), 'list');
    assert.equal(blockKind('just words'), 'para');
    assert.equal(blockKind(''), 'para');
  });

  it('reads a setext heading off the line below it', () => {
    assert.equal(blockKind('Title\n====='), 'h1');
    assert.equal(blockKind('Title\n-----'), 'h2');
    // a list whose second item happens to start with a dash isn't a heading
    assert.equal(blockKind('- one\n- two'), 'list');
  });
});

describe('sourceOffset', () => {
  it('maps a rendered offset back through the markers rendering dropped', () => {
    // "## Heading" renders to "Heading", so the caret after "Head" is 4 in the text and 7 in the source
    assert.equal(sourceOffset('## Heading', 'Heading', 4), 7);
    assert.equal(sourceOffset('**bold** text', 'bold text', 4), 6);
    assert.equal(sourceOffset('plain text', 'plain text', 5), 5);
  });

  it('stops at the end of the source', () => {
    assert.equal(sourceOffset('hi', 'hi there', 8), 2);
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

    const blocks = rendered(editor);
    assert.equal(blocks.length, 2);
    assert.isOk(blocks[0].querySelector('h1'));
    assert.equal(blocks[0].querySelector('h1').textContent, 'Hello');
    assert.isOk(blocks[1].querySelector('em'));

    // nothing is showing markdown until the caret goes somewhere
    assert.isNotOk(editor.activeArea);
    assert.isNotOk(editor.textArea);
  });

  it('renders images inline', async () => {
    const editor = await getEditor(
      '![a shot](/test-assets/img/sim_image_c.jpg)'
    );
    const img = rendered(editor)[0].querySelector('img');
    assert.isOk(img);
    assert.equal(img.getAttribute('src'), '/test-assets/img/sim_image_c.jpg');
    assert.equal(img.getAttribute('alt'), 'a shot');
  });

  it('escapes markup rather than running it', async () => {
    const editor = await getEditor('<img src=x onerror="alert(1)">');
    assert.isNotOk(rendered(editor)[0].querySelector('img'));
  });

  it('shows the markdown of the block holding the caret', async () => {
    const editor = await getEditor('# Hello\n\nSome words.');

    const area = await edit(editor, 0);
    assert.equal(area.value, '# Hello');
    // the block being edited is typed like the thing it renders to
    assert.include([...area.classList], 'h1');

    // the rest of the document stays rendered
    assert.equal(rendered(editor).length, 1);
  });

  it('clicking a block opens it with the caret at the front of the text', async () => {
    const editor = await getEditor('# Title\n\nSome longer words here.');
    await clickAt(editor, 1, 0);

    assert.equal(editor.active, 1);
    // clicked at the left edge, so the caret belongs at the front rather than dumped at the end
    assert.isBelow(editor.activeArea.selectionStart, 4);
  });

  it('clicking part way along a block lands part way along its markdown', async () => {
    const editor = await getEditor('# Title\n\nSome longer words here.');
    await clickAt(editor, 1, 0.5);

    const caret = editor.activeArea.selectionStart;
    assert.isAbove(caret, 4);
    assert.isBelow(caret, 'Some longer words here.'.length);
  });

  it('clicking the gap between blocks goes to the nearest one', async () => {
    const editor = await getEditor('one\n\ntwo\n\nthree\n\nfour');

    // the margin between blocks belongs to the document, and a click a few pixels off shouldn't jump to the end
    const doc = editor.shadowRoot.querySelector('.doc') as HTMLElement;
    const rect = rendered(editor)[1].getBoundingClientRect();

    doc.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 2,
        clientY: rect.bottom + 2
      })
    );
    await editor.updateComplete;

    assert.equal(editor.active, 1);
  });

  it('does not leave a caret armed when the block clicked is already open', async () => {
    const editor = await getEditor('one\n\ntwo');
    const doc = editor.shadowRoot.querySelector('.doc') as HTMLElement;

    await edit(editor, 1, 1);

    // clicking the empty space under the last block, which is the block already being edited
    const rect = doc.getBoundingClientRect();
    doc.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 2,
        clientY: rect.bottom - 2
      })
    );
    await editor.updateComplete;

    assert.equal(editor.active, 1);
    // nothing re-renders, so a caret left armed here would fire on the next update instead - the author's next
    // keystroke, which would send it to the end of the block mid-word
    assert.isNull((editor as any).pendingCaret);
  });

  it('keeps rendered links out of the tab order', async () => {
    const editor = await getEditor('see the [docs](https://example.com)');
    const link = rendered(editor)[0].querySelector('a');

    // enter on a focused link would navigate away from a draft nobody has saved
    assert.equal(link.getAttribute('tabindex'), '-1');
    assert.equal(link.getAttribute('href'), 'https://example.com');
  });

  it('accepts a drag so the browser does not navigate to the dropped file', async () => {
    const editor = await getEditor('body');
    const doc = editor.shadowRoot.querySelector('.doc') as HTMLElement;

    const over = new DragEvent('dragover', { bubbles: true, cancelable: true });
    doc.dispatchEvent(over);

    assert.isTrue(over.defaultPrevented);
  });

  it('re-renders the document as it is written', async () => {
    const editor = await getEditor('# Hello\n\nSome words.');

    const area = await edit(editor, 0);
    await type(editor, area, '# Hello there');

    // realtime: the value is current without leaving the block
    assert.equal(editor.value, '# Hello there\n\nSome words.');

    // and the block renders as soon as the caret leaves it
    area.dispatchEvent(new Event('blur'));
    await editor.updateComplete;
    assert.equal(
      rendered(editor)[0].querySelector('h1').textContent,
      'Hello there'
    );
  });

  it('rebuilds the document when the value is set from outside', async () => {
    const editor = await getEditor('one');
    await edit(editor, 0);

    editor.value = '# two\n\nthree';
    await editor.updateComplete;

    assert.equal(editor.blocks.length, 2);
    assert.equal(editor.active, -1);
    assert.equal(rendered(editor)[0].querySelector('h1').textContent, 'two');
  });

  it('splits a block when a blank line is typed into it', async () => {
    const editor = await getEditor('one');

    const area = await edit(editor, 0);
    await type(editor, area, 'one\n\ntwo');
    area.dispatchEvent(new Event('blur'));
    await editor.updateComplete;

    assert.equal(editor.value, 'one\n\ntwo');
    assert.equal(rendered(editor).length, 2);
  });

  describe('source mode', () => {
    it('toggles to the raw markdown and back', async () => {
      const editor = await getEditor('# Hello');
      assert.isNotOk(editor.textArea);

      editor.sourceMode = true;
      await editor.updateComplete;

      assert.isOk(editor.textArea);
      assert.equal(editor.textArea.value, '# Hello');
      assert.equal(rendered(editor).length, 0);

      editor.sourceMode = false;
      await editor.updateComplete;

      assert.isNotOk(editor.textArea);
      assert.equal(rendered(editor).length, 1);
    });

    it('carries edits made in the source back to the rendered document', async () => {
      const editor = await getEditor('# Hello');
      editor.sourceMode = true;
      await editor.updateComplete;

      await type(editor, editor.textArea, '# Hello\n\nAnd a paragraph.');
      assert.equal(editor.value, '# Hello\n\nAnd a paragraph.');

      editor.sourceMode = false;
      await editor.updateComplete;

      const blocks = rendered(editor);
      assert.equal(blocks.length, 2);
      assert.equal(blocks[1].textContent.trim(), 'And a paragraph.');
    });

    it('carries edits made in the document back to the source', async () => {
      const editor = await getEditor('# Hello\n\nwords');

      const area = await edit(editor, 1);
      await type(editor, area, 'different words');

      editor.sourceMode = true;
      await editor.updateComplete;

      assert.equal(editor.textArea.value, '# Hello\n\ndifferent words');
    });
  });

  describe('toolbar', () => {
    const format = async (editor: MarkdownEditor, label: string) => {
      const button = [
        ...editor.shadowRoot.querySelectorAll('.toolbar .format')
      ].find((ele) => ele.textContent.trim() === label) as HTMLElement;
      button.click();

      // formatting opens a block to write into when nothing is focused, so let that settle before looking
      await new Promise((resolve) => setTimeout(resolve, 0));
      await editor.updateComplete;
    };

    it('wraps the selection in the block being edited', async () => {
      const editor = await getEditor('# Title\n\nhello world');

      const area = await edit(editor, 1);
      area.setSelectionRange(6, 11);
      await format(editor, 'B');

      assert.equal(editor.value, '# Title\n\nhello **world**');
      assert.equal(area.value, 'hello **world**');
    });

    it('leaves the caret between the markers when nothing is selected', async () => {
      const editor = await getEditor('hello');

      await edit(editor, 0, 5);
      await format(editor, 'I');

      assert.equal(editor.value, 'hello__');
      assert.equal(editor.activeArea.selectionStart, 6);
    });

    it('applies block formatting to every line of the selection', async () => {
      const editor = await getEditor('one\ntwo\nthree');

      const area = await edit(editor, 0);
      area.setSelectionRange(1, 9); // spans all three lines, starting and ending mid line
      await format(editor, 'List');

      // marking only the first line would leave one list item and two loose lines
      assert.equal(editor.value, '* one\n* two\n* three');
    });

    it('opens a block to write into when nothing is focused', async () => {
      const editor = await getEditor('# Title\n\nlast');
      assert.equal(editor.active, -1);

      await format(editor, 'H');
      await editor.updateComplete;

      // falls through to the end of the document rather than doing nothing
      assert.equal(editor.value, '# Title\n\n## last');
    });

    it('still formats in source mode', async () => {
      const editor = await getEditor('hello world');
      editor.sourceMode = true;
      await editor.updateComplete;

      editor.textArea.setSelectionRange(6, 11);
      await format(editor, 'B');

      assert.equal(editor.value, 'hello **world**');
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
  });

  describe('keyboard', () => {
    const press = async (
      editor: MarkdownEditor,
      area: HTMLTextAreaElement,
      key: string
    ) => {
      area.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      );
      await editor.updateComplete;
    };

    it('arrows out of the top of a block into the one above', async () => {
      const editor = await getEditor('one\n\ntwo');

      const area = await edit(editor, 1, 0);
      await press(editor, area, 'ArrowUp');

      assert.equal(editor.active, 0);
      assert.equal(editor.activeArea.value, 'one');
    });

    it('arrows out of the bottom of a block into the one below', async () => {
      const editor = await getEditor('one\n\ntwo');

      const area = await edit(editor, 0);
      await press(editor, area, 'ArrowDown');

      assert.equal(editor.active, 1);
      assert.equal(editor.activeArea.selectionStart, 0);
    });

    it('stays put when there is more of the block to move through', async () => {
      const editor = await getEditor('one\ntwo\n\nthree');

      const area = await edit(editor, 0, 0);
      await press(editor, area, 'ArrowDown');

      assert.equal(editor.active, 0);
    });

    it('backspacing at the start of a block deletes the break above it', async () => {
      const editor = await getEditor('one\n\ntwo');

      const area = await edit(editor, 1, 0);
      await press(editor, area, 'Backspace');

      assert.equal(editor.value, 'one\ntwo');
      assert.equal(editor.active, 0);
      assert.equal(editor.activeArea.selectionStart, 3);
    });

    it('tabbing into the document opens the first block', async () => {
      const editor = await getEditor('one\n\ntwo');
      const doc = editor.shadowRoot.querySelector('.doc') as HTMLElement;

      doc.focus();
      await editor.updateComplete;

      assert.equal(editor.active, 0);
      assert.equal(editor.activeArea.selectionStart, 0);
    });

    it('does not drop back in when tabbing out of the first block', async () => {
      const editor = await getEditor('one\n\ntwo');
      const doc = editor.shadowRoot.querySelector('.doc') as HTMLElement;

      // shift-tab blurs the block and focuses the document on the way past, both in the one turn
      const area = await edit(editor, 0);
      area.dispatchEvent(new Event('blur'));
      doc.dispatchEvent(new FocusEvent('focus', { relatedTarget: area }));
      await editor.updateComplete;

      assert.equal(editor.active, -1);
    });

    it('stays put moving down through a block that wraps over several rows', async () => {
      // prose is one long line the textarea wraps, so leaving on "no newline after the caret" would fling the caret
      // out of a paragraph the author was only moving down through
      const editor = await getEditor(
        'a paragraph long enough to wrap\n\nthe next one'
      );

      const area = await edit(editor, 0, 4);
      await press(editor, area, 'ArrowDown');

      assert.equal(editor.active, 0);
    });

    it('escape puts the caret back outside the document', async () => {
      const editor = await getEditor('one');

      const area = await edit(editor, 0);
      await press(editor, area, 'Escape');
      await editor.updateComplete;

      assert.equal(editor.active, -1);
    });
  });

  describe('uploads', () => {
    it('inserts a reference at the caret and renders it inline', async () => {
      mockPOST(/msgmedia\/upload/, {
        url: '/test-assets/img/sim_image_c.jpg',
        name: 'shot.jpg'
      });

      const editor = await getEditor('before after');
      await edit(editor, 0, 7);

      await (editor as any).upload([uploadFile()]);
      await editor.updateComplete;

      assert.equal(
        editor.value,
        'before ![shot.jpg](/test-assets/img/sim_image_c.jpg)after'
      );

      // the block renders once the batch is done, so the image shows up where it was put
      assert.isOk(rendered(editor)[0].querySelector('img'));
    });

    it('stacks files up in the order they were given', async () => {
      mockPOST(/msgmedia\/upload/, {
        url: '/test-assets/img/sim_image_c.jpg',
        name: 'shot.png'
      });

      const editor = await getEditor('');
      await edit(editor, 0, 0);

      await (editor as any).upload([uploadFile(), uploadFile()]);

      assert.equal(
        editor.value,
        '![shot.png](/test-assets/img/sim_image_c.jpg)![shot.png](/test-assets/img/sim_image_c.jpg)'
      );
      // the insertion point moved past each reference, so the second went after the first rather than in front of it
      assert.equal((editor as any).resume.caret, editor.value.length);
      assert.isFalse(editor.uploading);
    });

    it('writes to the block the caret was in, not wherever it ended up', async () => {
      mockPOST(/msgmedia\/upload/, {
        url: '/test-assets/img/sim_image_c.jpg',
        name: 'shot.png'
      });

      const editor = await getEditor('alpha\n\nbravo');
      await edit(editor, 0, 5);

      // an upload takes seconds and the author is free to click elsewhere while it runs
      const pending = (editor as any).upload([uploadFile()]);
      (editor as any).activate(1, 0);
      await pending;
      await editor.updateComplete;

      assert.equal(
        editor.value,
        'alpha![shot.png](/test-assets/img/sim_image_c.jpg)\n\nbravo'
      );
      // and they're left where they went rather than yanked back
      assert.equal(editor.active, 1);
    });

    it('goes back to where the caret was when the file dialog blurred the document', async () => {
      mockPOST(/msgmedia\/upload/, {
        url: '/test-assets/img/sim_image_c.jpg',
        name: 'shot.png'
      });

      const editor = await getEditor('alpha\n\nbravo');

      // picking a file takes the window, which blurs the block being edited
      const area = await edit(editor, 0, 5);
      area.dispatchEvent(new FocusEvent('blur'));
      await editor.updateComplete;
      assert.equal(editor.active, -1);

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
      await edit(editor, 0);

      await (editor as any).upload([uploadFile()]);
      await editor.updateComplete;

      assert.equal(editor.value, 'body');
      assert.equal(editor.error, 'Unable to upload file.');
    });

    it('strips the delimiters out of alt text', async () => {
      // clean_name deliberately keeps [ ] ( ) in filenames, which are what delimit a markdown image
      mockPOST(/msgmedia\/upload/, {
        url: '/test-assets/img/sim_image_c.jpg',
        name: 'a [weird] (name).png'
      });

      const editor = await getEditor('');
      await edit(editor, 0, 0);

      await (editor as any).upload([uploadFile()]);
      await editor.updateComplete;

      assert.equal(
        editor.value,
        '![a weird name.png](/test-assets/img/sim_image_c.jpg)'
      );
    });

    it('inserts into the source in source mode', async () => {
      mockPOST(/msgmedia\/upload/, {
        url: '/test-assets/img/sim_image_c.jpg',
        name: 'shot.png'
      });

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
      const editor: MarkdownEditor = (await getComponent(
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
      expect(rendered(editor).length).to.equal(4);
      await assertScreenshot('markdown-editor/document', getClip(editor));
    });

    it('shows the markdown of the block being edited', async () => {
      const editor = await getArticle();
      await edit(editor, 0);
      await assertScreenshot('markdown-editor/editing', getClip(editor));
    });

    it('shows the whole document as markdown', async () => {
      const editor = await getArticle(220);
      editor.sourceMode = true;
      await editor.updateComplete;
      await assertScreenshot('markdown-editor/source', getClip(editor));
    });
  });
});
