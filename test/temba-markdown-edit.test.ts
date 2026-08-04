import { fixture, assert } from '@open-wc/testing';
import { MarkdownEditor } from '../src/form/MarkdownEditor';
import './utils.test';

const getEditor = async (value = ''): Promise<MarkdownEditor> => {
  const editor: MarkdownEditor = await fixture(
    `<temba-markdown-edit widget_only value="${value}"></temba-markdown-edit>`
  );
  await editor.updateComplete;
  return editor;
};

const select = async (
  editor: MarkdownEditor,
  start: number,
  end: number
): Promise<void> => {
  editor.textArea.setSelectionRange(start, end);
};

describe('temba-markdown-edit', () => {
  it('can be created', async () => {
    const editor = await getEditor();
    assert.instanceOf(editor, MarkdownEditor);
    assert.equal(editor.value, '');
  });

  it('shows the markdown source in a textarea', async () => {
    const editor = await getEditor('# Hello');
    assert.equal(editor.textArea.value, '# Hello');
  });

  it('wraps the selection with inline formatting', async () => {
    const editor = await getEditor('hello world');
    await select(editor, 6, 11);

    (editor as any).applyFormatting({
      label: 'B',
      title: 'Bold',
      prefix: '**',
      suffix: '**'
    });

    assert.equal(editor.value, 'hello **world**');
  });

  it('inserts inline formatting with the caret between the markers', async () => {
    const editor = await getEditor('');
    await select(editor, 0, 0);

    (editor as any).applyFormatting({
      label: 'I',
      title: 'Italic',
      prefix: '_',
      suffix: '_'
    });

    assert.equal(editor.value, '__');
    assert.equal(editor.textArea.selectionStart, 1);
  });

  it('applies block formatting from the start of the line', async () => {
    const editor = await getEditor('one\ntwo');
    await select(editor, 5, 5); // mid way through the second line

    (editor as any).applyFormatting({
      label: 'H',
      title: 'Heading',
      prefix: '## ',
      suffix: '',
      block: true
    });

    assert.equal(editor.value, 'one\n## two');
  });

  it('inserts uploaded images as markdown at the caret', async () => {
    const editor = await getEditor('before after');
    await select(editor, 7, 7);

    (editor as any).insert(7, 7, '![shot.png](/media/shot.png)', 7);

    assert.equal(editor.value, 'before ![shot.png](/media/shot.png)after');
  });

  it('toggles between editing and previewing', async () => {
    const editor = await getEditor('# Hello');
    assert.isOk(editor.textArea);

    editor.previewing = true;
    await editor.updateComplete;

    assert.isNotOk(editor.textArea);
  });
});
