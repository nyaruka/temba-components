import { PropertyValues, TemplateResult, css, html } from 'lit';
import { msg } from '@lit/localize';
import { property, state } from 'lit/decorators.js';
import { FieldElement } from './FieldElement';
import { Icon } from '../Icons';
import { getSelectionFromRoot } from '../excellent/caret-utils';
import { markdown } from '../markdown';
import { postFormData } from '../utils';
import {
  Block,
  blockOf,
  isSerializable,
  joinBlocks,
  renderBlock,
  splitBlocks
} from './MarkdownDocument';

/** what the toolbar can do to the document */
type Format =
  | 'bold'
  | 'italic'
  | 'code'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'number'
  | 'quote'
  | 'link'
  | 'columns';

interface Command {
  format: Format;
  label: string;
  title: string;
  /** the markers the same command writes in source mode, where there's nothing rendered to act on */
  prefix: string;
  suffix?: string;
  /** whether the markers go on the front of every line the selection covers */
  lines?: boolean;
}

/**
 * A run of rendered elements that one block turned into, so the block's own markdown can be handed back untouched for
 * as long as nothing in it has been edited. Most blocks render to a single element; a block only becomes several when
 * its markdown holds more than one construct without a blank line between them.
 */
interface Run {
  source: string;
  /** everything after the element this is filed under */
  rest: Element[];
  /** what the run looked like when it was rendered, so an edit to it can be spotted */
  signature: string;
}

interface Caret {
  index: number;
  offset: number;
}

// The document is a flat list of these. Anything else the browser leaves at the top level - a bare text node, or the
// <div> it wraps a new line in - is turned into one of them before the document is read back.
const TOP_LEVEL = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'UL',
  'OL',
  'BLOCKQUOTE',
  'PRE',
  'HR',
  'TABLE'
]);

/** a block the editor can't write back out, kept exactly as it was authored */
const LOCKED = 'locked';

const EMPTY_BLOCK = '<p><br></p>';

const signatureOf = (elements: Element[]): string =>
  elements
    .map((element) => `${element.tagName}>${element.innerHTML}`)
    .join('|');

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const retag = (element: Element, tag: string): Element => {
  const replacement = document.createElement(tag);
  replacement.append(...element.childNodes);
  element.replaceWith(replacement);
  return replacement;
};

// An image's size and layout live in its url fragment - ![alt](url#size=small&layout=inline) - which is the one part
// of a markdown image reference with room for them. The url itself is untouched: a fragment means nothing to the
// server the image comes from, and a reference without one renders the way it always has.

/** the sizes an image can be capped to, which is everything a fragment is allowed to ask for */
const IMAGE_SIZES = new Set(['small', 'medium', 'large']);

/** how an image can sit in its text - as a block of its own or inline with what's around it */
const IMAGE_LAYOUTS = new Set(['block', 'inline']);

/** what an image's fragment asks for, with anything it can't ask for read as the default */
const imageOptions = (src: string): { size: string; layout: string } => {
  const at = src.indexOf('#');
  const params = new URLSearchParams(at === -1 ? '' : src.substring(at + 1));
  const size = params.get('size') || '';
  const layout = params.get('layout') || '';

  return {
    size: IMAGE_SIZES.has(size) ? size : '',
    layout: IMAGE_LAYOUTS.has(layout) ? layout : ''
  };
};

/** writes size and layout back into the fragment, dropping defaults so an untouched image stays a bare url */
const withImageOptions = (
  src: string,
  size: string,
  layout: string
): string => {
  const at = src.indexOf('#');
  const base = at === -1 ? src : src.substring(0, at);
  const params = new URLSearchParams(at === -1 ? '' : src.substring(at + 1));
  params.delete('size');
  params.delete('layout');

  const parts: string[] = [];
  if (size) {
    parts.push(`size=${size}`);
  }
  if (layout) {
    parts.push(`layout=${layout}`);
  }

  const rest = params.toString();
  if (rest) {
    parts.push(rest);
  }

  return parts.length > 0 ? `${base}#${parts.join('&')}` : base;
};

/** applies what an image's fragment asks for as the classes the document styles render, touching nothing else */
const decorateImage = (img: HTMLImageElement): void => {
  const { size, layout } = imageOptions(img.getAttribute('src') || '');

  const classes = [...img.classList].filter(
    (name) => !name.startsWith('size-') && !name.startsWith('layout-')
  );
  if (size) {
    classes.push(`size-${size}`);
  }
  if (layout) {
    classes.push(`layout-${layout}`);
  }

  const value = classes.join(' ');
  if ((img.getAttribute('class') || '') !== value) {
    if (value) {
      img.setAttribute('class', value);
    } else {
      img.removeAttribute('class');
    }
  }
};

/**
 * An editor for markdown that is only ever shown as the article it renders to. Clicking into it puts the caret in the
 * rendered text and edits it there - no part of the document turns into its source at any point, whatever the caret is
 * doing. The one way to see markdown is the toggle, which swaps the whole document for its source.
 *
 * What gets stored is markdown, not rich text, so article bodies stay diffable, portable and cheap to chunk on heading
 * boundaries for search. That constraint is what shapes the implementation: the document is modelled as blocks that
 * hold the markdown they were authored with, and a block is only written back out from what it renders as once it has
 * actually been edited. Open an article, change one paragraph, save, and the diff is that paragraph - everything else
 * comes back byte for byte, including the setext headings, + bullets and hard wrapping that a round trip through an
 * AST would quietly rewrite.
 *
 * Editing itself is the browser's. The whole document is one contenteditable, so selecting across blocks, deleting a
 * range that spans them, select-all, and undo are all native and behave the way they do everywhere else. What this
 * class adds around that is the four things the browser gets wrong or doesn't know about: it tidies up the markup the
 * browser leaves behind (see normalize), it keeps a newline inside a fenced block from splitting it in two, it drives
 * formatting through execCommand so those edits land in the undo stack too, and it reads the result back to markdown.
 *
 * Rendering happens here rather than on the server. It used to go to the server on the grounds that a preview should
 * run the same renderer and the same sanitizing as the published article, so an author couldn't preview something we'd
 * refuse to publish. With rich editing there is no preview: an author is looking at their own draft in their own
 * browser, so the only content they can inject is their own and there's nobody else to injure. Readers still get server
 * rendered, server sanitized HTML, which is where sanitizing belongs. Remarkable is configured to escape rather than
 * pass through raw HTML, so even the author's own markup can't execute here.
 */
export class MarkdownEditor extends FieldElement {
  static get styles() {
    return css`
      ${super.styles}

      .container {
        background: var(--color-widget-bg);
        border: 1px solid var(--color-widget-border);
        border-radius: var(--curvature-widget);
        box-shadow: var(--widget-box-shadow);
        transition: all ease-in-out var(--transition-speed);
      }

      .container:focus-within {
        border-color: var(--color-focus);
        background: var(--color-widget-bg-focused);
        box-shadow: var(--widget-box-shadow-focused);
      }

      /* Filling the height it's given rather than growing to its content, with the document scrolling inside the
         editor. That's what lets a dialog be as tall as it wants to be and stay that way - a long article scrolls
         where it's being written instead of pushing the dialog past the bottom of the window. Every wrapper down to
         the document has to pass the height along, which is what the run of flex rules below is for. */
      :host([fill]) {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
      }

      /* the wrapper renderField puts around the widget - .field normally, anonymous when widget_only - and then
         everything between it and the document */
      :host([fill]) > div,
      :host([fill]) .widget,
      :host([fill]) .container {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
      }

      :host([fill]) .doc,
      :host([fill]) textarea.document {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
      }

      /* the editor is the size of what holds it, so there's no slack for a drag handle to take up */
      :host([fill]) textarea.document {
        resize: none;
      }

      /* The controls stay put while the article scrolls under them - an article is usually taller than whatever is
         scrolling it, and reaching for a heading shouldn't mean scrolling back to the top for the toolbar. Sticky
         resolves against the nearest scrolling ancestor, which for the editor dialog is the modal body outside this
         shadow root, and against the container otherwise - so the controls leave with the editor rather than riding
         the rest of the page.

         The link bar sticks with the toolbar rather than under it, since it belongs to the command that opened it and
         would otherwise slide away beneath a toolbar that stayed. Both need the container's own background now that
         the document passes behind them, and the top corners rounded so they don't square off the container's. */
      .chrome {
        position: sticky;
        top: 0;
        z-index: 1;
        background: inherit;
        border-radius: var(--curvature-widget) var(--curvature-widget) 0 0;
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.25em;
        padding: 0.35em 0.5em;
        border-bottom: 1px solid var(--color-widget-border);
      }

      .toolbar temba-icon,
      .toolbar .format {
        cursor: pointer;
        padding: 0.15em 0.4em;
        border-radius: var(--curvature);
        color: var(--color-text-dark);
        font-size: 0.85em;
        line-height: 1.4;
      }

      .toolbar .format.bold {
        font-weight: 700;
      }

      .toolbar .format.italic {
        font-style: italic;
      }

      .toolbar temba-icon:hover,
      .toolbar .format:hover {
        background: var(--color-selection);
      }

      /* what the caret is sitting in, so the toolbar reads as the state of the text rather than a row of buttons */
      .toolbar .format.on {
        background: var(--color-selection);
        color: var(--color-primary-dark);
      }

      .toolbar .spacer {
        flex-grow: 1;
      }

      .toolbar .toggle {
        cursor: pointer;
        font-size: 0.85em;
        color: var(--color-link-primary);
      }

      .linkbar {
        display: flex;
        align-items: center;
        gap: 0.5em;
        padding: 0.35em 0.5em;
        border-bottom: 1px solid var(--color-widget-border);
        background: var(--color-primary-light);
        font-size: 0.85em;
      }

      .linkbar input {
        flex-grow: 1;
        min-width: 0;
        border: 1px solid var(--color-widget-border);
        border-radius: var(--curvature);
        padding: 0.2em 0.4em;
        font-family: inherit;
        font-size: inherit;
        color: var(--color-widget-text);
      }

      .linkbar .link-action {
        cursor: pointer;
        color: var(--color-link-primary);
        white-space: nowrap;
      }

      .imagebar {
        display: flex;
        align-items: center;
        gap: 0.25em;
        padding: 0.35em 0.5em;
        border-bottom: 1px solid var(--color-widget-border);
        background: var(--color-primary-light);
        font-size: 0.85em;
      }

      .imagebar .dimension {
        color: var(--color-text-help);
      }

      .imagebar .option {
        cursor: pointer;
        padding: 0.15em 0.4em;
        border-radius: var(--curvature);
        color: var(--color-text-dark);
      }

      .imagebar .option:hover {
        background: var(--color-selection);
      }

      .imagebar .option.on {
        background: var(--color-selection);
        color: var(--color-primary-dark);
      }

      .imagebar .divider {
        width: 1px;
        align-self: stretch;
        background: var(--color-widget-border);
        margin: 0 0.35em;
      }

      textarea.document {
        display: block;
        width: 100%;
        border: none;
        outline: none;
        margin: 0;
        background: transparent;
        color: var(--color-widget-text);
        font-weight: inherit;
        padding: 0.75em;
        resize: vertical;
        overflow: auto;
        font-family: var(--font-mono);
        font-size: 0.85em;
        line-height: 1.5;
      }

      .doc {
        padding: 0.75em;
        cursor: text;
        font-size: 0.95em;
        line-height: 1.5;
        outline: none;
      }

      /* article typography - what the author is editing is what the article looks like */
      .doc > * {
        margin: 0 0 0.6em 0;
      }

      .doc > *:last-child {
        margin-bottom: 0;
      }

      .doc h1 {
        font-size: 1.5em;
        font-weight: var(--w-semibold);
        line-height: 1.25;
      }

      .doc h2 {
        font-size: 1.25em;
        font-weight: var(--w-semibold);
        line-height: 1.3;
      }

      .doc h3 {
        font-size: 1.1em;
        font-weight: var(--w-semibold);
        line-height: 1.35;
      }

      .doc h4,
      .doc h5,
      .doc h6 {
        font-size: 1em;
        font-weight: var(--w-semibold);
      }

      .doc ul,
      .doc ol {
        padding-left: 1.4em;
      }

      .doc blockquote {
        border-left: 3px solid var(--color-borders);
        padding-left: 0.75em;
        color: var(--color-text-help);
      }

      .doc pre {
        font-family: var(--font-mono);
        font-size: 0.85em;
        background: var(--color-primary-light);
        border-radius: var(--curvature);
        padding: 0.5em 0.75em;
        white-space: pre-wrap;
      }

      .doc pre code {
        background: transparent;
        font-size: inherit;
      }

      .doc code {
        font-family: var(--font-mono);
        font-size: 0.9em;
      }

      /* Inline rather than block, which is also what markdown calls an image. A block level image would make the
         browser split the paragraph in two to insert one, leaving the image in a block of its own - so a screenshot
         dropped mid-sentence would land somewhere other than where the caret was. */
      .doc img {
        max-width: 100%;
        display: inline-block;
        vertical-align: bottom;
      }

      /* What the image's own fragment asks for. One value caps both axes, so it's the long side of any aspect
         ratio that lands on it. */
      .doc img.size-small {
        max-width: 200px;
        max-height: 200px;
        width: auto;
        height: auto;
      }

      .doc img.size-medium {
        max-width: 400px;
        max-height: 400px;
        width: auto;
        height: auto;
      }

      .doc img.size-large {
        max-width: 640px;
        max-height: 640px;
        width: auto;
        height: auto;
      }

      .doc img.layout-block {
        display: block;
      }

      .doc img.layout-inline {
        display: inline-block;
      }

      .doc a {
        color: var(--color-link-primary);
      }

      .doc table {
        border-collapse: collapse;
      }

      .doc th,
      .doc td {
        border: 1px solid var(--color-borders);
        padding: 0.25em 0.5em;
      }

      /* A table whose header says nothing is layout rather than data - the two cell row the Columns button inserts,
         for putting a screenshot beside the text that explains it. The header is hidden instead of shown blank, the
         data-table chrome goes away, and each cell hugs what's in it: a cell holding a screenshot is the
         screenshot's width, and the text takes the rest - auto table layout never squeezes a column below its
         content. A table with a real header keeps the bordered look of data. */
      .doc table:not(:has(th:not(:empty))) {
        max-width: 100%;
        table-layout: auto;
      }

      .doc table:not(:has(th:not(:empty))) thead {
        display: none;
      }

      .doc table:not(:has(th:not(:empty))) td {
        border: none;
        padding: 0.35em 0.5em;
        vertical-align: top;
        /* an empty cell still has to be something the author can click into */
        min-width: 2em;
      }

      /* Guidelines while the row is editable, so the author can see the cells they're filling. They're editor
         chrome rather than part of the article - the served rendering draws no borders on a layout row - so they
         come and go with the editing itself. */
      .doc[contenteditable='true'] table:not(:has(th:not(:empty))) td {
        border: 1px dashed var(--color-borders);
      }

      /* a block the editor can't write back out - it renders, but it isn't edited here */
      .doc .locked {
        cursor: default;
      }

      .doc .locked.empty {
        display: none;
      }

      .uploading {
        opacity: 0.5;
      }

      .error {
        color: var(--color-error);
        padding: 0 0.75em 0.5em 0.75em;
        font-size: 0.85em;
      }
    `;
  }

  /** where screenshots are uploaded, returning {url} to reference from the markdown */
  @property({ type: String })
  endpoint: string;

  @property({ type: String })
  accept = 'image/gif,image/jpeg,image/png,image/webp';

  @property({ type: Number })
  minHeight = 320;

  /** Fills the height of whatever holds the editor and scrolls the document inside it, rather than growing to fit
   * the article. Leaves `minHeight` to the container, which is now the one being sized. */
  @property({ type: Boolean, reflect: true })
  fill = false;

  /** shows the whole document as raw markdown instead of rendering it */
  @property({ type: Boolean, attribute: 'source_mode' })
  sourceMode = false;

  @property({ type: Boolean })
  uploading = false;

  @property({ type: String })
  error = '';

  /** which toolbar commands describe what the caret is sitting in */
  @state()
  private active: string[] = [];

  /** the link under the caret, so it can be edited without ever showing its markdown. null when there isn't one. */
  @state()
  private linkHref: string = null;

  /** the image the author clicked, whose size and layout the image bar edits. null when none is picked. */
  @state()
  private image: HTMLImageElement = null;

  /** the document's blocks, which together are always exactly the value */
  private blocks: Block[] = [];

  private runs = new WeakMap<Element, Run>();
  private trailers = new WeakMap<Element, string>();

  /** whatever followed the last block, so a document that ended with a newline still does */
  private tail = '';

  /** whether the rendered document still has to be built from the blocks */
  private stale = true;

  /** where the caret last was inside the document. Picking a file blurs it - the dialog takes the window - so this is
   * the ordinary case for a screenshot, not an edge one. */
  private saved: Range = null;

  private anchor: HTMLAnchorElement = null;

  /** whether the edit now happening is replacing the whole document, which decides what's left of it afterwards */
  private replacing = false;

  private get commands(): Command[] {
    return [
      { format: 'bold', label: 'B', title: msg('Bold'), prefix: '**' },
      { format: 'italic', label: 'I', title: msg('Italic'), prefix: '_' },
      {
        format: 'h1',
        label: 'H1',
        title: msg('Heading 1'),
        prefix: '# ',
        lines: true
      },
      {
        format: 'h2',
        label: 'H2',
        title: msg('Heading 2'),
        prefix: '## ',
        lines: true
      },
      {
        format: 'h3',
        label: 'H3',
        title: msg('Heading 3'),
        prefix: '### ',
        lines: true
      },
      {
        format: 'bullet',
        label: 'List',
        title: msg('Bulleted list'),
        prefix: '* ',
        lines: true
      },
      {
        format: 'number',
        label: '1.',
        title: msg('Numbered list'),
        prefix: '1. ',
        lines: true
      },
      {
        format: 'quote',
        label: 'Quote',
        title: msg('Quote'),
        prefix: '> ',
        lines: true
      },
      { format: 'code', label: 'Code', title: msg('Code'), prefix: '`' },
      {
        format: 'link',
        label: 'Link',
        title: msg('Link'),
        prefix: '[',
        suffix: '](https://)'
      },
      {
        format: 'columns',
        label: 'Columns',
        title: msg('Side by side columns'),
        prefix: ''
      }
    ];
  }

  /** the whole document textarea, only present in source mode */
  public get textArea(): HTMLTextAreaElement {
    return this.shadowRoot?.querySelector('textarea.document');
  }

  /** the rendered document, only present in rich mode */
  public get doc(): HTMLElement {
    return this.shadowRoot?.querySelector('.doc');
  }

  public connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('selectionchange', this.handleSelectionChange);
  }

  public disconnectedCallback(): void {
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    super.disconnectedCallback();
  }

  protected willUpdate(changes: PropertyValues): void {
    super.willUpdate(changes);

    if (!changes.has('value') && !changes.has('sourceMode')) {
      return;
    }

    // Rebuild the blocks unless the value is the one they just serialized to - an edit has already updated them, and
    // rebuilding would throw away the document the caret is sitting in. Comparing rather than flagging means a value
    // set from outside is always picked up, including one that arrives while an edit is in flight. Switching modes
    // always re-reads, which is what keeps the two views in step.
    if (
      changes.has('sourceMode') ||
      this.blocks.length === 0 ||
      joinBlocks(this.blocks) !== (this.value || '')
    ) {
      this.blocks = splitBlocks(this.value || '');
      this.tail = this.blocks[this.blocks.length - 1].trailer;
      this.stale = true;
    }
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (this.stale && !this.sourceMode && this.doc) {
      this.populate();
      this.stale = false;
    }
  }

  // ==========================================================
  // The rendered document
  // ==========================================================

  /**
   * Renders the blocks into the document and files each one under the elements it produced, so that reading the
   * document back can tell an edited block from one that only got rendered.
   */
  private populate(): void {
    const doc = this.doc;
    const scratch = document.createElement('div');
    const parts: string[] = [];
    const counts: number[] = [];

    for (const block of this.blocks) {
      const rendered = renderBlock(block.source);
      scratch.innerHTML = rendered;

      const elements = [...scratch.children];

      if (elements.length === 0) {
        // A blank block is where an empty article starts, so it has to be a paragraph the caret can go in. A block
        // that has content but renders to nothing - a link reference definition - is held onto invisibly instead,
        // since there's nothing to show and dropping it would lose it.
        parts.push(
          block.source.trim()
            ? `<div class="${LOCKED} empty" contenteditable="false"></div>`
            : EMPTY_BLOCK
        );
        counts.push(1);
      } else if (!elements.every(isSerializable)) {
        // Content the serializer can't write back out - a table, or whatever a future renderer starts emitting - is
        // rendered inside one element that can't be edited, so it survives a save exactly as it was authored.
        parts.push(
          `<div class="${LOCKED}" contenteditable="false">${rendered}</div>`
        );
        counts.push(1);
      } else {
        parts.push(rendered);
        counts.push(elements.length);
      }
    }

    doc.innerHTML = parts.join('');

    // the renderer separates blocks with newlines, and at the top level those are formatting rather than content -
    // left there they'd each become a paragraph of their own the first time the document was tidied up
    for (const node of [...doc.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
        node.remove();
      }
    }

    // Sizing classes go on before the blocks are filed, so a decorated image is part of what its block rendered as
    // rather than an edit to it.
    for (const img of [...doc.querySelectorAll('img')]) {
      decorateImage(img as HTMLImageElement);
    }

    const children = [...doc.children];
    let at = 0;

    this.runs = new WeakMap();
    this.trailers = new WeakMap();

    this.blocks.forEach((block, index) => {
      const elements = children.slice(at, at + counts[index]);
      at += counts[index];

      if (elements.length > 0) {
        this.runs.set(elements[0], {
          source: block.source,
          rest: elements.slice(1),
          signature: signatureOf(elements)
        });
        this.trailers.set(elements[elements.length - 1], block.trailer);
      }
    });
  }

  private isLocked(element: Element): boolean {
    return element.classList.contains(LOCKED);
  }

  /**
   * Reads the document back to markdown. A block whose elements are still the ones it was rendered into, unchanged,
   * hands back the markdown it was authored with; only a block that has actually been edited is written out from what
   * it now renders as.
   */
  private serialize(): void {
    const children = [...this.doc.children];
    const blocks: Block[] = [];
    let at = 0;

    while (at < children.length) {
      const first = children[at];
      const run = this.runs.get(first);

      if (this.isLocked(first)) {
        blocks.push({
          source: run ? run.source : '',
          trailer: this.trailers.get(first) || ''
        });
        at += 1;
        continue;
      }

      const elements = run ? [first, ...run.rest] : [first];
      const intact =
        run &&
        at + elements.length <= children.length &&
        elements.every((element, index) => children[at + index] === element) &&
        signatureOf(elements) === run.signature;

      if (intact) {
        blocks.push({
          source: run.source,
          trailer: this.trailers.get(elements[elements.length - 1]) || ''
        });
        at += elements.length;
        continue;
      }

      // Edited, so it gets written out from what it renders as - and filed again, so the next keystroke only has to
      // compare against it rather than serialize the whole block a second time.
      const source = blockOf(first);
      this.runs.set(first, {
        source,
        rest: [],
        signature: signatureOf([first])
      });

      blocks.push({ source, trailer: this.trailers.get(first) || '' });
      at += 1;
    }

    // Only the last block can end without a blank line after it - anywhere else that would run the two blocks either
    // side of the gap together into one.
    blocks.forEach((block, index) => {
      if (index < blocks.length - 1 && !block.trailer) {
        block.trailer = '\n';
      }
    });

    if (blocks.length > 0) {
      blocks[blocks.length - 1].trailer = this.tail;
    }

    this.blocks = blocks;
    this.value = joinBlocks(blocks);
  }

  /**
   * Puts right the markup the browser leaves behind. Editing a contenteditable is the browser's, and what it produces
   * is close to but not quite the flat list of block elements the document is modelled as: a new line after a heading
   * arrives as a <div>, making a list nests the list inside the block it started from, and a paste can drop text in
   * loose at the top level. Each of those is corrected here rather than prevented, so the editing itself stays native.
   *
   * Nothing is touched in the ordinary case, which is what keeps typing cheap - `before` is only called if something
   * actually has to change, and only then does the caret have to be put back.
   */
  private repair(inputType: string, before: () => void): boolean {
    const doc = this.doc;
    let changed = false;

    const change = () => {
      if (!changed) {
        before();
        changed = true;
      }
    };

    for (const node of [...doc.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) {
        change();
        if (node.textContent.trim()) {
          const paragraph = document.createElement('p');
          node.replaceWith(paragraph);
          paragraph.appendChild(node);
        } else {
          node.remove();
        }
        continue;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        change();
        node.remove();
        continue;
      }

      const element = node as Element;
      if (this.isLocked(element)) {
        continue;
      }

      // making a list leaves it nested inside the block it was made from, which is not somewhere a list can live -
      // and an inserted table can land inside a paragraph the same way
      const nested = element.querySelector(
        ':scope > ul, :scope > ol, :scope > table'
      );
      if (
        nested &&
        element.tagName !== 'UL' &&
        element.tagName !== 'OL' &&
        element.tagName !== 'TABLE' &&
        element.childNodes.length === 1
      ) {
        change();
        element.replaceWith(nested);
        continue;
      }

      if (!TOP_LEVEL.has(element.tagName)) {
        change();

        if (element.tagName === 'DIV') {
          // the browser's own wrapper for a new line, which is a paragraph by any other name
          retag(element, 'p');
        } else {
          // Something inline the browser left loose at the top level - an image it decided to put outside the
          // paragraph, say. It's content, so it gets a paragraph to live in; turning it into one would throw it away.
          const paragraph = document.createElement('p');
          element.replaceWith(paragraph);
          paragraph.appendChild(element);
        }
      }
    }

    // styling the browser applied as markup we don't model - the text is kept, the wrapper isn't
    for (const wrapper of [...doc.querySelectorAll('span,font')]) {
      if (wrapper.closest(`.${LOCKED}`)) {
        continue;
      }
      change();
      wrapper.replaceWith(...wrapper.childNodes);
    }

    // and the styles it hangs off what it inserts, which markdown has no way to carry and which would otherwise
    // accumulate on the elements the author edits. A cell's style stays - its alignment lives there, put there by
    // the renderer, and the ruler row is read back from it.
    for (const styled of [...doc.querySelectorAll('[style]')]) {
      if (
        styled.closest(`.${LOCKED}`) ||
        styled.tagName === 'TH' ||
        styled.tagName === 'TD'
      ) {
        continue;
      }
      change();
      styled.removeAttribute('style');
    }

    // Whatever the last block standing is, it keeps the tag it had - so emptying an article that began with a heading
    // leaves an empty heading, and typing over a select-all writes the new text as one. Neither is what the author
    // asked for: they cleared the article, and what they type next is a paragraph until they say otherwise.
    const emptied =
      !doc.textContent.trim() && !doc.querySelector('img,hr,table,.locked');

    if (
      doc.children.length === 0 ||
      ((this.replacing || inputType.startsWith('delete')) && emptied)
    ) {
      change();
      doc.innerHTML = EMPTY_BLOCK;
    } else if (
      this.replacing &&
      doc.children.length === 1 &&
      doc.children[0].tagName !== 'P' &&
      !this.isLocked(doc.children[0])
    ) {
      change();
      retag(doc.children[0], 'p');
    }

    this.replacing = false;

    return changed;
  }

  // ==========================================================
  // The caret
  // ==========================================================

  private get selection(): Selection {
    return getSelectionFromRoot(this.doc || this);
  }

  private get range(): Range {
    const selection = this.selection;
    const range =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    return range && this.doc && this.doc.contains(range.startContainer)
      ? range
      : null;
  }

  /**
   * Whether the selection covers the whole document, which is what select-all leaves behind.
   *
   * Measured in text rather than by comparing the selection's boundaries against the document's, because the browser
   * normalizes a select-all down to the text nodes at either end - so its start sits inside the first block rather
   * than in front of it, and a boundary comparison says it covers nothing. More than one block has to be in it, so
   * that retyping the whole of a one line heading isn't read as replacing the article.
   */
  private coversDocument(): boolean {
    const range = this.range;
    if (!range || range.collapsed || this.doc.children.length < 2) {
      return false;
    }

    const text = this.doc.textContent;
    return text.length > 0 && range.toString().length >= text.length;
  }

  /** the top level block the caret is in */
  private blockAt(node: Node): Element {
    let at = node;
    while (at && at.parentNode !== this.doc) {
      at = at.parentNode;
    }
    return at && at.nodeType === Node.ELEMENT_NODE ? (at as Element) : null;
  }

  /** where the caret is, as a block and an offset into its text, which survives the markup being rearranged */
  private caretPath(): Caret {
    const range = this.range;
    if (!range) {
      return null;
    }

    const block = this.blockAt(range.startContainer);
    if (!block) {
      return null;
    }

    const measure = document.createRange();
    measure.selectNodeContents(block);
    measure.setEnd(range.startContainer, range.startOffset);

    return {
      index: [...this.doc.children].indexOf(block),
      offset: measure.toString().length
    };
  }

  private restoreCaret(caret: Caret): void {
    const children = [...this.doc.children];
    if (!caret || children.length === 0) {
      return;
    }

    const block = children[Math.min(caret.index, children.length - 1)];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const range = document.createRange();

    let seen = 0;
    let node: Text;
    let placed = false;

    while ((node = walker.nextNode() as Text)) {
      if (seen + node.length >= caret.offset) {
        range.setStart(node, caret.offset - seen);
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
    this.select(range);
  }

  private select(range: Range): void {
    const selection = this.selection;
    if (!selection) {
      return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Puts the caret in the document if it isn't there already, back where it last was. The toolbar and uploads both
   * need somewhere to write even when nothing is focused.
   */
  private focusDocument(): boolean {
    const doc = this.doc;
    if (!doc || this.disabled) {
      return false;
    }

    // Read where the caret is before focusing, not after: focusing a contenteditable that doesn't have the caret puts
    // one at the very top, which would silently make every toolbar command and every upload act on the first block
    // instead of wherever the author actually was.
    const live = this.shadowRoot.activeElement === doc ? this.range : null;

    doc.focus();

    if (live) {
      return true;
    }

    if (this.saved && doc.contains(this.saved.startContainer)) {
      this.select(this.saved);
      return true;
    }

    const range = document.createRange();
    range.selectNodeContents(doc.lastElementChild || doc);
    range.collapse(false);
    this.select(range);

    return true;
  }

  // ==========================================================
  // Editing
  // ==========================================================

  /** reads the document back and tells anyone listening, after an edit the browser has already made */
  private edited(inputType = ''): void {
    let caret: Caret = null;

    if (this.repair(inputType, () => (caret = this.caretPath()))) {
      this.restoreCaret(caret);
    }

    this.serialize();
    this.fireEvent('change');
  }

  private handleInput(evt: InputEvent): void {
    if (this.sourceMode) {
      this.value = (evt.target as HTMLTextAreaElement).value;
      this.fireEvent('change');
      return;
    }

    this.edited(evt.inputType || '');
  }

  private handleBeforeInput(evt: InputEvent): void {
    // Noted before the edit rather than after, because afterwards there's no telling a select-all that was typed over
    // from an ordinary edit inside the one block that's left.
    this.replacing = this.coversDocument();

    if (
      evt.inputType !== 'insertParagraph' &&
      evt.inputType !== 'insertLineBreak'
    ) {
      return;
    }

    const range = this.range;

    // a cell is one line of inline content - there is no block inside it for a newline to split
    if (this.cellAt(range)) {
      evt.preventDefault();
      return;
    }

    const block = range && this.blockAt(range.startContainer);
    if (!block || block.tagName !== 'PRE') {
      return;
    }

    // A fenced block is one block however many lines it has, but the browser splits it in two on Enter - and so does
    // every execCommand that inserts a break. So the newline goes in by hand.
    evt.preventDefault();

    range.deleteContents();
    const newline = document.createTextNode('\n');
    range.insertNode(newline);

    // a newline at the very end of a <pre> isn't rendered, so the caret would have nowhere to sit
    if (!newline.nextSibling) {
      newline.parentNode.insertBefore(
        document.createTextNode('\n'),
        newline.nextSibling
      );
    }

    const after = document.createRange();
    after.setStartAfter(newline);
    after.collapse(true);
    this.select(after);

    this.edited(evt.inputType);
  }

  private handleKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Escape') {
      evt.preventDefault();
      this.doc?.blur();
      return;
    }

    // inside a table, Tab is how the caret gets from one cell to the next
    if (evt.key === 'Tab') {
      const cell = this.cellAt(this.range);
      if (!cell) {
        return;
      }

      evt.preventDefault();

      // only the cells that are visible - a layout table's blank header is hidden, and tabbing into it would put
      // the caret somewhere the author can't see
      const cells = [
        ...cell.closest('table').querySelectorAll('th, td')
      ].filter((candidate) => (candidate as HTMLElement).offsetWidth > 0);

      const next = cells[cells.indexOf(cell) + (evt.shiftKey ? -1 : 1)];
      if (next) {
        const inside = document.createRange();
        inside.selectNodeContents(next);
        inside.collapse(false);
        this.select(inside);
      }
    }
  }

  /** the table cell the caret is sitting in, or null when it isn't in one */
  private cellAt(range: Range): Element {
    const node = range?.startContainer;
    if (!node) {
      return null;
    }
    const element =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement;
    const cell = element?.closest('td, th');
    return cell && this.doc?.contains(cell) ? cell : null;
  }

  /**
   * A click on a link is the author reaching for the text, so it places the caret and never navigates - following the
   * link would take the unsaved article with it. Holding cmd (or ctrl) is asking to see where it goes, which opens in
   * a window of its own so the draft stays where it is.
   */
  private handleDocClick(evt: MouseEvent): void {
    const target = evt.target as Element;

    // a click on an image is the way its size and layout get edited - anywhere else puts the options away. An image
    // in a locked block stays as authored, so there is nothing to offer it.
    const image =
      target instanceof HTMLImageElement && !target.closest(`.${LOCKED}`)
        ? target
        : null;
    if (image !== this.image) {
      this.image = image;
    }

    const anchor = target.closest?.('a');
    if (!anchor) {
      return;
    }

    evt.preventDefault();

    if (evt.metaKey || evt.ctrlKey) {
      window.open(anchor.href, '_blank', 'noopener');
    }
  }

  private handleDocBlur(): void {
    const range = this.range;
    if (range) {
      this.saved = range.cloneRange();
    }
  }

  private handleSelectionChange = (): void => {
    if (this.sourceMode || !this.doc) {
      return;
    }

    // the image the bar was editing can be rebuilt out from under it - by an undo, or a value set from outside
    if (this.image && !this.image.isConnected) {
      this.image = null;
    }

    const range = this.range;
    if (!range) {
      return;
    }

    this.saved = range.cloneRange();
    this.refreshActive();
  };

  /** works out what the caret is sitting in so the toolbar can say so */
  private refreshActive(): void {
    const range = this.range;
    const block = range && this.blockAt(range.startContainer);

    const on: string[] = [];

    // a block that isn't edited here has nothing to say about the toolbar, and offering to edit a link inside one
    // would be offering an edit that goes nowhere
    if (block && !this.isLocked(block)) {
      const node =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement;

      // Read off the markup rather than from queryCommandState, which answers for the rendered weight and so calls
      // every heading bold - which would light the button up on text that carries no emphasis of its own, and invite
      // a click that writes markup to cancel emphasis that was never there.
      if (node?.closest('strong,b')) {
        on.push('bold');
      }
      if (node?.closest('em,i')) {
        on.push('italic');
      }
      if (node?.closest('code')) {
        on.push('code');
      }
      if (/^H[1-3]$/.test(block.tagName)) {
        on.push(block.tagName.toLowerCase());
      }
      if (block.tagName === 'UL') {
        on.push('bullet');
      }
      if (block.tagName === 'OL') {
        on.push('number');
      }
      if (block.tagName === 'BLOCKQUOTE' || node?.closest('blockquote')) {
        on.push('quote');
      }

      this.anchor = node?.closest('a') as HTMLAnchorElement;
      if (this.anchor) {
        on.push('link');
      }
    } else {
      this.anchor = null;
    }

    if (on.join(',') !== this.active.join(',')) {
      this.active = on;
    }

    const href = this.anchor ? this.anchor.getAttribute('href') || '' : null;
    if (href !== this.linkHref) {
      this.linkHref = href;
    }
  }

  private exec(command: string, value: string = null): void {
    document.execCommand(command, false, value);
  }

  private async applyFormat(command: Command): Promise<void> {
    if (this.sourceMode) {
      this.applySourceFormat(command);
      return;
    }

    if (!this.focusDocument()) {
      return;
    }

    // markup rather than inline styles, so what comes out is something markdown can say
    this.exec('styleWithCSS', 'false');

    const range = this.range;
    const block = range && this.blockAt(range.startContainer);
    const on = this.active.includes(command.format);

    switch (command.format) {
      case 'bold':
      case 'italic':
        this.exec(command.format);
        break;

      case 'code':
        this.toggleCode(on);
        break;

      case 'h1':
      case 'h2':
      case 'h3':
        this.exec('formatBlock', on ? 'p' : command.format);
        break;

      case 'bullet':
        this.exec('insertUnorderedList');
        break;

      case 'number':
        this.exec('insertOrderedList');
        break;

      case 'quote':
        // a quote is a wrapper rather than a tag on the block, so coming out of one means saying what the block is
        this.exec('formatBlock', on ? 'p' : 'blockquote');
        break;

      case 'link':
        this.startLink(block);
        break;

      case 'columns':
        this.insertColumns();
        break;
    }

    this.edited();
    this.refreshActive();

    if (command.format === 'link') {
      await this.updateComplete;
      this.shadowRoot
        ?.querySelector<HTMLInputElement>('.linkbar input')
        ?.focus();
    }
  }

  private toggleCode(on: boolean): void {
    const range = this.range;
    if (!range) {
      return;
    }

    if (on) {
      const node =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement;
      const code = node?.closest('code');
      if (code) {
        code.replaceWith(...code.childNodes);
      }
      return;
    }

    const selected = range.toString();
    this.exec(
      'insertHTML',
      `<code>${escapeHtml(selected || msg('code'))}</code>`
    );
  }

  private startLink(block: Element): void {
    if (this.anchor) {
      return;
    }

    const range = this.range;
    const selected = range ? range.toString() : '';

    if (selected) {
      this.exec('createLink', 'https://');
    } else {
      this.exec(
        'insertHTML',
        `<a href="https://">${escapeHtml(msg('link'))}</a>`
      );
    }

    // the caret has to be inside the new link for the link bar to find it
    const anchor = block?.querySelector('a[href="https://"]');
    if (anchor) {
      const inside = document.createRange();
      inside.selectNodeContents(anchor);
      inside.collapse(false);
      this.select(inside);
    }
  }

  private handleLinkInput(evt: Event): void {
    const href = (evt.target as HTMLInputElement).value;
    if (!this.anchor) {
      return;
    }

    this.anchor.setAttribute('href', href);
    this.linkHref = href;
    this.serialize();
    this.fireEvent('change');
  }

  private handleLinkRemove(): void {
    const anchor = this.anchor;
    if (!anchor) {
      return;
    }

    this.doc.focus();
    const range = document.createRange();
    range.selectNodeContents(anchor);
    this.select(range);
    this.exec('unlink');

    this.anchor = null;
    this.linkHref = null;
    this.edited();
  }

  /** writes a size or layout choice into the clicked image's fragment, which is the edit the image bar makes */
  private applyImageOption(key: 'size' | 'layout', value: string): void {
    const img = this.image;
    if (!img) {
      return;
    }

    const current = imageOptions(img.getAttribute('src') || '');
    const size = key === 'size' ? value : current.size;
    const layout = key === 'layout' ? value : current.layout;

    img.setAttribute(
      'src',
      withImageOptions(img.getAttribute('src') || '', size, layout)
    );
    decorateImage(img);

    // the image's block no longer matches what it rendered as, which is exactly what being edited means
    this.edited();
    this.requestUpdate();
  }

  /**
   * Inserts a two column row - a markdown table with nothing in its header, which the styles show as side by side
   * cells rather than data. A screenshot goes in one cell and the text explaining it in the other.
   */
  private insertColumns(): void {
    this.exec(
      'insertHTML',
      '<table><thead><tr><th></th><th></th></tr></thead>' +
        '<tbody><tr><td><br></td><td><br></td></tr></tbody></table>'
    );

    // the insert leaves the caret after the table, and the author is about to fill the first cell
    const range = this.range;
    let block = range ? this.blockAt(range.startContainer) : null;
    if (
      block &&
      block.tagName !== 'TABLE' &&
      block.previousElementSibling?.tagName === 'TABLE'
    ) {
      block = block.previousElementSibling;
    }

    const cell = block?.tagName === 'TABLE' ? block.querySelector('td') : null;
    if (cell) {
      const inside = document.createRange();
      inside.selectNodeContents(cell);
      inside.collapse(true);
      this.select(inside);
    }
  }

  /** the same commands in source mode, where there is nothing rendered to act on and markdown is what the caret is in */
  private applySourceFormat(command: Command): void {
    const area = this.textArea;
    if (!area) {
      return;
    }

    const text = area.value;
    let start = area.selectionStart;
    const end = area.selectionEnd;

    if (command.format === 'columns') {
      // a table is a block, so it starts on its own line with a blank line either side
      const table = '|  |  |\n| --- | --- |\n|  |  |';
      const before = text.substring(0, start);
      const after = text.substring(end);
      const lead = !before.trim()
        ? ''
        : before.endsWith('\n\n')
          ? ''
          : before.endsWith('\n')
            ? '\n'
            : '\n\n';
      const tail = !after.trim()
        ? ''
        : after.startsWith('\n\n')
          ? ''
          : after.startsWith('\n')
            ? '\n'
            : '\n\n';

      area.value = before + lead + table + tail + after;
      this.value = area.value;
      this.fireEvent('change');

      // the caret goes into the first cell of the body row
      const caret = start + lead.length + table.lastIndexOf('\n') + 3;
      area.focus();
      area.setSelectionRange(caret, caret);
      return;
    }

    if (command.lines) {
      // block markers apply from the start of the line the selection begins on, and to every line it covers - marking
      // only the first would turn a three line selection into one list item and two loose lines
      start = start > 0 ? text.lastIndexOf('\n', start - 1) + 1 : 0;
      const marked = text
        .substring(start, end)
        .split('\n')
        .map((line) => command.prefix + line)
        .join('\n');

      area.value = text.substring(0, start) + marked + text.substring(end);
      this.value = area.value;
      this.fireEvent('change');
      area.focus();
      area.setSelectionRange(
        start + command.prefix.length,
        start + command.prefix.length
      );
      return;
    }

    const selected = text.substring(start, end);
    const suffix = command.suffix ?? command.prefix;
    const replacement = command.prefix + selected + suffix;

    area.value = text.substring(0, start) + replacement + text.substring(end);
    this.value = area.value;
    this.fireEvent('change');

    const caret = selected
      ? end + command.prefix.length + suffix.length
      : start + command.prefix.length;

    area.focus();
    area.setSelectionRange(caret, caret);
  }

  // ==========================================================
  // Pasting and dropping
  // ==========================================================

  private handleDragOver(evt: DragEvent): void {
    // a div isn't a drop target until something says the drag is welcome, and without this the browser navigates to
    // the dropped image and takes the unsaved article with it
    evt.preventDefault();
  }

  private handleDrop(evt: DragEvent): void {
    const files = [...(evt.dataTransfer?.files || [])];
    if (files.length > 0) {
      evt.preventDefault();
      this.upload(files);
    }
  }

  private handlePaste(evt: ClipboardEvent): void {
    // a screenshot on the clipboard arrives as a file with no name, which is the common way to add one
    const files = [...(evt.clipboardData?.items || [])]
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file) => !!file);

    if (files.length > 0) {
      evt.preventDefault();
      this.upload(files);
      return;
    }

    if (this.sourceMode) {
      return;
    }

    const clipboard = evt.clipboardData;
    const pasted = clipboard?.getData('text/html');
    const text = clipboard?.getData('text/plain') || '';

    if (!pasted && !text) {
      return;
    }

    evt.preventDefault();

    // Markup off the clipboard is put through the same round trip the document itself takes - read to markdown, then
    // rendered back - so nothing can land in the document that the editor couldn't have produced or couldn't write
    // out again. Anything it can't express falls back to the plain text, which is what a paste from outside is.
    const source = pasted ? this.markdownOf(pasted, text) : null;

    this.exec(
      'insertHTML',
      source === null
        ? text
            .split(/\n{2,}/)
            .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
            .join('')
        : /\n\s*\n/.test(source)
          ? renderBlock(source)
          : markdown.renderInline(source)
    );

    this.edited('insertFromPaste');
  }

  /** the markdown for pasted markup, or null when it isn't anything the document could hold */
  private markdownOf(pasted: string, text: string): string {
    // parsed inert, so nothing in it loads or runs on the way past
    const parsed = new DOMParser().parseFromString(pasted, 'text/html');
    const blocks = [...parsed.body.children].filter(isSerializable);

    if (blocks.length === 0) {
      return text ? null : parsed.body.textContent;
    }

    return blocks.map((block) => blockOf(block)).join('\n\n');
  }

  // ==========================================================
  // Screenshots
  // ==========================================================

  private handleUploadClick(): void {
    (
      this.shadowRoot.querySelector('#upload-input') as HTMLInputElement
    ).click();
  }

  private handleFileInput(evt: any): void {
    this.upload([...evt.target.files]);
    evt.target.value = null;
  }

  private async upload(files: File[]): Promise<void> {
    if (!this.endpoint) {
      return;
    }

    this.error = '';
    this.uploading = true;

    // Where the images go, fixed before anything else is awaited. An upload takes seconds and the author is free to
    // click somewhere else while it runs, so reading the caret when the url comes back would put the image wherever
    // they happen to have moved to.
    const source = this.sourceMode;
    let target: Range = null;
    let start = 0;
    let end = 0;

    if (source) {
      start = this.textArea?.selectionStart ?? 0;
      end = this.textArea?.selectionEnd ?? 0;
    } else {
      if (!this.focusDocument()) {
        this.uploading = false;
        return;
      }
      target = this.range?.cloneRange();
    }

    for (const file of files) {
      const data = new FormData();
      data.append('file', file);

      try {
        const response = await postFormData(this.endpoint, data);

        // a session that expired mid-upload redirects to a login page, which resolves as a success with nothing we
        // can use - so the url has to be there before we write a reference to it
        if (response.json.error || !response.json.url) {
          this.error = response.json.error || msg('Unable to upload file.');
          break;
        }

        // the name is alt text inside brackets, and clean_name deliberately keeps [ ] ( ) in filenames
        const alt = (response.json.name || '').replace(/[[\]()]/g, '');

        if (source) {
          const reference = `![${alt}](${response.json.url})`;
          const document = this.value || '';
          this.value =
            document.substring(0, start) + reference + document.substring(end);
          this.fireEvent('change');

          // the next file goes after this one rather than in front of it
          start += reference.length;
          end = start;
        } else {
          target = this.insertImage(target, response.json.url, alt);
        }
      } catch (e) {
        this.error = msg('Unable to upload file.');
        break;
      }
    }

    this.uploading = false;

    if (source) {
      await this.updateComplete;
      this.textArea?.setSelectionRange(start, start);
    }
  }

  /**
   * Puts an image where the author asked for it and hands back where the next one goes. The insert runs through the
   * browser so it lands in the undo stack, which means moving the selection there first - and back again afterwards if
   * the author has moved on in the meantime, since being yanked back mid-sentence is worse than not seeing it land.
   */
  private insertImage(target: Range, url: string, alt: string): Range {
    const doc = this.doc;
    if (!doc || !target || !doc.contains(target.startContainer)) {
      return target;
    }

    const current = this.range?.cloneRange();
    const moved =
      current &&
      (current.startContainer !== target.startContainer ||
        current.startOffset !== target.startOffset);

    doc.focus();
    this.select(target);
    this.exec(
      'insertHTML',
      `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">`
    );

    const after = this.range?.cloneRange() || target;

    if (moved && doc.contains(current.startContainer)) {
      this.select(current);
    }

    return after;
  }

  // ==========================================================
  // Rendering
  // ==========================================================

  public render(): TemplateResult {
    return this.renderField();
  }

  /** A floor under the document, which a filled editor doesn't get - it's the container that's being sized, and an
   * inline minimum here would win over the flex rules and put the scroll back on the page. */
  private get documentStyle(): string {
    return this.fill ? '' : `min-height:${this.minHeight}px`;
  }

  /** the options for the clicked image, offered the way the link bar offers a link - without ever showing markdown */
  private renderImageBar(): TemplateResult {
    const current = imageOptions(this.image.getAttribute('src') || '');

    const sizes = [
      { value: '', label: msg('Original') },
      { value: 'small', label: msg('Small') },
      { value: 'medium', label: msg('Medium') },
      { value: 'large', label: msg('Large') }
    ];

    const layouts = [
      { value: '', label: msg('Block') },
      { value: 'inline', label: msg('Inline') }
    ];

    // block is the default, so an image that asks for it explicitly lights the same option as one that doesn't ask
    const layout = current.layout === 'block' ? '' : current.layout;

    const option = (
      key: 'size' | 'layout',
      value: string,
      label: string
    ) => html`
      <div
        class="option ${key} ${(key === 'size' ? current.size : layout) ===
        value
          ? 'on'
          : ''}"
        @click=${() => this.applyImageOption(key, value)}
      >
        ${label}
      </div>
    `;

    return html`
      <div
        class="imagebar"
        @mousedown=${(evt: MouseEvent) => evt.preventDefault()}
      >
        <div class="dimension">${msg('Size')}</div>
        ${sizes.map((size) => option('size', size.value, size.label))}
        <div class="divider"></div>
        <div class="dimension">${msg('Layout')}</div>
        ${layouts.map((layout) => option('layout', layout.value, layout.label))}
      </div>
    `;
  }

  private renderSource(): TemplateResult {
    return html`
      <textarea
        class="document"
        style=${this.documentStyle}
        .value=${this.value || ''}
        ?disabled=${this.disabled}
        @input=${this.handleInput}
        @drop=${this.handleDrop}
        @paste=${this.handlePaste}
      ></textarea>
    `;
  }

  protected renderWidget(): TemplateResult {
    return html`
      <div class="container">
        <div class="chrome">
          <div
            class="toolbar"
            @mousedown=${(evt: MouseEvent) => evt.preventDefault()}
          >
            ${this.commands.map(
              (command) => html`
                <div
                  class="format ${command.format} ${this.active.includes(
                    command.format
                  )
                    ? 'on'
                    : ''}"
                  title="${command.title}"
                  @click=${() => this.applyFormat(command)}
                >
                  ${command.label}
                </div>
              `
            )}
            <temba-icon
              name="${Icon.attachment}"
              title="${msg('Screenshot')}"
              class="${this.uploading ? 'uploading' : ''}"
              @click=${this.handleUploadClick}
            ></temba-icon>
            <div class="spacer"></div>
            <div
              class="toggle"
              @click=${() => (this.sourceMode = !this.sourceMode)}
            >
              ${this.sourceMode ? msg('Rich text') : msg('Markdown')}
            </div>
          </div>
          ${this.linkHref !== null && !this.sourceMode
            ? html`<div class="linkbar">
                <input
                  type="text"
                  .value=${this.linkHref}
                  placeholder="https://"
                  @input=${this.handleLinkInput}
                />
                <div class="link-action" @click=${this.handleLinkRemove}>
                  ${msg('Remove')}
                </div>
              </div>`
            : null}
          ${this.image?.isConnected && !this.sourceMode
            ? this.renderImageBar()
            : null}
        </div>
        ${this.sourceMode
          ? this.renderSource()
          : html`
              <div
                class="doc"
                style=${this.documentStyle}
                contenteditable=${this.disabled ? 'false' : 'true'}
                @beforeinput=${this.handleBeforeInput}
                @input=${this.handleInput}
                @click=${this.handleDocClick}
                @keydown=${this.handleKeyDown}
                @blur=${this.handleDocBlur}
                @dragenter=${this.handleDragOver}
                @dragover=${this.handleDragOver}
                @drop=${this.handleDrop}
                @paste=${this.handlePaste}
              ></div>
            `}
        ${this.error ? html`<div class="error">${this.error}</div>` : null}
        <input
          id="upload-input"
          type="file"
          accept="${this.accept}"
          multiple
          style="display:none"
          @change=${this.handleFileInput}
        />
      </div>
    `;
  }
}
