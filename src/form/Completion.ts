import { TemplateResult, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { TextInput } from './TextInput';
import {
  renderCompletionOption,
  updateInputElementWithCompletion,
  executeCompletionQuery
} from '../excellent/helpers';
import ExcellentParser from '../excellent/ExcellentParser';

import { FormElement } from './FormElement';
import { CompletionOption, Position } from '../interfaces';
import { styleMap } from 'lit-html/directives/style-map.js';
import { msg } from '@lit/localize';

const messageParser = new ExcellentParser('@', [
  'contact',
  'fields',
  'globals',
  'urns'
]);

const sessionParser = new ExcellentParser('@', [
  'contact',
  'fields',
  'globals',
  'locals',
  'urns',
  'results',
  'input',
  'run',
  'child',
  'parent',
  'node',
  'webhook',
  'ticket',
  'trigger',
  'resume'
]);

/**
 * Completion is a text input that handles excellent completion options in a popup
 */
export class Completion extends FormElement {
  static get styles() {
    return css`
      :host {
        display: block;
      }

      temba-options {
        --widget-box-shadow-focused: 0 0 4px rgba(0, 0, 0, 0.15);
        --color-focus: #e6e6e6;
      }

      .comp-container {
        position: relative;
        height: 100%;
      }

      .highlight-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 1;
      }

      .expression-highlight {
        position: absolute;
        background: rgba(132, 40, 158, 0.1);
        border-radius: 2px;
        font-weight: 500;
        color: rgba(132, 40, 158, 0.8);
        pointer-events: none;
        box-sizing: border-box;
      }

      #anchor {
        /* background: rgba(132, 40, 158, .1); */
        position: absolute;
        visibility: hidden;
        width: 250px;
        height: 20px;
      }

      .fn-marker {
        font-weight: bold;
        font-size: 42px;
      }

      .option-slot {
        background: #fff;
      }

      .current-fn {
        padding: 10px;
        margin: 5px;
        background: var(--color-primary-light);
        color: rgba(0, 0, 0, 0.5);
        border-radius: var(--curvature-widget);
        font-size: 90%;
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
        background: rgba(0, 0, 0, 0.1);
        padding: 1px 5px;
        border-radius: var(--curvature);
      }
    `;
  }

  @property({ type: Number })
  maxLength: number;

  @property({ type: Boolean })
  session: boolean;

  @property({ type: Boolean })
  submitOnEnter = false;

  @property({ type: Object })
  anchorPosition: Position = { left: 0, top: 0 };

  @property({ attribute: false })
  currentFunction: CompletionOption;

  @property({ type: String })
  placeholder = '';

  @property({ attribute: false })
  textInputElement: TextInput;

  @property({ attribute: false })
  anchorElement: HTMLDivElement;

  @property({ type: Array })
  options: any[] = [];

  @property({ type: String })
  name = '';

  @property({ type: String })
  value = '';

  @property({ type: Boolean })
  textarea: boolean;

  @property({ type: Boolean })
  gsm: boolean;

  @property({ type: Boolean })
  disableCompletion: boolean;

  @property({ type: String })
  counter: string;

  @property({ type: Boolean })
  autogrow = false;

  @property({ attribute: false })
  expressions: any[] = [];

  private hiddenElement: HTMLInputElement;
  private query: string;
  private highlightOverlay: HTMLDivElement;

  public firstUpdated() {
    this.textInputElement = this.shadowRoot.querySelector(
      'temba-textinput'
    ) as TextInput;
    this.anchorElement = this.shadowRoot.querySelector('#anchor');
    this.highlightOverlay = this.shadowRoot.querySelector('.highlight-overlay');

    // create our hidden container so it gets included in our host element's form
    this.hiddenElement = document.createElement('input');
    this.hiddenElement.setAttribute('type', 'hidden');
    this.hiddenElement.setAttribute('name', this.getAttribute('name'));
    this.hiddenElement.setAttribute('value', this.getAttribute('value') || '');
    this.appendChild(this.hiddenElement);

    // Update highlights when the input is scrolled
    if (this.textInputElement && this.textInputElement.inputElement) {
      this.textInputElement.inputElement.addEventListener('scroll', () => {
        this.updateHighlights();
      });
    }

    // Initial highlight update
    setTimeout(() => this.updateHighlights(), 0);
  }

  private handleKeyUp(evt: KeyboardEvent) {
    if (this.disableCompletion) {
      // if we have options, ignore keys that are meant for them
      if (this.options && this.options.length > 0) {
        if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
          return;
        }

        if (evt.ctrlKey) {
          if (evt.key === 'n' || evt.key === 'p') {
            return;
          }
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

        this.executeQuery(evt.currentTarget as TextInput);
      }
    }
  }

  public hasVisibleOptions() {
    return this.options.length > 0;
  }

  private executeQuery(ele: TextInput) {
    if (this.disableCompletion) {
      return;
    }

    if (!ele.inputElement) {
      return;
    }

    const result = executeCompletionQuery(ele.inputElement, this.session);

    this.query = result.query;
    this.options = result.options;
    this.anchorPosition = result.anchorPosition;
  }

  private handleClick(evt: MouseEvent) {
    this.executeQuery(evt.currentTarget as TextInput);
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // if our cursor changed, lets make sure our scrollbox is showing it
    if (changedProperties.has('value')) {
      this.hiddenElement.setAttribute('value', this.value);
      // Update highlights when value changes
      setTimeout(() => this.updateHighlights(), 0);
    }
  }

  private handleInput(evt: KeyboardEvent) {
    const ele = evt.currentTarget as TextInput;
    this.executeQuery(ele);
    this.value = ele.inputElement.value;
    this.updateHighlights();
    this.fireEvent('change');
  }

  private handleOptionCanceled() {
    // delay in case we are actively selecting
    window.setTimeout(() => {
      this.options = [];
      this.query = '';
    }, 100);
  }

  private handleOptionSelection(evt: CustomEvent) {
    const option = evt.detail.selected as CompletionOption;
    const tabbed = evt.detail.tabbed;

    updateInputElementWithCompletion(
      this.query,
      this.textInputElement.inputElement,
      option
    );
    this.query = '';
    this.options = [];

    if (tabbed) {
      this.executeQuery(this.textInputElement);
    }
  }

  public getTextInput(): TextInput {
    return this.textInputElement;
  }

  public click() {
    super.click();
    const input = this.shadowRoot.querySelector('temba-textinput') as TextInput;
    if (input) {
      input.click();
    }
  }

  public focus() {
    super.focus();
    const input = this.shadowRoot.querySelector('temba-textinput') as TextInput;
    if (input) {
      input.focus();
    }
  }

  private updateHighlights() {
    if (!this.highlightOverlay || !this.textInputElement?.inputElement) {
      return;
    }

    // Clear existing highlights
    this.highlightOverlay.innerHTML = '';

    if (!this.value || this.disableCompletion) {
      return;
    }

    // Parse expressions in the current value
    const parser = this.session ? sessionParser : messageParser;
    this.expressions = parser.findExpressions(this.value);

    // Create highlight elements for each expression
    this.expressions.forEach((expression) => {
      this.createHighlightElement(expression);
    });
  }

  private createHighlightElement(expression: any) {
    if (!this.textInputElement?.inputElement || !this.highlightOverlay) {
      return;
    }

    const inputElement = this.textInputElement.inputElement;
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'expression-highlight';

    const computedStyle = getComputedStyle(inputElement);

    // Get input padding and scroll offsets
    const paddingLeft = parseInt(computedStyle.paddingLeft) || 0;
    const paddingTop = parseInt(computedStyle.paddingTop) || 0;
    const scrollLeft = inputElement.scrollLeft || 0;
    const scrollTop = inputElement.scrollTop || 0;

    // Calculate position based on text layout
    const position = this.calculateTextPosition(
      expression.start,
      expression.end,
      inputElement,
      computedStyle
    );

    // Position the highlight accounting for padding and scroll
    highlightSpan.style.position = 'absolute';
    highlightSpan.style.left = `${paddingLeft + position.left - scrollLeft}px`;
    highlightSpan.style.top = `${paddingTop + position.top - scrollTop}px`;
    highlightSpan.style.width = `${position.width}px`;
    highlightSpan.style.height = `${position.height}px`;
    highlightSpan.style.pointerEvents = 'none';

    this.highlightOverlay.appendChild(highlightSpan);
  }

  private calculateTextPosition(
    start: number,
    end: number,
    inputElement: HTMLInputElement | HTMLTextAreaElement,
    computedStyle: CSSStyleDeclaration
  ) {
    const isTextarea = inputElement.tagName === 'TEXTAREA';
    const text = this.value;
    const textBefore = text.substring(0, start);
    const expressionText = text.substring(start, end);

    if (isTextarea) {
      return this.calculateTextareaPositionWithRanges(
        start,
        end,
        inputElement as HTMLTextAreaElement,
        computedStyle
      );
    } else {
      return this.calculateInputPositionWithCanvas(
        textBefore,
        expressionText,
        computedStyle
      );
    }
  }

  private calculateInputPositionWithCanvas(
    textBefore: string,
    expressionText: string,
    computedStyle: CSSStyleDeclaration
  ) {
    // Use canvas for more accurate text measurement
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      return { left: 0, top: 0, width: 0, height: 16 };
    }

    // Set font properties to match the input
    const fontSize = parseInt(computedStyle.fontSize) || 16;
    const fontWeight = computedStyle.fontWeight || 'normal';
    const fontFamily = computedStyle.fontFamily || 'monospace';
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // Measure text before the expression
    const leftOffset = context.measureText(textBefore).width;

    // Measure the expression text width
    const width = context.measureText(expressionText).width;

    return {
      left: leftOffset,
      top: 0,
      width: width,
      height: fontSize
    };
  }

  private calculateTextareaPositionWithRanges(
    start: number,
    end: number,
    textarea: HTMLTextAreaElement,
    computedStyle: CSSStyleDeclaration
  ) {
    // Create a mirror div to accurately measure text layout in textarea
    const mirror = document.createElement('div');
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.fontFamily = computedStyle.fontFamily;
    mirror.style.fontSize = computedStyle.fontSize;
    mirror.style.fontWeight = computedStyle.fontWeight;
    mirror.style.lineHeight = computedStyle.lineHeight;
    mirror.style.letterSpacing = computedStyle.letterSpacing;
    mirror.style.padding = computedStyle.padding;
    mirror.style.border = computedStyle.border;
    mirror.style.width = computedStyle.width;
    mirror.style.height = 'auto';
    mirror.style.overflow = 'hidden';

    document.body.appendChild(mirror);

    try {
      const text = this.value;
      const textBefore = text.substring(0, start);
      const expressionText = text.substring(start, end);

      // Set text content up to the start position
      mirror.textContent = textBefore;

      // Create a temporary span to measure the end position
      const endSpan = document.createElement('span');
      endSpan.textContent = '|'; // Use a marker character
      mirror.appendChild(endSpan);

      // Get the position of the end marker
      const endRect = endSpan.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();

      // Calculate relative position within the mirror element
      const left = endRect.left - mirrorRect.left;
      const top = endRect.top - mirrorRect.top;

      // Remove the marker and measure the expression width
      mirror.removeChild(endSpan);
      mirror.textContent = textBefore + expressionText;

      // Add marker again to get end position
      const endSpan2 = document.createElement('span');
      endSpan2.textContent = '|';
      mirror.appendChild(endSpan2);

      const endRect2 = endSpan2.getBoundingClientRect();
      const width = endRect2.left - endRect.left;

      const lineHeight =
        parseInt(computedStyle.lineHeight) ||
        parseInt(computedStyle.fontSize) ||
        16;

      return {
        left: left,
        top: top,
        width: Math.max(width, 10), // Minimum width for visibility
        height: lineHeight
      };
    } finally {
      document.body.removeChild(mirror);
    }
  }

  public render(): TemplateResult {
    const anchorStyles = this.anchorPosition
      ? {
          top: `${this.anchorPosition.top}px`,
          left: `${this.anchorPosition.left}px`
        }
      : {};

    const visible = this.options && this.options.length > 0;

    return html`
      <temba-field
        name=${this.name}
        .label=${this.label}
        .helpText=${this.helpText}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
      >
        <div class="comp-container">
          <div id="anchor" style=${styleMap(anchorStyles)}></div>
          <div class="highlight-overlay"></div>
          <temba-textinput
            name=${this.name}
            placeholder=${this.placeholder}
            gsm=${this.gsm}
            counter=${ifDefined(this.counter)}
            @keyup=${this.handleKeyUp}
            @click=${this.handleClick}
            @input=${this.handleInput}
            @blur=${this.handleOptionCanceled}
            maxlength="${ifDefined(this.maxLength)}"
            .value=${this.value}
            ?autogrow=${this.autogrow}
            ?textarea=${this.textarea}
            ?submitOnEnter=${this.submitOnEnter}
          >
          </temba-textinput>
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
      </temba-field>
    `;
  }
}
