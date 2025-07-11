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

    // Calculate the position of the expression text
    const startPos = this.getTextPosition(inputElement, expression.start);
    const endPos = this.getTextPosition(inputElement, expression.end);

    if (startPos && endPos) {
      // Get the input element's position relative to the comp-container
      const containerElement = this.shadowRoot.querySelector(
        '.comp-container'
      ) as HTMLElement;
      const inputRect = inputElement.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();

      // Calculate offset from container to input element
      const inputOffsetLeft = inputRect.left - containerRect.left;
      const inputOffsetTop = inputRect.top - containerRect.top;

      highlightSpan.style.left = `${inputOffsetLeft + startPos.left}px`;
      highlightSpan.style.top = `${inputOffsetTop + startPos.top}px`;
      highlightSpan.style.width = `${endPos.left - startPos.left}px`;
      highlightSpan.style.height = `${
        endPos.top - startPos.top + startPos.height
      }px`;

      // For single line expressions, use line height
      if (startPos.top === endPos.top) {
        highlightSpan.style.height = `${startPos.height}px`;
      }

      this.highlightOverlay.appendChild(highlightSpan);
    }
  }

  private getTextPosition(
    element: HTMLInputElement | HTMLTextAreaElement,
    position: number
  ) {
    // Create a temporary element to measure text
    const div = document.createElement('div');
    const computedStyle = getComputedStyle(element);

    // Copy relevant styles from the input element
    [
      'font-family',
      'font-size',
      'font-weight',
      'line-height',
      'letter-spacing',
      'text-transform',
      'word-spacing',
      'text-indent',
      'white-space',
      'word-wrap',
      'box-sizing'
    ].forEach((prop) => {
      div.style[prop] = computedStyle[prop];
    });

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace =
      element.tagName === 'TEXTAREA' ? 'pre-wrap' : 'nowrap';
    div.style.width =
      element.tagName === 'INPUT' ? 'auto' : `${element.clientWidth}px`;
    div.style.padding = '0';
    div.style.margin = '0';
    div.style.border = 'none';

    // Set text up to the position
    const textBeforePosition = element.value.substring(0, position);
    div.textContent = textBeforePosition;

    // Add a span for the character at position to measure
    const span = document.createElement('span');
    span.textContent = element.value.charAt(position) || ' ';
    div.appendChild(span);

    // Add to DOM temporarily to measure
    document.body.appendChild(div);

    const spanRect = span.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // Calculate position relative to the input element
    const result = {
      left:
        spanRect.left -
        elementRect.left +
        parseInt(computedStyle.paddingLeft) -
        element.scrollLeft,
      top:
        spanRect.top -
        elementRect.top +
        parseInt(computedStyle.paddingTop) -
        element.scrollTop,
      height: spanRect.height
    };

    // Clean up
    document.body.removeChild(div);

    return result;
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
