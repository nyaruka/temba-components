import { TemplateResult, css, html } from 'lit';
import { property } from 'lit/decorators';
import { ifDefined } from 'lit-html/directives/if-defined';
import { TextInput } from '../textinput/TextInput';
import {
  renderCompletionOption,
  updateInputElementWithCompletion,
  executeCompletionQuery,
} from './helpers';

import { FormElement } from '../FormElement';
import { CompletionOption, Position } from '../interfaces';
import { Store } from '../store/Store';
import { styleMap } from 'lit-html/directives/style-map';

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

  @property({ type: String })
  counter: string;

  private hiddenElement: HTMLInputElement;
  private query: string;

  public firstUpdated() {
    this.textInputElement = this.shadowRoot.querySelector(
      'temba-textinput'
    ) as TextInput;
    this.anchorElement = this.shadowRoot.querySelector('#anchor');

    // create our hidden container so it gets included in our host element's form
    this.hiddenElement = document.createElement('input');
    this.hiddenElement.setAttribute('type', 'hidden');
    this.hiddenElement.setAttribute('name', this.getAttribute('name'));
    this.hiddenElement.setAttribute('value', this.getAttribute('value') || '');
    this.appendChild(this.hiddenElement);
  }

  private handleKeyUp(evt: KeyboardEvent) {
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

  public hasVisibleOptions() {
    return this.options.length > 0;
  }

  private executeQuery(ele: TextInput) {
    const store: Store = document.querySelector('temba-store');
    const result = executeCompletionQuery(
      ele.inputElement,
      store,
      this.session
    );

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
    }
  }

  private handleInput(evt: KeyboardEvent) {
    const ele = evt.currentTarget as TextInput;
    this.executeQuery(ele);
    this.value = ele.inputElement.value;
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

  public click() {
    super.click();
    const input = this.shadowRoot.querySelector('temba-textinput') as TextInput;
    if (input) {
      input.click();
    }
  }

  public render(): TemplateResult {
    const anchorStyles = this.anchorPosition
      ? {
          top: `${this.anchorPosition.top}px`,
          left: `${this.anchorPosition.left}px`,
        }
      : {};

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
          <temba-textinput
            name=${this.name}
            placeholder=${this.placeholder}
            gsm=${this.gsm}
            counter=${ifDefined(this.counter)}
            @keyup=${this.handleKeyUp}
            @click=${this.handleClick}
            @input=${this.handleInput}
            @blur=${this.handleOptionCanceled}
            .value=${this.value}
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
            ?visible=${this.options && this.options.length > 0}
          >
            ${this.currentFunction
              ? html`
                  <div class="current-fn">
                    ${renderCompletionOption(this.currentFunction, true)}
                  </div>
                `
              : null}
            <div class="footer">Tab to complete, enter to select</div>
          </temba-options>
        </div>
      </temba-field>
    `;
  }
}
