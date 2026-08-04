import { PropertyValues, TemplateResult, css, html } from 'lit';
import { msg } from '@lit/localize';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { lru } from 'tiny-lru';
import { FieldElement } from './FieldElement';
import { Icon } from '../Icons';
import { markdown } from '../markdown';
import { postFormData } from '../utils';

interface Formatting {
  label: string;
  title: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

/**
 * A top level chunk of the document - a paragraph, heading, list, fenced block, and so on.
 *
 * A block keeps the markdown it was authored with rather than anything derived from it, so a document that is only
 * partly edited comes back out byte for byte apart from the block that was touched. That's the whole reason the editor
 * models the document this way instead of parsing to a tree and serializing back: a round trip through an AST would
 * renormalize headings, emphasis markers, bullet characters and line wrapping across content nobody edited, and article
 * bodies have to stay diffable.
 */
export interface Block {
  /** the block's markdown, exactly as authored */
  source: string;
  /** the blank lines that followed it, kept so untouched documents serialize back unchanged */
  trailer: string;
}

const LIST_ITEM = /^ {0,3}([-*+]|\d+[.)])\s/;
const FENCE = /^ {0,3}(```|~~~)/;
// a fence only closes on a line that is nothing but fence characters, so an info string like ```js opens rather than
// closes the block it appears in
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/;
const QUOTE = /^ {0,3}>/;
const HEADING = /^ {0,3}(#{1,6})\s/;
const SETEXT = /^ {0,3}(=+|-+)\s*$/;
const INDENTED = /^ {4,}\S/;
const CONTINUATION = /^ {2,}\S/;

// rendering the same block over and over is the common case - only the block being edited changes while the rest of
// the document sits there, and every keystroke re-runs render()
const renderCache = lru<string>(200);

const isBlank = (line: string) => line.trim() === '';

/**
 * Whether a blank line between the block built so far and the next line of content is inside the block rather than a
 * boundary. Blank lines separate blocks except where markdown says otherwise - a loose list, a list item with more than
 * one paragraph, and a blockquote all survive them.
 */
const continues = (body: string[], line: string): boolean => {
  const first = body.find((l) => !isBlank(l));
  if (!first) {
    return true;
  }

  if (LIST_ITEM.test(first)) {
    return LIST_ITEM.test(line) || CONTINUATION.test(line);
  }

  if (QUOTE.test(first)) {
    return QUOTE.test(line);
  }

  return false;
};

/**
 * Splits markdown into blocks, assigning every line to exactly one block or to the blank run that follows it, so
 * joinBlocks is an exact inverse.
 */
export const splitBlocks = (source: string): Block[] => {
  const blocks: Block[] = [];
  let body: string[] = [];
  let gap: string[] = [];
  let fence: string = null;

  const flush = () => {
    blocks.push({
      source: body.join('\n'),
      trailer: gap.length > 0 ? '\n' + gap.join('\n') : ''
    });
    body = [];
    gap = [];
  };

  for (const line of (source || '').split('\n')) {
    // a fenced block owns its blank lines, so nothing inside one is a boundary
    if (fence) {
      body.push(line);
      if (FENCE_CLOSE.test(line) && line.trimStart()[0] === fence[0]) {
        fence = null;
      }
      continue;
    }

    if (isBlank(line)) {
      // blank lines before any content belong to the first block, otherwise they'd be dropped
      if (body.length === 0) {
        body.push(line);
      } else {
        gap.push(line);
      }
      continue;
    }

    if (gap.length > 0) {
      if (continues(body, line)) {
        body.push(...gap);
        gap = [];
      } else {
        flush();
      }
    }

    body.push(line);

    const fenced = FENCE.exec(line);
    if (fenced) {
      fence = fenced[1];
    }
  }

  // an empty document still gets a block - there has to be somewhere to type
  if (body.length > 0 || gap.length > 0 || blocks.length === 0) {
    flush();
  }

  return blocks;
};

export const joinBlocks = (blocks: Block[]): string =>
  blocks.map((block) => block.source + block.trailer).join('\n');

/**
 * What a block looks like, so the block being edited can be typed like the thing it renders to instead of dropping to
 * undifferentiated source the moment the caret lands in it.
 */
export const blockKind = (source: string): string => {
  const lines = (source || '').split('\n');
  const at = lines.findIndex((line) => !isBlank(line));
  const first = at < 0 ? '' : lines[at];

  const heading = HEADING.exec(first);
  if (heading) {
    return 'h' + heading[1].length;
  }

  // a setext heading is underlined rather than marked, so what it is shows up on the line below
  const underline = at < 0 ? '' : lines[at + 1] || '';
  if (first && !LIST_ITEM.test(first) && SETEXT.test(underline)) {
    return underline.trimStart().startsWith('=') ? 'h1' : 'h2';
  }

  if (FENCE.test(first) || INDENTED.test(first)) {
    return 'code';
  }

  if (QUOTE.test(first)) {
    return 'quote';
  }

  if (LIST_ITEM.test(first)) {
    return 'list';
  }

  return 'para';
};

/**
 * Maps an offset in a block's rendered text back to an offset in its markdown by walking the two in step, skipping the
 * source characters rendering consumed and the line breaks it introduced between tags. It's a heuristic - alt text and
 * reference links can push it a character or two - but clicking into a paragraph and landing near where you clicked
 * beats always landing at the end.
 */
export const sourceOffset = (
  source: string,
  text: string,
  offset: number
): number => {
  let at = 0;
  let seen = 0;

  while (seen < offset && at < source.length) {
    if (source[at] === text[seen]) {
      seen++;
      at++;
    } else if (text[seen] === '\n' && source[at] !== '\n') {
      // markup puts a line break between block tags that the markdown never had, e.g. between list items
      seen++;
    } else {
      at++;
    }
  }

  return at;
};

/** whether a point is at or past a rect in reading order */
const reached = (rect: DOMRect, x: number, y: number): boolean =>
  y > rect.bottom || (y >= rect.top && x >= rect.left);

/**
 * The offset into an element's text nearest a point. document.caretRangeFromPoint would do this in one call but
 * doesn't reach into a shadow root, and the whole document lives in one - so the element's own text nodes get walked
 * to find the one under the point, then binary searched to find where in it the point falls.
 *
 * Text the layout dropped - the whitespace between tags - has no rects at all, which is what keeps it from being
 * mistaken for a position.
 */
export const textOffsetAt = (
  root: HTMLElement,
  x: number,
  y: number
): number => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();

  let seen = 0;
  let target: Text = null;
  let base = 0;
  let behind = 0;
  let node: Text;

  while ((node = walker.nextNode() as Text)) {
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()];

    if (rects.some((rect) => reached(rect, x, y))) {
      behind = seen + node.length;
    }

    if (
      rects.some((rect) => y >= rect.top && y <= rect.bottom && x >= rect.left)
    ) {
      target = node;
      base = seen;
    }

    seen += node.length;
  }

  // nothing on the point's line starts to its left, so the last thing entirely behind it is the answer
  if (!target) {
    return behind;
  }

  let low = 0;
  let high = target.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    range.setStart(target, mid);
    range.collapse(true);

    if (reached(range.getBoundingClientRect(), x, y)) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return base + low;
};

/**
 * An editor for markdown, rich by default: the document is rendered as you write it, and the block holding the caret
 * shows its markdown so what you edit is always the source of truth. A toggle swaps the whole document to raw markdown
 * and back. Screenshots upload by button, drop or paste.
 *
 * What gets stored is markdown, not rich text, so article bodies stay diffable, portable and cheap to chunk on heading
 * boundaries for search. That constraint is what shapes the implementation: the document is modelled as blocks that
 * hold the markdown they were authored with, and only the block being edited is ever rewritten, so a round trip leaves
 * untouched content exactly as it was.
 *
 * Rendering a block at a time is what makes that possible, and it costs the few markdown constructs that reach across
 * a blank line: a link reference definition renders to nothing on its own, so it shows as an empty block and the
 * paragraph using it shows the literal [text][1]. Everything an article actually uses renders.
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

      .toolbar {
        display: flex;
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

      .toolbar .spacer {
        flex-grow: 1;
      }

      .toolbar .toggle {
        cursor: pointer;
        font-size: 0.85em;
        color: var(--color-link-primary);
      }

      textarea {
        display: block;
        width: 100%;
        border: none;
        outline: none;
        padding: 0;
        margin: 0;
        background: transparent;
        color: var(--color-widget-text);
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        overflow: hidden;
        resize: none;
      }

      textarea.document {
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
      }

      /* the container already draws the focus ring for everything inside it */
      .doc:focus {
        outline: none;
      }

      /* article typography - the rendered block and the textarea that replaces it share it, so the document doesn't
         jump when the caret moves in or out of a block */
      .block {
        font-size: 0.95em;
        line-height: 1.5;
        margin: 0 0 0.6em 0;
        min-height: 1.2em;
      }

      .block.h1 {
        font-size: 1.5em;
        font-weight: var(--w-semibold);
        line-height: 1.25;
      }

      .block.h2 {
        font-size: 1.25em;
        font-weight: var(--w-semibold);
        line-height: 1.3;
      }

      .block.h3 {
        font-size: 1.1em;
        font-weight: var(--w-semibold);
        line-height: 1.35;
      }

      .block.h4,
      .block.h5,
      .block.h6 {
        font-size: 1em;
        font-weight: var(--w-semibold);
      }

      .block.code {
        font-family: var(--font-mono);
        font-size: 0.85em;
        background: var(--color-primary-light);
        border-radius: var(--curvature);
        padding: 0.5em 0.75em;
      }

      .block.quote {
        border-left: 3px solid var(--color-borders);
        padding-left: 0.75em;
        color: var(--color-text-help);
      }

      .rendered h1,
      .rendered h2,
      .rendered h3,
      .rendered h4,
      .rendered h5,
      .rendered h6,
      .rendered p,
      .rendered ul,
      .rendered ol,
      .rendered blockquote,
      .rendered pre {
        font-size: inherit;
        font-weight: inherit;
        line-height: inherit;
        margin: 0;
      }

      .rendered p + p {
        margin-top: 0.6em;
      }

      .rendered ul,
      .rendered ol {
        padding-left: 1.4em;
      }

      .rendered blockquote {
        border: none;
        padding: 0;
      }

      .rendered pre {
        white-space: pre-wrap;
      }

      .rendered code {
        font-family: var(--font-mono);
        font-size: 0.9em;
      }

      .rendered.code pre,
      .rendered.code code {
        background: transparent;
        font-size: inherit;
      }

      .rendered img {
        max-width: 100%;
        display: block;
      }

      /* links are for reading, and in an editor a click on one means put the caret here */
      .rendered a {
        color: var(--color-link-primary);
        pointer-events: none;
      }

      .rendered table {
        border-collapse: collapse;
      }

      .rendered th,
      .rendered td {
        border: 1px solid var(--color-borders);
        padding: 0.25em 0.5em;
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

  /** shows the whole document as raw markdown instead of rendering it */
  @property({ type: Boolean, attribute: 'source_mode' })
  sourceMode = false;

  @property({ type: Boolean })
  uploading = false;

  @property({ type: String })
  error = '';

  @state()
  blocks: Block[] = [];

  /** index of the block showing its markdown, -1 when the caret is outside the document */
  @state()
  active = -1;

  // where the caret goes once the active block's textarea exists
  private pendingCaret: number = null;

  // where the caret was when it last left the document, so the toolbar and uploads write back where the author was
  // rather than at the end of the article. Picking a file blurs the document - the dialog takes the window - so this
  // is the ordinary case for a screenshot, not an edge one.
  private resume: { index: number; caret: number } = null;

  // what the toolbar can wrap the selection in. Everything here is plain markdown, because markdown is what gets
  // stored and markdown is what the caret is sitting in whichever mode we're in - one implementation covers both.
  // Buttons are labelled rather than iconned - the shorthand is universal in editors and needs no new sprite entries.
  // Built per render so the labels pick up the active locale.
  private get formatting(): Formatting[] {
    return [
      { label: 'B', title: msg('Bold'), prefix: '**', suffix: '**' },
      { label: 'I', title: msg('Italic'), prefix: '_', suffix: '_' },
      {
        label: 'H',
        title: msg('Heading'),
        prefix: '## ',
        suffix: '',
        block: true
      },
      {
        label: 'List',
        title: msg('List'),
        prefix: '* ',
        suffix: '',
        block: true
      },
      { label: 'Link', title: msg('Link'), prefix: '[', suffix: '](https://)' },
      { label: 'Code', title: msg('Code'), prefix: '`', suffix: '`' }
    ];
  }

  /** the whole document textarea, only present in source mode */
  public get textArea(): HTMLTextAreaElement {
    return this.shadowRoot.querySelector('textarea.document');
  }

  /** the textarea for the block being edited, only present in rich mode with a block active */
  public get activeArea(): HTMLTextAreaElement {
    return this.shadowRoot.querySelector('textarea.editing');
  }

  protected willUpdate(changes: PropertyValues): void {
    super.willUpdate(changes);

    if (!changes.has('value') && !changes.has('sourceMode')) {
      return;
    }

    // Rebuild the blocks unless the value is the one they just serialized to - an edit inside a block has already
    // updated them, and re-splitting on every keystroke would rebuild the textarea the caret is sitting in. Comparing
    // rather than flagging means a value set from outside is always picked up, including one that arrives while an
    // edit is in flight. Switching modes always re-reads, which is what keeps the two views in step.
    if (
      changes.has('sourceMode') ||
      this.blocks.length === 0 ||
      joinBlocks(this.blocks) !== (this.value || '')
    ) {
      this.reparse();
    }
  }

  public updated(changes: Map<string, any>): void {
    super.updated(changes);

    if (this.pendingCaret !== null) {
      const area = this.activeArea;
      if (area) {
        this.place(area, this.pendingCaret);
      }
      this.pendingCaret = null;
    }
  }

  private reparse(): void {
    this.blocks = splitBlocks(this.value || '');
    this.active = -1;
    this.resume = null;
  }

  private renderBlock(source: string): string {
    let rendered = renderCache.get(source);
    if (rendered === undefined) {
      // Links are for reading, and this is an editor - taking them out of the tab order stops Enter navigating away
      // from a draft nobody has saved. Remarkable escapes the < in text, so an <a here is always a tag we emitted.
      rendered = markdown.render(source).replace(/<a\s/g, '<a tabindex="-1" ');
      renderCache.set(source, rendered);
    }
    return rendered;
  }

  private autoSize(area: HTMLTextAreaElement): void {
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  }

  /**
   * Puts the caret in a block, showing its markdown. The caret lands where asked once the textarea exists - it doesn't
   * exist yet at the point anything asks for it.
   */
  private activate(index: number, caret: number = Infinity): void {
    if (this.disabled || index < 0 || index >= this.blocks.length) {
      return;
    }

    // already there, so there's no update coming to hang the caret on - move it now, or it would be left armed and
    // fire on whatever update happened next, which is the author's next keystroke
    if (index === this.active && this.activeArea) {
      this.place(this.activeArea, caret);
      return;
    }

    this.active = index;
    this.pendingCaret = caret;
  }

  private place(area: HTMLTextAreaElement, caret: number): void {
    const at = Math.min(caret, area.value.length);
    area.focus();
    area.setSelectionRange(at, at);
    this.autoSize(area);
  }

  /**
   * The textarea holding the caret and the block it belongs to, opening one where the caret last was if it's outside
   * the document - the toolbar and uploads both need somewhere to write even when nothing is focused. The index comes
   * back with it so callers that await never have to read the live one again.
   */
  private async editing(): Promise<[HTMLTextAreaElement, number]> {
    if (this.sourceMode) {
      return [this.textArea, -1];
    }

    if (this.active < 0) {
      const back = this.resume;
      const known = back && back.index < this.blocks.length;

      this.activate(
        known ? back.index : this.blocks.length - 1,
        known ? back.caret : Infinity
      );
      await this.updateComplete;
    }

    return [this.activeArea, this.active];
  }

  /** writes a textarea's contents back to the value, and in rich mode to the block it belongs to */
  private commit(area: HTMLTextAreaElement, index: number): void {
    if (this.sourceMode) {
      this.value = area.value;
    } else {
      this.blocks = this.blocks.map((block, at) =>
        at === index ? { ...block, source: area.value } : block
      );
      this.value = joinBlocks(this.blocks);
    }

    this.fireEvent('change');
  }

  private replace(
    area: HTMLTextAreaElement,
    index: number,
    start: number,
    end: number,
    replacement: string,
    caret: number
  ): void {
    area.value =
      area.value.substring(0, start) + replacement + area.value.substring(end);

    this.commit(area, index);
    this.place(area, caret);
  }

  private handleInput(evt: any): void {
    const area = evt.target as HTMLTextAreaElement;
    if (!this.sourceMode) {
      this.autoSize(area);
    }
    this.commit(area, this.active);
  }

  /**
   * Clicking a rendered block puts the caret in its markdown at roughly the character that was clicked. The default
   * action is suppressed so focus lands where we put it rather than wherever the browser was going to leave it.
   */
  private handleBlockDown(evt: MouseEvent, index: number): void {
    evt.preventDefault();

    const block = evt.currentTarget as HTMLElement;
    this.activate(
      index,
      this.caretFromPoint(block, this.blocks[index]?.source || '', evt)
    );
  }

  private handleDocDown(evt: MouseEvent): void {
    // clicks that landed on a block are its own business
    if (evt.currentTarget !== evt.target) {
      return;
    }

    evt.preventDefault();

    // The margins between blocks belong to the document, not to either block, so a click a few pixels off goes to
    // whichever block it looks nearest rather than to the end of the article.
    const blocks = [
      ...(evt.currentTarget as HTMLElement).querySelectorAll('.block')
    ];

    let index = this.blocks.length - 1;
    let caret = Infinity;
    let nearest = Infinity;

    blocks.forEach((block, at) => {
      const rect = block.getBoundingClientRect();
      const distance = Math.max(
        rect.top - evt.clientY,
        evt.clientY - rect.bottom,
        0
      );

      if (distance < nearest) {
        nearest = distance;
        index = at;
        caret = evt.clientY < rect.top ? 0 : Infinity;
      }
    });

    this.activate(index, caret);
  }

  /**
   * Tabbing into the document opens the first block, since a form field nobody can reach from the keyboard isn't one.
   * Tabbing back out of that block lands here again on the way past, which mustn't drop straight back in.
   */
  private handleDocFocus(evt: FocusEvent): void {
    const doc = evt.currentTarget as HTMLElement;
    const from = evt.relatedTarget as Node;

    if (this.active >= 0 || (from && doc.contains(from))) {
      return;
    }

    this.activate(0, 0);
  }

  private caretFromPoint(
    block: HTMLElement,
    source: string,
    evt: MouseEvent
  ): number {
    try {
      // the template's own indentation sits in the block as text nodes the layout drops, so offsets are taken against
      // the rendered text with that padding off the front
      const text = block.textContent;
      const lead = text.length - text.trimStart().length;

      return sourceOffset(
        source,
        text.trim(),
        Math.max(textOffsetAt(block, evt.clientX, evt.clientY) - lead, 0)
      );
    } catch (e) {
      // the end of the block is as good a guess as any if the measuring goes wrong
      return Infinity;
    }
  }

  private handleBlockBlur(evt: FocusEvent, index: number): void {
    // focus already moved to another block, which will have set itself active
    if (this.active !== index) {
      return;
    }

    this.resume = {
      index,
      caret: (evt.target as HTMLTextAreaElement).selectionStart
    };

    // leaving the document re-splits it, so a blank line typed into a paragraph becomes its own block
    this.active = -1;
    this.blocks = splitBlocks(this.value || '');
  }

  private handleBlockKey(evt: KeyboardEvent): void {
    const area = evt.target as HTMLTextAreaElement;
    const at = area.selectionStart;
    const collapsed = area.selectionEnd === at;

    if (evt.key === 'Escape') {
      evt.preventDefault();
      area.blur();
      return;
    }

    // Arrowing off either end of a block moves to the next one, the same way it would if the document were one long
    // textarea - which is what it looks like. The test is the ends of the text rather than the ends of the first and
    // last line, because prose is one long line soft wrapped over several rows: treating any row as the last one
    // would fling the caret out of a paragraph the author was only moving down through.
    if (evt.key === 'ArrowUp' || evt.key === 'ArrowLeft') {
      if (at === 0 && collapsed && this.active > 0) {
        evt.preventDefault();
        this.activate(this.active - 1);
      }
      return;
    }

    if (evt.key === 'ArrowDown' || evt.key === 'ArrowRight') {
      if (
        at === area.value.length &&
        collapsed &&
        this.active < this.blocks.length - 1
      ) {
        evt.preventDefault();
        this.activate(this.active + 1, 0);
      }
      return;
    }

    if (evt.key === 'Backspace' && at === 0 && collapsed && this.active > 0) {
      evt.preventDefault();
      this.mergeIntoPrevious();
    }
  }

  /** backspacing at the start of a block deletes the break between it and the one above */
  private mergeIntoPrevious(): void {
    const index = this.active;
    const previous = this.blocks[index - 1];
    const current = this.blocks[index];
    const caret = previous.source.length;

    const merged: Block = {
      source: current.source
        ? `${previous.source}\n${current.source}`
        : previous.source,
      trailer: current.trailer
    };

    this.blocks = [
      ...this.blocks.slice(0, index - 1),
      merged,
      ...this.blocks.slice(index + 1)
    ];

    this.value = joinBlocks(this.blocks);
    this.fireEvent('change');

    this.activate(index - 1, caret);
  }

  /**
   * Wraps the selection - or inserts placeholder text where there is none - putting the caret somewhere useful either
   * way, since a toolbar that leaves you hunting for the caret is worse than no toolbar.
   */
  private async applyFormatting(fmt: Formatting): Promise<void> {
    const [area, index] = await this.editing();
    if (!area) {
      return;
    }

    const text = area.value;
    let start = area.selectionStart;
    const end = area.selectionEnd;

    if (fmt.block) {
      // block formatting applies from the start of the line the selection begins on, and to every line it covers -
      // marking only the first would turn a three line selection into one list item and two loose lines
      start = start > 0 ? text.lastIndexOf('\n', start - 1) + 1 : 0;
      const marked = text
        .substring(start, end)
        .split('\n')
        .map((line) => fmt.prefix + line)
        .join('\n');

      this.replace(area, index, start, end, marked, start + fmt.prefix.length);
      return;
    }

    const selected = text.substring(start, end);
    this.replace(
      area,
      index,
      start,
      end,
      fmt.prefix + selected + fmt.suffix,
      selected
        ? end + fmt.prefix.length + fmt.suffix.length
        : start + fmt.prefix.length
    );
  }

  private handleUploadClick(): void {
    (
      this.shadowRoot.querySelector('#upload-input') as HTMLInputElement
    ).click();
  }

  private handleFileInput(evt: any): void {
    this.upload([...evt.target.files]);
    evt.target.value = null;
  }

  // a div isn't a drop target until something says the drag is welcome, and without this the browser navigates to the
  // dropped image and takes the unsaved article with it
  private handleDragOver(evt: DragEvent): void {
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
    }
  }

  private async upload(files: File[]): Promise<void> {
    if (!this.endpoint) {
      return;
    }

    this.error = '';
    this.uploading = true;

    const [area, index] = await this.editing();
    if (!area) {
      this.uploading = false;
      return;
    }

    // Where the references go, fixed before anything else is awaited. An upload takes seconds and the author is free
    // to click into another block while it runs, so reading the live block or caret when the url comes back would
    // write one block's text over another's.
    let start = area.selectionStart;
    let end = area.selectionEnd;

    // one at a time, in order, so the markdown ends up in the order they were given to us
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
        const reference = `![${alt}](${response.json.url})`;

        this.insertAt(index, start, end, reference);

        // the next file goes after this one rather than in front of it
        start += reference.length;
        end = start;
      } catch (e) {
        this.error = msg('Unable to upload file.');
        break;
      }
    }

    this.uploading = false;
    this.settle(index, start);
  }

  /**
   * Writes markdown into a block by index - or into the whole document in source mode - rather than into whatever
   * textarea happens to hold the caret. Uploads resolve long after the caret was read, and where the author asked for
   * the image is where it belongs.
   */
  private insertAt(
    index: number,
    start: number,
    end: number,
    text: string
  ): void {
    if (this.sourceMode) {
      const document = this.value || '';
      this.value =
        document.substring(0, start) + text + document.substring(end);
    } else {
      const block = this.blocks[index];
      if (!block) {
        return;
      }

      const source =
        block.source.substring(0, start) + text + block.source.substring(end);

      this.blocks = this.blocks.map((existing, at) =>
        at === index ? { ...existing, source } : existing
      );
      this.value = joinBlocks(this.blocks);
    }

    this.fireEvent('change');
  }

  /**
   * Closes out a batch of uploads. In rich mode the block goes back to being rendered so the image shows up inline
   * where it was put, which is the confirmation that the upload worked; in source mode the caret follows the text
   * that was written, since there's nothing to render.
   */
  private async settle(index: number, caret: number): Promise<void> {
    if (this.sourceMode) {
      await this.updateComplete;
      this.textArea?.setSelectionRange(caret, caret);
      return;
    }

    // the author moved on while it ran, so leave them where they are - that block will render when they leave it
    if (this.active === index) {
      this.resume = { index, caret };
      this.active = -1;
      this.blocks = splitBlocks(this.value || '');
    }
  }

  public render(): TemplateResult {
    return this.renderField();
  }

  private renderDocument(): TemplateResult {
    return html`
      <div
        class="doc"
        style="min-height:${this.minHeight}px"
        tabindex="${this.disabled ? -1 : 0}"
        @mousedown=${this.handleDocDown}
        @focus=${this.handleDocFocus}
        @dragenter=${this.handleDragOver}
        @dragover=${this.handleDragOver}
        @drop=${this.handleDrop}
        @paste=${this.handlePaste}
      >
        ${this.blocks.map((block, index) =>
          index === this.active
            ? html`<textarea
                class="block editing ${blockKind(block.source)}"
                rows="1"
                .value=${block.source}
                ?disabled=${this.disabled}
                @input=${this.handleInput}
                @keydown=${this.handleBlockKey}
                @blur=${(evt: FocusEvent) => this.handleBlockBlur(evt, index)}
              ></textarea>`
            : html`<div
                class="block rendered ${blockKind(block.source)}"
                @mousedown=${(evt: MouseEvent) =>
                  this.handleBlockDown(evt, index)}
              >
                ${unsafeHTML(this.renderBlock(block.source))}
              </div>`
        )}
      </div>
    `;
  }

  private renderSource(): TemplateResult {
    return html`
      <textarea
        class="document"
        style="min-height:${this.minHeight}px"
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
        <div
          class="toolbar"
          @mousedown=${(evt: MouseEvent) => evt.preventDefault()}
        >
          ${this.formatting.map(
            (fmt) => html`
              <div
                class="format ${fmt.label === 'B'
                  ? 'bold'
                  : fmt.label === 'I'
                    ? 'italic'
                    : ''}"
                title="${fmt.title}"
                @click=${() => this.applyFormatting(fmt)}
              >
                ${fmt.label}
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
        ${this.sourceMode ? this.renderSource() : this.renderDocument()}
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
