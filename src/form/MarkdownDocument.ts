import { lru } from 'tiny-lru';
import { markdown } from '../markdown';

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

const NBSP = /\u00a0/g;

// rendering the same block over and over is the common case - the author edits one block while the rest of the
// document sits there, and re-rendering the document walks every block
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
    return LIST_ITEM.test(line) || /^ {2,}\S/.test(line);
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

/** renders a block's markdown, cached because the document is re-rendered far more often than it changes */
export const renderBlock = (source: string): string => {
  let rendered = renderCache.get(source);
  if (rendered === undefined) {
    rendered = markdown.render(source).trim();
    renderCache.set(source, rendered);
  }
  return rendered;
};

// The rendered shapes the editor knows how to turn back into markdown. Anything outside this set - a table, or some
// construct a future renderer starts emitting - becomes an island the author can't edit richly, so content the editor
// can't express is never rewritten by it. See isSerializable.
const BLOCKS = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'PRE',
  'HR'
]);

const INLINES = new Set([
  'STRONG',
  'B',
  'EM',
  'I',
  'DEL',
  'S',
  'CODE',
  'A',
  'IMG',
  'BR'
]);

/** whether every element in a rendered block is one the serializer can turn back into markdown */
export const isSerializable = (element: Element): boolean =>
  BLOCKS.has(element.tagName) &&
  [...element.querySelectorAll('*')].every(
    (node) => BLOCKS.has(node.tagName) || INLINES.has(node.tagName)
  );

const isWord = (char: string) => /[A-Za-z0-9]/.test(char || '');

/**
 * Escapes text so it comes back out of the renderer as itself. Only the characters that would otherwise start a
 * construct are escaped - an author who types * or [ means those characters, and one who wants emphasis uses the
 * toolbar. Underscores inside a word are left alone, because snake_case is far more common in this content than
 * emphasis written that way, and the renderer doesn't read them as emphasis there either.
 */
const escapeText = (text: string): string =>
  text
    // a non-breaking space is something the browser inserted to hold a run of spaces open, not something the author
    // typed, and markdown has no use for it
    .replace(NBSP, ' ')
    .replace(/([\\`*[\]])/g, '\\$1')
    .replace(/_+/g, (run, at, whole) =>
      isWord(whole[at - 1]) && isWord(whole[at + run.length])
        ? run
        : run.replace(/_/g, '\\_')
    );

/**
 * Escapes anything at the front of a line that would turn the line into a different kind of block - a paragraph
 * beginning "1. " is a paragraph, not a list, and has to still be one after a round trip.
 *
 * The backslash goes in front of the punctuation that does the work rather than in front of the whole marker, because
 * markdown only honours an escape before punctuation: "\1." leaves the backslash showing and then gets escaped again
 * on the next round trip, so each save would grow another one.
 */
const escapeLeading = (md: string): string =>
  md
    .split('\n')
    .map((line) =>
      line
        // a bullet or heading marker, and a > which needs no space after it to open a quote. A * is already escaped
        // as text, so it can't reach this.
        .replace(/^(\s*)(#{1,6}\s|[-+]\s|>)/, '$1\\$2')
        // a line of only dashes or equals underlines the line above it into a heading, or rules off the page
        .replace(/^(\s*)([-=]+\s*)$/, '$1\\$2')
        .replace(/^(\s*\d+)([.)]\s)/, '$1\\$2')
    )
    .join('\n');

/**
 * Trims a block's markdown without losing a hard break. Two or more spaces before a newline is what markdown calls a
 * line break, so trailing whitespace can't just be stripped - it's normalized to the two spaces that mean it.
 */
const tidy = (md: string): string =>
  md
    .replace(/[^\S\n]+(?=\n)/g, (space) => (space.length >= 2 ? '  ' : ''))
    .replace(/^\s+|\s+$/g, '');

/** a code span needs a fence longer than any run of backticks inside it, and padding if it starts or ends with one */
const codeSpan = (text: string): string => {
  const runs: string[] = text.match(/`+/g) || [];
  const fence = '`'.repeat(
    runs.reduce((longest, run) => Math.max(longest, run.length), 0) + 1
  );
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${text}${pad}${fence}`;
};

/** a destination with spaces or parens in it has to be wrapped, or it ends the link early */
const destination = (url: string): string =>
  /[\s()]/.test(url) ? `<${url}>` : url;

/**
 * Wraps a run in emphasis markers. Markers have to sit against the text rather than against the whitespace around it,
 * or the renderer shows them literally, so any padding is left outside.
 */
const emphasize = (element: Element, marker: string): string => {
  const inner = inlineOf(element);
  const [, lead, core, tail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
  return core ? `${lead}${marker}${core}${marker}${tail}` : inner;
};

const inlineOf = (node: Node): string => {
  let out = '';
  let afterBreak = false;

  for (const child of [...node.childNodes]) {
    // The renderer writes a newline after the <br> it emits for a hard break, and that newline is its formatting
    // rather than content - keeping it would turn one line break into two every time the block was saved.
    out +=
      afterBreak && child.nodeType === Node.TEXT_NODE
        ? escapeText(child.textContent.replace(/^\n/, ''))
        : inlineNode(child);

    afterBreak = (child as Element).tagName === 'BR';
  }

  return out;
};

const inlineNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeText(node.textContent);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as Element;

  switch (element.tagName) {
    case 'BR':
      // two spaces is the hard break the renderer emits a <br> for
      return '  \n';
    case 'STRONG':
    case 'B':
      return emphasize(element, '**');
    case 'EM':
    case 'I':
      return emphasize(element, '_');
    case 'DEL':
    case 'S':
      return emphasize(element, '~~');
    case 'CODE':
      // code is its own source, so nothing inside it is escaped
      return codeSpan(element.textContent.replace(NBSP, ' '));
    case 'IMG': {
      const alt = (element.getAttribute('alt') || '').replace(/[[\]]/g, '');
      return `![${alt}](${destination(element.getAttribute('src') || '')})`;
    }
    case 'A': {
      const title = element.getAttribute('title');
      const href = destination(element.getAttribute('href') || '');
      return `[${inlineOf(element)}](${href}${title ? ` "${title}"` : ''})`;
    }
    default:
      // a wrapper we don't model - a span the browser left behind, say - contributes its contents and nothing else
      return inlineOf(element);
  }
};

/** indents every line after the first, which is what puts a block inside a list item */
const hang = (md: string, pad: string): string =>
  md
    .split('\n')
    .map((line, at) => (at === 0 || !line ? line : pad + line))
    .join('\n');

const listItem = (item: Element, marker: string): string => {
  let out = '';

  const add = (md: string, separator: string) => {
    out = out ? `${out}${separator}${md}` : md;
  };

  // a loose item holds its text in paragraphs and a nested list is a block of its own; everything else on the item is
  // the item's own inline content. A nested list joins on a single newline - a blank line before it would make the
  // outer list loose, which changes how the whole thing renders.
  let inline = '';

  const flush = () => {
    if (inline.trim()) {
      add(tidy(escapeLeading(inline)), '\n\n');
    }
    inline = '';
  };

  for (const child of [...item.childNodes]) {
    const tag = (child as Element).tagName;

    if (tag === 'UL' || tag === 'OL') {
      flush();
      add(blockOf(child as Element), '\n');
    } else if (tag === 'P' || tag === 'BLOCKQUOTE' || tag === 'PRE') {
      flush();
      add(blockOf(child as Element), '\n\n');
    } else {
      inline += inlineNode(child);
    }
  }

  flush();

  return marker + hang(out, ' '.repeat(marker.length));
};

const listOf = (list: Element): string => {
  const ordered = list.tagName === 'OL';
  const start = ordered ? parseInt(list.getAttribute('start') || '1', 10) : 0;
  const items = [...list.children].filter((child) => child.tagName === 'LI');

  // a list whose items hold paragraphs is loose, and has to keep the blank lines that made it loose
  const loose = items.some((item) =>
    [...item.children].some((child) => child.tagName === 'P')
  );

  return items
    .map((item, at) => listItem(item, ordered ? `${start + at}. ` : '* '))
    .join(loose ? '\n\n' : '\n');
};

const preOf = (element: Element): string => {
  const code = element.querySelector('code') || element;
  const language = /\blanguage-(\S+)/.exec(code.getAttribute('class') || '');
  const text = code.textContent.replace(/\n$/, '');

  // the fence has to be longer than any run of backticks the code starts a line with, or the block closes early
  const runs: string[] = text.match(/^\s*`{3,}/gm) || [];
  const fence = '`'.repeat(
    runs.reduce((longest, run) => Math.max(longest, run.trim().length), 2) + 1
  );

  return `${fence}${language ? language[1] : ''}\n${text}\n${fence}`;
};

/** the markdown for one rendered block element */
export const blockOf = (element: Element): string => {
  const tag = element.tagName;

  if (/^H[1-6]$/.test(tag)) {
    // a heading is one line, so a break inside one becomes a space rather than splitting the heading
    const text = tidy(inlineOf(element)).replace(/\s*\n\s*/g, ' ');
    return `${'#'.repeat(+tag[1])} ${text}`;
  }

  if (tag === 'HR') {
    return '---';
  }

  if (tag === 'PRE') {
    return preOf(element);
  }

  if (tag === 'UL' || tag === 'OL') {
    return listOf(element);
  }

  if (tag === 'BLOCKQUOTE') {
    const inner = [...element.children]
      .map((child) => blockOf(child))
      .join('\n\n');

    return (inner || tidy(escapeLeading(inlineOf(element))))
      .split('\n')
      .map((line) => (line ? `> ${line}` : '>'))
      .join('\n');
  }

  return tidy(escapeLeading(inlineOf(element)));
};
