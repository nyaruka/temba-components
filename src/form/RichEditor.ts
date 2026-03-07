import { TemplateResult, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { FieldElement } from './FieldElement';
import { CompletionOption, Position } from '../interfaces';
import { tokenize, TokenType, Token } from '../excellent/tokenizer';
import {
  messageParser,
  sessionParser,
  renderCompletionOption,
  executeCompletionQuery,
  updateInputElementWithCompletion
} from '../excellent/helpers';
import { getStore } from '../store/Store';
import { styleMap } from 'lit-html/directives/style-map.js';
import { msg } from '@lit/localize';

// ---------------------------------------------------------------------------
// Cursor management utilities for contenteditable
// Newlines are represented as \n characters inside <span class="tok-newline">
// elements, so they're handled as regular text by cursor utilities.
// Browser-added <br> artifacts are ignored (treated as zero-length).
// ---------------------------------------------------------------------------

/** Gets the Selection object, handling shadow DOM. */
function getSelectionFromRoot(element: HTMLElement): Selection | null {
  const root = element.getRootNode() as ShadowRoot;
  if ((root as any).getSelection) {
    return (root as any).getSelection();
  }
  return window.getSelection();
}

/** Returns the plain-text length of a DOM node. Ignores browser <br> artifacts. */
function nodeTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.length;
  }
  // Ignore browser-added <br> artifacts
  if (node.nodeName === 'BR') {
    return 0;
  }
  let len = 0;
  for (const child of Array.from(node.childNodes)) {
    len += nodeTextLength(child);
  }
  return len;
}

/** Converts a DOM selection position (container + offset) to a plain-text offset. */
function domPositionToTextOffset(
  root: Node,
  targetContainer: Node,
  targetOffset: number
): number {
  let total = 0;

  const walk = (node: Node): boolean => {
    if (node === targetContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        total += targetOffset;
      } else {
        // offset is a child index
        for (let i = 0; i < targetOffset && i < node.childNodes.length; i++) {
          total += nodeTextLength(node.childNodes[i]);
        }
      }
      return true; // found
    }

    if (node.nodeType === Node.TEXT_NODE) {
      total += node.textContent.length;
      return false;
    }
    // Ignore browser-added <br> artifacts
    if (node.nodeName === 'BR') {
      return false;
    }

    for (const child of Array.from(node.childNodes)) {
      if (walk(child)) return true;
    }
    return false;
  };

  walk(root);
  return total;
}

/** Converts a plain-text offset to a DOM position (node + offset). */
function textOffsetToDomPosition(
  root: Node,
  targetOffset: number
): { node: Node; offset: number } | null {
  let remaining = targetOffset;

  const walk = (node: Node): { node: Node; offset: number } | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (remaining <= node.textContent.length) {
        return { node, offset: remaining };
      }
      remaining -= node.textContent.length;
      return null;
    }
    // Ignore browser-added <br> artifacts
    if (node.nodeName === 'BR') {
      return null;
    }

    for (const child of Array.from(node.childNodes)) {
      const result = walk(child);
      if (result) return result;
    }
    return null;
  };

  return walk(root);
}

/**
 * Extracts plain text from the contenteditable DOM by walking our span structure.
 * Ignores browser-added <br> artifacts. Our newlines are \n chars inside spans.
 */
function getTextFromEditableDiv(element: HTMLElement): string {
  let text = '';
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      // Skip browser-added <br> artifacts
      if (child.nodeName === 'BR') {
        continue;
      }
      // Recurse into spans and other elements
      text += getTextFromEditableDiv(child as HTMLElement);
    }
  }
  return text;
}

/** Gets the caret (selection start) as a plain-text offset. */
function getCaretOffset(element: HTMLElement): number {
  const selection = getSelectionFromRoot(element);
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  return domPositionToTextOffset(
    element,
    range.startContainer,
    range.startOffset
  );
}

/** Gets the selection end as a plain-text offset. */
function getCaretEndOffset(element: HTMLElement): number {
  const selection = getSelectionFromRoot(element);
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  return domPositionToTextOffset(element, range.endContainer, range.endOffset);
}

/** Sets the caret to a plain-text offset. */
function setCaretOffset(element: HTMLElement, offset: number): void {
  const pos = textOffsetToDomPosition(element, offset);
  if (!pos) return;
  const selection = getSelectionFromRoot(element);
  if (!selection) return;
  const range = document.createRange();
  range.setStart(pos.node, pos.offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Sets a selection range by plain-text offsets. */
function setCaretRange(element: HTMLElement, start: number, end: number): void {
  const startPos = textOffsetToDomPosition(element, start);
  const endPos = textOffsetToDomPosition(element, end);
  if (!startPos || !endPos) return;
  const selection = getSelectionFromRoot(element);
  if (!selection) return;
  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

// ---------------------------------------------------------------------------
// Token type → CSS class mapping
// ---------------------------------------------------------------------------

const TOKEN_CLASS_MAP: Record<string, string> = {
  [TokenType.Text]: 'tok-text',
  [TokenType.ExpressionPrefix]: 'tok-prefix',
  [TokenType.Identifier]: 'tok-id',
  [TokenType.FunctionName]: 'tok-fn',
  [TokenType.StringLiteral]: 'tok-str',
  [TokenType.NumberLiteral]: 'tok-num',
  [TokenType.Keyword]: 'tok-kw',
  [TokenType.Operator]: 'tok-op',
  [TokenType.ContextRef]: 'tok-ctx',
  [TokenType.Separator]: 'tok-sep',
  [TokenType.Whitespace]: 'tok-ws',
  [TokenType.Arrow]: 'tok-arrow',
  [TokenType.Bracket]: 'tok-bracket',
  [TokenType.EscapedAt]: 'tok-text',
  [TokenType.Paren]: 'tok-paren'
};

/** Expression token types get monospace font. */
const EXPRESSION_TOKENS = new Set([
  TokenType.ExpressionPrefix,
  TokenType.Identifier,
  TokenType.FunctionName,
  TokenType.StringLiteral,
  TokenType.NumberLiteral,
  TokenType.Keyword,
  TokenType.Operator,
  TokenType.ContextRef,
  TokenType.Separator,
  TokenType.Whitespace,
  TokenType.Arrow,
  TokenType.Bracket,
  TokenType.Paren
]);

function getTokenClass(token: Token): string {
  if (token.type === TokenType.Paren && token.balanced === false) {
    return 'tok-paren-unmatched';
  }
  return TOKEN_CLASS_MAP[token.type] || 'tok-text';
}

// ---------------------------------------------------------------------------
// RichEditor component
// ---------------------------------------------------------------------------

export class RichEditor extends FieldElement {
  static get styles() {
    return css`
      ${super.styles}

      :host {
        display: block;
      }

      .comp-container {
        position: relative;
        height: 100%;
      }

      #anchor {
        position: absolute;
        visibility: hidden;
        width: 250px;
        height: 20px;
      }

      .input-container {
        border-radius: var(--curvature-widget);
        background: var(--color-widget-bg);
        border: 1px solid var(--color-widget-border);
        transition: all ease-in-out var(--transition-speed);
        box-shadow: var(--widget-box-shadow);
      }

      .input-container:focus-within {
        border-color: var(--color-focus);
        background: var(--color-widget-bg-focused);
        box-shadow: var(--widget-box-shadow-focused);
      }

      .highlight-editor {
        padding: var(--temba-textinput-padding);
        border: none;
        margin: 0;
        background: transparent;
        color: var(--color-widget-text);
        font-family: var(--font-family);
        font-size: var(--temba-textinput-font-size);
        line-height: normal;
        width: 100%;
        box-sizing: border-box;
        outline: none;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-y: auto;
        min-height: var(--textarea-min-height, 100px);
        resize: none;
      }

      :host(:not([textarea])) {
        min-width: 0;
      }

      :host(:not([textarea])) .highlight-editor {
        white-space: pre;
        overflow-x: auto;
        overflow-y: hidden;
        min-height: 0;
        scrollbar-width: none;
      }

      :host(:not([textarea])) .highlight-editor::-webkit-scrollbar {
        display: none;
      }

      .highlight-editor:empty::before {
        content: attr(data-placeholder);
        color: var(--color-placeholder, #999);
        pointer-events: none;
      }

      /* Token styles */
      .tok-text {
        color: inherit;
      }

      .tok-prefix {
        color: var(--expression-color, #0086e0);
        font-weight: 600;
      }

      .tok-id {
        color: var(--expression-color, #0086e0);
      }

      .tok-fn {
        color: var(--expression-fn-color, #0086e0);
        font-weight: 900;
      }

      .tok-str {
        color: var(--expression-string-color, #06a810);
      }

      .tok-num {
        color: var(--expression-number-color, #c25ceb);
      }

      .tok-kw {
        color: var(--expression-keyword-color, #1750eb);
      }

      .tok-op {
        color: var(--expression-operator-color, #666);
      }

      .tok-ctx {
        color: var(--expression-color, #0086e0);
      }

      .tok-sep {
        color: var(--expression-operator-color, #666);
      }

      .tok-arrow {
        color: var(--expression-operator-color, #666);
      }

      .tok-bracket {
        color: var(--expression-operator-color, #666);
      }

      .tok-ws {
        /* whitespace tokens — no special color */
      }

      .tok-newline {
        /* Newline chars rendered via white-space: pre-wrap on parent */
      }

      .tok-paren {
        /* color: var(--expression-paren-color, #5492dd);*/
        color: #999;
      }

      .tok-paren-unmatched {
        color: var(--expression-paren-unmatched-color, #ff0011);
        font-weight: 900;
      }

      .tok-fn-invalid {
        text-decoration: wavy underline #ff0011;
        text-underline-offset: 3px;
      }

      .tok-mono {
        font-family: var(
          --expression-font-family,
          'SFMono-Regular',
          'Consolas',
          'Liberation Mono',
          'Menlo',
          monospace
        );
        font-size: 0.95em;
      }

      /* Completion popup styles */
      temba-options {
        --widget-box-shadow-focused: 0 0 4px rgba(0, 0, 0, 0.15);
        --color-focus: #e6e6e6;
      }

      .current-fn {
        padding: 10px;
        margin: 5px;
        background: var(--color-primary-light);
        color: rgba(0, 0, 0, 0.5);
        border-radius: var(--curvature-widget);
        font-size: 90%;
        max-width: 216px;
        overflow: hidden;
        word-wrap: break-word;
      }

      .footer {
        padding: 5px 10px;
        background: var(--color-primary-light);
        color: rgba(0, 0, 0, 0.5);
        font-size: 80%;
        border-bottom-left-radius: var(--curvature-widget);
        border-bottom-right-radius: var(--curvature-widget);
      }

      code {
        padding: 1px 5px;
        border-radius: var(--curvature);
      }
    `;
  }

  // -- Properties matching Completion's API --

  @property({ type: String })
  placeholder = '';

  @property({ type: Boolean })
  textarea: boolean;

  @property({ type: Boolean })
  autogrow = false;

  @property({ type: Boolean })
  gsm: boolean;

  @property({ type: String })
  counter: string;

  @property({ type: Number })
  maxLength: number;

  @property({ type: Boolean })
  session: boolean;

  @property({ type: Boolean })
  submitOnEnter = false;

  @property({ type: Boolean })
  disableCompletion: boolean;

  @property({ type: Number })
  minHeight: number;

  // -- Completion state --

  @property({ type: Array })
  options: any[] = [];

  @property({ type: Object })
  anchorPosition: Position = { left: 0, top: 0 };

  @property({ attribute: false })
  currentFunction: CompletionOption;

  // -- Internal state --

  private editableDiv: HTMLDivElement;
  private anchorElement: HTMLDivElement;
  private hiddenElement: HTMLInputElement;
  private query: string;
  private _skipRender = false;

  // Undo/redo: native browser undo doesn't work because syntax highlighting
  // replaces innerHTML on every input, destroying the browser's undo history.
  private undoStack: { value: string; caret: number }[] = [];
  private redoStack: { value: string; caret: number }[] = [];

  // -- Lifecycle --

  public firstUpdated() {
    this.editableDiv = this.shadowRoot.querySelector('.highlight-editor');
    this.anchorElement = this.shadowRoot.querySelector('#anchor');

    // Create hidden input for form serialization
    this.hiddenElement = document.createElement('input');
    this.hiddenElement.setAttribute('type', 'hidden');
    this.hiddenElement.setAttribute('name', this.getAttribute('name') || '');
    this.hiddenElement.setAttribute('value', this.getAttribute('value') || '');
    this.appendChild(this.hiddenElement);

    // Patch the contenteditable div with HTMLInputElement-like API
    this.patchEditableAsInput();

    // Initial render
    if (this.value) {
      this.renderHighlightedContent(this.value);
    }
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('value')) {
      if (this.hiddenElement) {
        this.hiddenElement.setAttribute('value', this.value || '');
      }

      if (this._skipRender) {
        this._skipRender = false;
      } else if (this.editableDiv) {
        this.renderHighlightedContent(this.value || '');
      }
    }
  }

  // -- HTMLInputElement adapter --

  private patchEditableAsInput(): void {
    const div = this.editableDiv as any;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const host = this;

    Object.defineProperty(div, 'value', {
      get() {
        return host.value || '';
      },
      set(val: string) {
        host._skipRender = true;
        host.value = val;
        host.renderHighlightedContent(val);
      },
      configurable: true
    });

    Object.defineProperty(div, 'selectionStart', {
      get() {
        return getCaretOffset(div);
      },
      configurable: true
    });

    Object.defineProperty(div, 'selectionEnd', {
      get() {
        return getCaretEndOffset(div);
      },
      configurable: true
    });

    div.setSelectionRange = (start: number, end: number) => {
      setCaretRange(div, start, end);
    };
  }

  // -- Highlighted content rendering --

  public renderHighlightedContent(text: string): void {
    const div = this.editableDiv;
    if (!div) return;

    const parser = this.session ? sessionParser : messageParser;
    const tokens = tokenize(text || '', parser);

    // Build set of valid function names for validation
    const validFunctions = new Set<string>();
    try {
      const store = getStore();
      if (store) {
        for (const fn of store.getFunctions()) {
          const name = fn.signature?.substring(0, fn.signature.indexOf('('));
          if (name) validFunctions.add(name.toLowerCase());
        }
      }
    } catch {
      // Store may not have getFunctions in some contexts
    }

    // Clear
    div.textContent = '';

    for (const token of tokens) {
      const cls = getTokenClass(token);
      const isMono = EXPRESSION_TOKENS.has(token.type);

      // Check if function name is invalid
      const isInvalidFn =
        token.type === TokenType.FunctionName &&
        validFunctions.size > 0 &&
        !validFunctions.has(token.text.toLowerCase());

      // Split token text on newlines; newlines become styled spans with \n
      const parts = token.text.split('\n');
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          const nlSpan = document.createElement('span');
          nlSpan.className = 'tok-newline';
          nlSpan.textContent = '\n';
          div.appendChild(nlSpan);
        }
        if (parts[i].length > 0) {
          const span = document.createElement('span');
          span.textContent = parts[i];
          let className = isMono ? `${cls} tok-mono` : cls;
          if (isInvalidFn) className += ' tok-fn-invalid';
          span.className = className;
          div.appendChild(span);
        }
      }
    }

    // Ensure there's at least an empty text node for cursor placement
    if (!text || text === '') {
      div.appendChild(document.createTextNode(''));
    }
  }

  // -- Event handlers --

  /**
   * Primary input handler. The browser has already modified the DOM;
   * we read the text back, re-render with highlighting, and restore the cursor.
   */
  private handleInput(): void {
    if (this.disabled) return;

    const text = getTextFromEditableDiv(this.editableDiv);
    const caretPos = getCaretOffset(this.editableDiv);

    if (text !== (this.value || '')) {
      this.undoStack.push({ value: this.value || '', caret: caretPos });
      this.redoStack = [];
    }

    this.applyValue(text, Math.min(caretPos, text.length));
  }

  /** Applies a new value, re-renders, restores caret, and fires events. */
  private applyValue(newValue: string, caretPos: number): void {
    this._skipRender = true;
    this.value = newValue;
    this.renderHighlightedContent(newValue);
    setCaretOffset(this.editableDiv, caretPos);
    this.executeQuery();
    this.fireEvent('input');
    this.fireEvent('change');
  }

  private performUndo(): void {
    if (this.undoStack.length > 0) {
      const caret = getCaretOffset(this.editableDiv);
      this.redoStack.push({ value: this.value || '', caret });
      const state = this.undoStack.pop();
      this.applyValue(state.value, state.caret);
    }
  }

  private performRedo(): void {
    if (this.redoStack.length > 0) {
      const caret = getCaretOffset(this.editableDiv);
      this.undoStack.push({ value: this.value || '', caret });
      const state = this.redoStack.pop();
      this.applyValue(state.value, state.caret);
    }
  }

  // Handles undo/redo from Edit menu and context menu
  private handleBeforeInput(e: InputEvent): void {
    if (e.inputType === 'historyUndo') {
      e.preventDefault();
      this.performUndo();
    } else if (e.inputType === 'historyRedo') {
      e.preventDefault();
      this.performRedo();
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    const mod = e.metaKey || e.ctrlKey;

    // Undo/redo via keyboard: preventDefault here suppresses the subsequent
    // beforeinput event, avoiding double-handling
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.performUndo();
      return;
    }
    if (mod && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
      e.preventDefault();
      this.performRedo();
      return;
    }

    // Enter
    if (e.key === 'Enter') {
      // If completion popup is visible, let temba-options handle the selection
      if (this.hasVisibleOptions()) {
        e.preventDefault();
        return;
      }

      if (this.submitOnEnter || !this.textarea) {
        e.preventDefault();
        const modax = this.closest('temba-modax') as any;
        if (modax) {
          modax.submit();
        }
        return;
      }

      // Insert newline via string manipulation to avoid browser div-wrapping
      e.preventDefault();
      const selStart = getCaretOffset(this.editableDiv);
      const selEnd = getCaretEndOffset(this.editableDiv);
      const current = this.value || '';

      this.undoStack.push({ value: current, caret: selStart });
      this.redoStack = [];

      const newValue =
        current.substring(0, selStart) + '\n' + current.substring(selEnd);
      this.applyValue(newValue, selStart + 1);
    }
  }

  private handleKeyUp(evt: KeyboardEvent): void {
    if (this.disableCompletion) return;

    // If we have options, ignore keys that are meant for them
    if (this.options && this.options.length > 0) {
      if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
        return;
      }
      if (evt.ctrlKey && (evt.key === 'n' || evt.key === 'p')) {
        return;
      }
      if (
        evt.key === 'Enter' ||
        evt.key === 'Escape' ||
        evt.key === 'Tab' ||
        evt.key.startsWith('Control')
      ) {
        evt.stopPropagation();
        evt.preventDefault();
        return;
      }
    }

    this.executeQuery();
  }

  private handlePaste(e: ClipboardEvent): void {
    e.preventDefault();
    const pastedText = e.clipboardData?.getData('text/plain') || '';
    const selStart = getCaretOffset(this.editableDiv);
    const selEnd = getCaretEndOffset(this.editableDiv);
    const current = this.value || '';

    this.undoStack.push({ value: current, caret: selStart });
    this.redoStack = [];

    const newValue =
      current.substring(0, selStart) + pastedText + current.substring(selEnd);

    this.applyValue(newValue, selStart + pastedText.length);
  }

  private handleClick(): void {
    this.executeQuery();
  }

  private handleBlur(): void {
    this.handleOptionCanceled();
  }

  // -- Completion integration --

  private executeQuery(): void {
    if (this.disableCompletion) return;
    if (!this.editableDiv) return;

    const result = executeCompletionQuery(
      this.editableDiv as unknown as HTMLInputElement,
      this.session
    );

    if (result) {
      this.query = result.query;
      this.options = result.options;
      this.anchorPosition = result.anchorPosition;
      this.currentFunction = result.currentFunction;
    }
  }

  private handleOptionSelection(evt: CustomEvent): void {
    const option = evt.detail.selected as CompletionOption;
    const tabbed = evt.detail.tabbed;

    updateInputElementWithCompletion(
      this.query,
      this.editableDiv as unknown as HTMLInputElement,
      option
    );

    // Sync value from the patched div
    this.value = (this.editableDiv as any).value;
    this.query = '';
    this.options = [];

    if (tabbed) {
      this.executeQuery();
    }
  }

  private handleOptionCanceled(): void {
    window.setTimeout(() => {
      this.options = [];
      this.query = '';
    }, 100);
  }

  // -- Consumer compatibility API --

  public getTextInput(): any {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const host = this;
    return {
      get inputElement() {
        return host.editableDiv;
      },
      get value() {
        return host.value;
      },
      updateValue(val: string) {
        host._skipRender = true;
        host.value = val;
        host.renderHighlightedContent(val);
      }
    };
  }

  public get inputElement(): HTMLDivElement {
    return this.editableDiv;
  }

  public hasVisibleOptions(): boolean {
    return this.options.length > 0;
  }

  public focus(): void {
    super.focus();
    if (this.editableDiv) {
      this.editableDiv.focus();
    }
  }

  public click(): void {
    super.click();
    if (this.editableDiv) {
      this.editableDiv.click();
    }
  }

  // -- Template --

  protected renderWidget(): TemplateResult {
    const anchorStyles = this.anchorPosition
      ? {
          top: `${this.anchorPosition.top}px`,
          left: `${this.anchorPosition.left}px`
        }
      : {};

    const visible = this.options && this.options.length > 0;

    return html`
      <div class="comp-container">
        <div id="anchor" style=${styleMap(anchorStyles)}></div>
        <div
          class="input-container"
          style=${this.minHeight
            ? `--textarea-min-height: ${this.minHeight}px`
            : ''}
        >
          <div
            class="highlight-editor"
            contenteditable="true"
            spellcheck="false"
            data-placeholder=${this.placeholder}
            @input=${this.handleInput}
            @beforeinput=${this.handleBeforeInput}
            @keydown=${this.handleKeydown}
            @keyup=${this.handleKeyUp}
            @click=${this.handleClick}
            @paste=${this.handlePaste}
            @blur=${this.handleBlur}
          ></div>
        </div>
        <temba-options
          @temba-selection=${this.handleOptionSelection}
          @temba-canceled=${this.handleOptionCanceled}
          .renderOption=${renderCompletionOption}
          .anchorTo=${this.anchorElement}
          .options=${this.options}
          ?visible=${visible}
        >
          ${this.currentFunction
            ? html`
                <div class="current-fn">
                  ${renderCompletionOption(this.currentFunction, true)}
                </div>
              `
            : null}
          <div class="footer" style="${!visible ? 'display:none' : null}">
            ${msg('Tab to complete, enter to select')}
          </div>
        </temba-options>
      </div>
    `;
  }

  public render(): TemplateResult {
    return this.renderField();
  }
}
