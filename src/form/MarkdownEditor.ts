import { PropertyValues, TemplateResult, css, html } from 'lit';
import { msg } from '@lit/localize';
import { property, state } from 'lit/decorators.js';
import { FieldElement } from './FieldElement';
import { Icon } from '../Icons';
import { getSelectionFromRoot } from '../excellent/caret-utils';
import { sessionParser } from '../excellent/helpers';
import { tokenize } from '../excellent/tokenizer';
import {
  EXPRESSION_TOKENS,
  getTokenClass,
  tokenCss
} from '../excellent/token-styles';
import { markdown } from '../markdown';
import { postFormData } from '../utils';
import {
  Block,
  blockOf,
  ColumnStyle,
  columnStyle,
  columnStyleText,
  importBlocks,
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
  | 'columns'
  | 'hr';

interface Command {
  format: Format;
  /** shown when there's no icon - the headings, whose levels an icon can't say */
  label: string;
  title: string;
  icon?: Icon;
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

/** the one piece of markup a cell honors - a newline would end its row, so a break in a cell rides as literal <br> */
const CELL_BREAK = /<br\s*\/?>/i;

/**
 * Turns the literal <br>s in a cell's text into the line breaks they mean. The renderer escapes raw HTML, so they
 * arrive as text; a cell is one line of markdown and this is the only way it can carry a break. Inside cells and
 * nowhere else - everywhere else text that looks like a tag stays text.
 */
const revealBreaks = (cell: Element): boolean => {
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let node: Text;
  while ((node = walker.nextNode() as Text)) {
    if (CELL_BREAK.test(node.textContent)) {
      texts.push(node);
    }
  }

  for (const text of texts) {
    const fragment = document.createDocumentFragment();
    text.textContent.split(CELL_BREAK).forEach((part, index) => {
      if (index > 0) {
        fragment.appendChild(document.createElement('br'));
      }
      if (part) {
        fragment.appendChild(document.createTextNode(part));
      }
    });
    text.replaceWith(fragment);
  }

  return texts.length > 0;
};

/** a layout table is one whose header says nothing - what the Columns button makes, and what the styles hide */
const isLayoutTable = (table: Element): boolean => {
  const head = [...table.querySelectorAll(':scope > thead th')];
  return head.length > 0 && head.every((th) => !th.textContent.trim());
};

/**
 * A readable text color drawn from a cell's own background: a deep shade of the same hue over a light fill, a pale
 * one over a dark fill. Derived rather than stored, so the markdown carries only the one color the author chose -
 * and the server derives the same answer from it.
 */
const textOn = (background: string): string => {
  let hex = background.replace('#', '');
  if (hex.length === 3 || hex.length === 4) {
    hex = [...hex.substring(0, 3)].map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h = (h * 60 + 360) % 360;
  }

  const dark = l > 0.55;
  const outS = Math.min(s, dark ? 0.55 : 0.45);
  const outL = dark ? 0.27 : 0.95;

  const c = (1 - Math.abs(2 * outL - 1)) * outS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = outL - c / 2;
  const [rr, gg, bb] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];

  const channel = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${channel(rr)}${channel(gg)}${channel(bb)}`;
};

/** paints a code block with the expression highlighting, rebuilt from its text alone - so it can run again after
 * any edit and settle on the same markup */
const highlightCode = (pre: Element): boolean => {
  const code = pre.querySelector('code') || pre;
  const markup = tokenize(code.textContent, sessionParser)
    .map((token) => {
      const mono = EXPRESSION_TOKENS.has(token.type) ? ' tok-mono' : '';
      return `<span class="${getTokenClass(token)}${mono}">${escapeHtml(
        token.text
      )}</span>`;
    })
    .join('');

  if (code.innerHTML === markup) {
    return false;
  }
  code.innerHTML = markup;
  return true;
};

/**
 * Applies a layout table's column stylesheet. Each header cell's stylesheet arrives as its text when freshly
 * rendered and is moved into a data-style attribute - leaving the header genuinely empty, which is what marks the
 * table as layout in the styles - and the styling itself is realized as a colgroup, where width and background
 * belong to a whole column rather than any one cell. Idempotent: serialization reads the attributes back out, and
 * a second pass rebuilds exactly what the first did.
 */
const decorateTable = (table: Element): boolean => {
  const head = [...table.querySelectorAll(':scope > thead th')];
  if (head.length === 0) {
    return false;
  }

  // any header cell whose text isn't a stylesheet makes this a data table, with nothing to apply
  const styles: ColumnStyle[] = [];
  for (const th of head) {
    const parsed = columnStyle(
      th.textContent.trim() || th.getAttribute('data-style') || ''
    );
    if (!parsed) {
      return false;
    }
    styles.push(parsed);
  }

  let changed = false;

  head.forEach((th, index) => {
    const value = columnStyleText(styles[index]);
    if (th.textContent) {
      th.textContent = '';
      changed = true;
    }
    if ((th.getAttribute('data-style') || '') !== value) {
      if (value) {
        th.setAttribute('data-style', value);
      } else {
        th.removeAttribute('data-style');
      }
      changed = true;
    }
  });

  const markup = styles.some((style) => style.width || style.background)
    ? `<colgroup>${styles
        .map((style) => {
          const parts = [
            style.width && `width: ${style.width}`,
            style.background && `background: ${style.background}`
          ].filter(Boolean);
          return parts.length > 0
            ? `<col style="${parts.join('; ')}">`
            : '<col>';
        })
        .join('')}</colgroup>`
    : '';

  const existing = table.querySelector(':scope > colgroup');
  if ((existing ? existing.outerHTML : '') !== markup) {
    if (existing) {
      existing.remove();
    }
    if (markup) {
      table.insertAdjacentHTML('afterbegin', markup);
    }
    changed = true;
  }

  // a sized column only holds its size in a fixed layout, where the unsized columns share what's left
  const layout = styles.some((style) => style.width)
    ? 'table-layout: fixed; width: 100%'
    : '';
  if ((table.getAttribute('style') || '') !== layout) {
    if (layout) {
      table.setAttribute('style', layout);
    } else {
      table.removeAttribute('style');
    }
    changed = true;
  }

  // What belongs to the cells themselves: padding, and text drawn from the column's own color - a colgroup can
  // paint a background but can't reach the text over it. Any alignment the renderer put on a cell stays.
  for (const row of [...table.querySelectorAll(':scope > tbody > tr')]) {
    [...row.children].forEach((td, index) => {
      const style = styles[index];
      if (!style) {
        return;
      }

      const current = td.getAttribute('style') || '';
      const align = /text-align:\s*(left|center|right)/i.exec(current);
      const value = [
        align && `text-align: ${align[1].toLowerCase()}`,
        style.padding && `padding: ${style.padding}`,
        style.background && `color: ${textOn(style.background)}`
      ]
        .filter(Boolean)
        .join('; ');

      if (current !== value) {
        if (value) {
          td.setAttribute('style', value);
        } else {
          td.removeAttribute('style');
        }
        changed = true;
      }
    });
  }

  return changed;
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
      ${tokenCss}

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

      .toolbar > temba-icon,
      .toolbar .format {
        cursor: pointer;
        padding: 0.15em 0.4em;
        border-radius: var(--curvature);
        color: var(--color-text-dark);
        font-size: 0.85em;
        line-height: 1.4;
      }

      /* icon buttons and the text ones (the headings) share a height, so the row reads as one control */
      .toolbar .format {
        display: flex;
        align-items: center;
        min-height: 1.5em;
      }

      .toolbar > temba-icon:hover,
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

      /* the overlays live on the container, floated over the document beside whatever they edit */
      .container {
        position: relative;
      }

      /* A small floating editor pinned just above what it acts on - a link's text, a column's cells. Sits above
         the sticky chrome so it never slides underneath it. */
      .popover {
        position: absolute;
        z-index: 3;
        transform: translateY(-100%);
        display: flex;
        align-items: center;
        gap: 0.4em;
        padding: 0.3em 0.4em;
        background: var(--color-widget-bg);
        border: 1px solid var(--color-widget-border);
        border-radius: var(--curvature);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        font-size: 0.85em;
      }

      .popover input[type='text'] {
        width: 16em;
        min-width: 0;
        border: 1px solid var(--color-widget-border);
        border-radius: var(--curvature);
        padding: 0.2em 0.4em;
        font-family: inherit;
        font-size: inherit;
        color: var(--color-widget-text);
      }

      .popover .popover-action {
        cursor: pointer;
        color: var(--color-link-primary);
        white-space: nowrap;
      }

      /* the selection treatment around a clicked image, drawn over it rather than on it */
      .image-ring {
        position: absolute;
        z-index: 2;
        border: 2px solid var(--color-focus);
        border-radius: 3px;
        pointer-events: none;
      }

      /* the image's size controls, floated just inside its top edge */
      .image-actions {
        position: absolute;
        z-index: 3;
        display: flex;
        gap: 4px;
      }

      .image-actions .chip {
        cursor: pointer;
        padding: 2px 9px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        font-size: 11px;
        line-height: 1.5;
        white-space: nowrap;
      }

      .image-actions .chip:hover {
        background: rgba(0, 0, 0, 0.75);
      }

      .image-actions .chip.on {
        background: var(--color-primary-dark, #1a5a8a);
      }

      /* the column popover's color choices */
      .popover .swatch {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        border: 1px solid var(--color-widget-border);
        cursor: pointer;
        box-sizing: border-box;
      }

      .popover .swatch.on {
        outline: 2px solid var(--color-focus);
        outline-offset: 1px;
      }

      /* The column's padding, one segmented control: the grid at its default density with a minus and plus either
         side of it, joined so the signs read as steps around the middle rather than three unrelated buttons. */
      .popover .pad-group {
        display: flex;
        align-items: stretch;
        border: 1px solid var(--color-widget-border);
        border-radius: var(--curvature);
        overflow: hidden;
      }

      .popover .pad {
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 3px 6px;
        color: var(--color-text-dark);
      }

      .popover .pad + .pad {
        border-left: 1px solid var(--color-widget-border);
      }

      .popover .pad:hover {
        background: var(--color-selection);
      }

      .popover .pad.on {
        background: var(--color-selection);
        color: var(--color-primary-dark);
      }

      .popover .divider {
        width: 1px;
        align-self: stretch;
        background: var(--color-widget-border);
        margin: 0 0.2em;
      }

      .popover input[type='color'] {
        width: 24px;
        height: 22px;
        padding: 0;
        border: 1px solid var(--color-widget-border);
        border-radius: 4px;
        background: none;
        cursor: pointer;
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
        background: var(--color-code-bg, #f5f6f8);
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

      /* a divider is a breath in the article, not the browser's ruled-off box: a hairline that fades out at its
         ends, with room around it */
      .doc hr {
        border: none;
        height: 1px;
        margin: 1.6em 0;
        background: linear-gradient(
          to right,
          transparent,
          var(--color-borders) 18%,
          var(--color-borders) 82%,
          transparent
        );
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
         data-table chrome goes away, and the row always spans the full width - the columns share it, sized by
         their content until the author drags them to taste. A table with a real header keeps the bordered look
         of data. */
      .doc table:not(:has(th:not(:empty))) {
        width: 100%;
        max-width: 100%;
        table-layout: auto;
      }

      .doc table:not(:has(th:not(:empty))) thead {
        display: none;
      }

      .doc table:not(:has(th:not(:empty))) td {
        border: none;
        padding: 16px;
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

  /** the image the author clicked, ringed and offered its size controls. null when none is picked. */
  @state()
  private image: HTMLImageElement = null;

  /** the layout column the author clicked, as the cell they clicked in. null when none is picked. */
  @state()
  private column: HTMLTableCellElement = null;

  /** the column edge the pointer is hovering, ready to be dragged */
  private resizeHover: { table: Element; index: number } = null;

  /** a column resize in flight */
  private resizing: {
    table: Element;
    index: number;
    startX: number;
    startWidth: number;
  } = null;

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
      {
        format: 'bold',
        label: 'B',
        title: msg('Bold'),
        icon: Icon.bold,
        prefix: '**'
      },
      {
        format: 'italic',
        label: 'I',
        title: msg('Italic'),
        icon: Icon.italic,
        prefix: '_'
      },
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
        icon: Icon.list,
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
        icon: Icon.quote,
        prefix: '> ',
        lines: true
      },
      {
        format: 'code',
        label: 'Code',
        title: msg('Code'),
        icon: Icon.code,
        prefix: '`'
      },
      {
        format: 'link',
        label: 'Link',
        title: msg('Link'),
        icon: Icon.hyperlink,
        prefix: '[',
        suffix: '](https://)'
      },
      {
        format: 'columns',
        label: 'Columns',
        title: msg('Side by side columns'),
        icon: Icon.columns,
        prefix: ''
      },
      {
        format: 'hr',
        label: '—',
        title: msg('Divider'),
        icon: Icon.divider,
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
    // the overlays are pinned to rendered content, so anything that moves it has to move them too
    window.addEventListener('scroll', this.handleViewportChange, true);
    window.addEventListener('resize', this.handleViewportChange);
  }

  public disconnectedCallback(): void {
    document.removeEventListener('selectionchange', this.handleSelectionChange);
    window.removeEventListener('scroll', this.handleViewportChange, true);
    window.removeEventListener('resize', this.handleViewportChange);
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeEnd);
    this.resizing = null;
    super.disconnectedCallback();
  }

  private handleViewportChange = (): void => {
    if (this.image || this.column || this.linkHref !== null) {
      this.requestUpdate();
    }
  };

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
    // rather than an edit to it - and cell breaks and column stylesheets are realized here for the same reason.
    for (const img of [...doc.querySelectorAll('img')]) {
      decorateImage(img as HTMLImageElement);
    }
    for (const cell of [...doc.querySelectorAll('td, th')]) {
      revealBreaks(cell);
    }
    for (const table of [...doc.querySelectorAll('table')]) {
      decorateTable(table);
    }
    for (const pre of [...doc.querySelectorAll('pre')]) {
      if (!pre.closest(`.${LOCKED}`)) {
        highlightCode(pre);
      }
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

    // Styling the browser applied as markup we don't model - the text is kept, the wrapper isn't. The spans inside
    // a code block are ours: the highlighting, rebuilt below from the text they hold.
    for (const wrapper of [...doc.querySelectorAll('span,font')]) {
      if (wrapper.closest(`.${LOCKED}`) || wrapper.closest('pre')) {
        continue;
      }
      change();
      wrapper.replaceWith(...wrapper.childNodes);
    }

    // and the styles it hangs off what it inserts, which markdown has no way to carry and which would otherwise
    // accumulate on the elements the author edits. Table styles stay: a cell's alignment lives there, put there by
    // the renderer, and a layout table's column styling is realized as styles we wrote ourselves.
    for (const styled of [...doc.querySelectorAll('[style]')]) {
      if (
        styled.closest(`.${LOCKED}`) ||
        styled.tagName === 'TH' ||
        styled.tagName === 'TD' ||
        styled.tagName === 'TABLE' ||
        styled.tagName === 'COL'
      ) {
        continue;
      }
      change();
      styled.removeAttribute('style');
    }

    // A table that arrived whole - pasted, or dropped in by the Columns button - still carries its stylesheet as
    // header text and its cell breaks as literal text, the same as one freshly rendered from markdown.
    for (const cell of [...doc.querySelectorAll('td, th')]) {
      if (!cell.closest(`.${LOCKED}`) && revealBreaks(cell)) {
        change();
      }
    }
    for (const table of [...doc.querySelectorAll('table')]) {
      if (!table.closest(`.${LOCKED}`) && decorateTable(table)) {
        change();
      }
    }

    // the highlighting keeps up with the code as it's typed - rebuilt from the text, the caret put back by offset
    for (const pre of [...doc.querySelectorAll('pre')]) {
      if (!pre.closest(`.${LOCKED}`) && highlightCode(pre)) {
        change();
      }
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

    // A cell has no blocks for Enter to split, but it can still break lines - the break goes in by hand, as the
    // <br> its markdown will carry.
    if (this.cellAt(range)) {
      evt.preventDefault();

      range.deleteContents();
      const br = document.createElement('br');
      range.insertNode(br);

      // a break at the very end of a cell isn't rendered, so the caret would have nowhere to sit
      if (!br.nextSibling) {
        br.parentNode.appendChild(document.createElement('br'));
      }

      const after = document.createRange();
      after.setStartAfter(br);
      after.collapse(true);
      this.select(after);

      this.edited(evt.inputType);
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

    // a click on an image is the way its size gets edited - anywhere else puts the controls away. An image in a
    // locked block stays as authored, so there is nothing to offer it.
    const image =
      target instanceof HTMLImageElement && !target.closest(`.${LOCKED}`)
        ? target
        : null;
    if (image !== this.image) {
      this.image = image;
    }

    // a click in a layout column offers that column's styling - unless it was the image the click was for
    const cell = image
      ? null
      : (target.closest?.('td') as HTMLTableCellElement);
    const table = cell ? cell.closest('table') : null;
    const column =
      table && isLayoutTable(table) && !cell.closest(`.${LOCKED}`)
        ? cell
        : null;
    if (column !== this.column) {
      this.column = column;
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

    // what the overlays were editing can be rebuilt out from under them - by an undo, or a value set from outside
    if (this.image && !this.image.isConnected) {
      this.image = null;
    }
    if (this.column && !this.column.isConnected) {
      this.column = null;
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

      case 'hr':
        this.exec('insertHorizontalRule');
        break;
    }

    this.edited();
    this.refreshActive();

    if (command.format === 'link') {
      await this.updateComplete;
      this.shadowRoot
        ?.querySelector<HTMLInputElement>('.popover input[type="text"]')
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

  /** writes a size choice into the clicked image's fragment, which is the edit the overlay controls make. A layout
   * already in the fragment rides along untouched - columns are how layout is asked for now, but an image that asked
   * the old way keeps what it asked for. */
  private applyImageSize(size: string): void {
    const img = this.image;
    if (!img) {
      return;
    }

    const current = imageOptions(img.getAttribute('src') || '');
    img.setAttribute(
      'src',
      withImageOptions(img.getAttribute('src') || '', size, current.layout)
    );
    decorateImage(img);

    // the image's block no longer matches what it rendered as, which is exactly what being edited means
    this.edited();
    this.requestUpdate();
  }

  // ==========================================================
  // Columns
  // ==========================================================

  /** merges a patch into one column's stylesheet and re-applies the table */
  private setColumnStyle(
    table: Element,
    index: number,
    patch: {
      width?: string | null;
      background?: string | null;
      padding?: string | null;
    }
  ): void {
    const th = [...table.querySelectorAll(':scope > thead th')][index];
    if (!th) {
      return;
    }

    const merged: ColumnStyle = {
      ...(columnStyle(th.getAttribute('data-style') || '') || {})
    };
    for (const key of ['width', 'background', 'padding'] as const) {
      if (patch[key] !== undefined) {
        if (patch[key]) {
          merged[key] = patch[key];
        } else {
          delete merged[key];
        }
      }
    }

    const value = columnStyleText(merged);
    if (value) {
      th.setAttribute('data-style', value);
    } else {
      th.removeAttribute('data-style');
    }

    decorateTable(table);
  }

  private applyColumnBackground(index: number, color: string): void {
    const table = this.column?.closest('table');
    if (!table) {
      return;
    }
    this.setColumnStyle(table, index, { background: color || null });
    this.edited();
    this.requestUpdate();
  }

  private applyColumnPadding(index: number, padding: string): void {
    const table = this.column?.closest('table');
    if (!table) {
      return;
    }
    this.setColumnStyle(table, index, { padding: padding || null });
    this.edited();
    this.requestUpdate();
  }

  /** tracks the pointer for a grabbable column edge, offering the resize cursor over one */
  private handleDocMouseMove(evt: MouseEvent): void {
    if (this.resizing || this.sourceMode || !this.doc) {
      return;
    }

    this.resizeHover = null;
    let cursor = '';

    const target = evt.target as Element;
    const table = target.closest?.('table');
    if (table && isLayoutTable(table) && !target.closest(`.${LOCKED}`)) {
      const row = table.querySelector(':scope > tbody > tr');
      const cells = row ? [...row.children] : [];
      // every edge between cells is grabbable; the last column takes what's left, so its edge sizes nothing
      for (let index = 0; index < cells.length - 1; index++) {
        const box = cells[index].getBoundingClientRect();
        if (Math.abs(evt.clientX - box.right) <= 4) {
          this.resizeHover = { table, index };
          cursor = 'col-resize';
          break;
        }
      }
    }

    if (this.doc.style.cursor !== cursor) {
      this.doc.style.cursor = cursor;
    }
  }

  /** starts a column drag when the pointer is on a grabbable edge, instead of placing the caret there */
  private handleDocMouseDown(evt: MouseEvent): void {
    if (!this.resizeHover) {
      return;
    }

    const { table, index } = this.resizeHover;
    const row = table.querySelector(':scope > tbody > tr');
    const cell = row ? row.children[index] : null;
    if (!cell) {
      return;
    }

    evt.preventDefault();
    this.resizing = {
      table,
      index,
      startX: evt.clientX,
      startWidth: cell.getBoundingClientRect().width
    };
    document.addEventListener('mousemove', this.handleResizeMove);
    document.addEventListener('mouseup', this.handleResizeEnd);
  }

  private handleResizeMove = (evt: MouseEvent): void => {
    const drag = this.resizing;
    if (!drag) {
      return;
    }
    const width = Math.max(
      48,
      Math.round(drag.startWidth + evt.clientX - drag.startX)
    );
    this.setColumnStyle(drag.table, drag.index, { width: `${width}px` });
    // any open overlay rides the cells it points at
    this.requestUpdate();
  };

  private handleResizeEnd = (): void => {
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeEnd);
    if (this.resizing) {
      this.resizing = null;
      this.edited();
    }
  };

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

  /** drops a whole block into the source at the caret - on its own line, with a blank line either side */
  private insertSourceBlock(block: string, caretAt: number): void {
    const area = this.textArea;
    if (!area) {
      return;
    }

    const text = area.value;
    const start = area.selectionStart;
    const before = text.substring(0, start);
    const after = text.substring(area.selectionEnd);

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

    area.value = before + lead + block + tail + after;
    this.value = area.value;
    this.fireEvent('change');

    const caret = start + lead.length + caretAt;
    area.focus();
    area.setSelectionRange(caret, caret);
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
      // the caret goes into the first cell of the body row
      const table = '|  |  |\n| --- | --- |\n|  |  |';
      this.insertSourceBlock(table, table.lastIndexOf('\n') + 3);
      return;
    }

    if (command.format === 'hr') {
      this.insertSourceBlock('---', 3);
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

    // Markup off the clipboard - ours or another app's - is rebuilt into the shapes the serializer knows and put
    // through the same round trip the document itself takes: read to markdown, then rendered back. So nothing can
    // land in the document that the editor couldn't have produced or couldn't write out again, and what the rebuild
    // can't express falls back to the plain text.
    const source = pasted ? this.markdownOf(pasted, text) : null;

    this.exec(
      'insertHTML',
      source === null
        ? text
            .split(/\n{2,}/)
            .map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
            .join('')
        : source.inline
          ? markdown.renderInline(source.markdown)
          : renderBlock(source.markdown)
    );

    this.edited('insertFromPaste');
  }

  /** the markdown for pasted markup, or null when it isn't anything the document could hold */
  private markdownOf(
    pasted: string,
    text: string
  ): { markdown: string; inline: boolean } {
    // parsed inert, so nothing in it loads or runs on the way past
    const parsed = new DOMParser().parseFromString(pasted, 'text/html');
    const blocks = importBlocks(parsed.body);

    if (blocks.length === 0) {
      return text ? null : { markdown: parsed.body.textContent, inline: true };
    }

    return {
      markdown: blocks.map((block) => blockOf(block)).join('\n\n'),
      // a single plain paragraph drops into the text at the caret; anything more is blocks of its own
      inline: blocks.length === 1 && blocks[0].tagName === 'P'
    };
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

  /** where an element sits relative to the container, which is what the overlays position against */
  private overlayRect(
    target: Element
  ): { left: number; top: number; width: number; height: number } | null {
    const container = this.shadowRoot?.querySelector('.container');
    if (!container || !target || !target.isConnected) {
      return null;
    }
    const outer = container.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    return {
      left: rect.left - outer.left,
      top: rect.top - outer.top,
      width: rect.width,
      height: rect.height
    };
  }

  /** the clicked image's selection ring, and its size controls floated just inside its top edge */
  private renderImageOverlay(): TemplateResult {
    const rect = this.image ? this.overlayRect(this.image) : null;
    if (!rect) {
      return null;
    }

    const current = imageOptions(this.image.getAttribute('src') || '').size;
    const sizes = [
      { value: '', label: msg('Original') },
      { value: 'small', label: msg('Small') },
      { value: 'medium', label: msg('Medium') },
      { value: 'large', label: msg('Large') }
    ];

    return html`
      <div
        class="image-ring"
        style="left:${rect.left - 2}px;top:${rect.top -
        2}px;width:${rect.width}px;height:${rect.height}px"
      ></div>
      <div
        class="image-actions"
        style="left:${rect.left + 6}px;top:${rect.top + 6}px"
        @mousedown=${(evt: MouseEvent) => evt.preventDefault()}
      >
        ${sizes.map(
          (size) => html`
            <div
              class="chip ${current === size.value ? 'on' : ''}"
              @click=${() => this.applyImageSize(size.value)}
            >
              ${size.label}
            </div>
          `
        )}
      </div>
    `;
  }

  /** the link under the caret, edited just above its text - without ever showing its markdown */
  private renderLinkPopover(): TemplateResult {
    const rect =
      this.linkHref !== null && this.anchor
        ? this.overlayRect(this.anchor)
        : null;
    if (!rect) {
      return null;
    }

    return html`
      <div
        class="popover"
        style="left:${rect.left}px;top:${rect.top - 6}px"
        @mousedown=${(evt: MouseEvent) => {
          if ((evt.target as Element).tagName !== 'INPUT') {
            evt.preventDefault();
          }
        }}
      >
        <input
          type="text"
          .value=${this.linkHref}
          placeholder="https://"
          @input=${this.handleLinkInput}
        />
        <div class="popover-action" @click=${this.handleLinkRemove}>
          ${msg('Remove')}
        </div>
      </div>
    `;
  }

  /** the clicked column's background choices, floated just above its table */
  private renderColumnPopover(): TemplateResult {
    const table = this.column ? this.column.closest('table') : null;
    if (!table || this.image) {
      return null;
    }

    const rect = this.overlayRect(this.column);
    const tableRect = this.overlayRect(table);
    if (!rect || !tableRect) {
      return null;
    }

    const index = [...this.column.parentElement.children].indexOf(this.column);
    const th = [...table.querySelectorAll(':scope > thead th')][index];
    const current =
      (th && columnStyle(th.getAttribute('data-style') || '')) || {};

    const colors = ['', '#f1f5f9', '#eef2ff', '#ecfdf5', '#fffbeb', '#fef2f2'];

    // three densities as one control: the default in the middle, stepped tighter or airier by the minus and plus
    // flanking it - a group, so the signs read as "less padding" and "more padding" around the grid
    const paddings = [
      { value: '4px', icon: Icon.minus, title: msg('Less padding') },
      { value: '', icon: Icon.padding, title: msg('Normal padding') },
      { value: '28px', icon: Icon.add, title: msg('More padding') }
    ];

    return html`
      <div
        class="popover"
        style="left:${rect.left}px;top:${tableRect.top - 6}px"
        @mousedown=${(evt: MouseEvent) => {
          if ((evt.target as Element).tagName !== 'INPUT') {
            evt.preventDefault();
          }
        }}
      >
        ${colors.map(
          (color) => html`
            <div
              class="swatch ${(current.background || '') === color ? 'on' : ''}"
              style="background:${color || 'var(--color-widget-bg)'}"
              title=${color || msg('None')}
              @click=${() => this.applyColumnBackground(index, color)}
            ></div>
          `
        )}
        <input
          type="color"
          .value=${current.background && current.background.length === 7
            ? current.background
            : '#ffffff'}
          title=${msg('Custom color')}
          @input=${(evt: Event) =>
            this.applyColumnBackground(
              index,
              (evt.target as HTMLInputElement).value
            )}
        />
        <div class="divider"></div>
        <div class="pad-group">
          ${paddings.map(
            (padding) => html`
              <div
                class="pad ${(current.padding || '') === padding.value
                  ? 'on'
                  : ''}"
                title=${padding.title}
                @click=${() => this.applyColumnPadding(index, padding.value)}
              >
                <temba-icon name=${padding.icon} size="1.1"></temba-icon>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private renderOverlays(): TemplateResult {
    if (this.sourceMode) {
      return null;
    }
    return html`${this.renderImageOverlay()}${this.renderLinkPopover()}${this.renderColumnPopover()}`;
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
                  ${command.icon
                    ? html`<temba-icon
                        name=${command.icon}
                        size="1.1"
                      ></temba-icon>`
                    : command.label}
                </div>
              `
            )}
            <temba-icon
              name="${Icon.image}"
              title="${msg('Image')}"
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
                @mousemove=${this.handleDocMouseMove}
                @mousedown=${this.handleDocMouseDown}
                @blur=${this.handleDocBlur}
                @dragenter=${this.handleDragOver}
                @dragover=${this.handleDragOver}
                @drop=${this.handleDrop}
                @paste=${this.handlePaste}
              ></div>
            `}
        ${this.renderOverlays()}
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
