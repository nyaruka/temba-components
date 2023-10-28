import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { FormElement } from '../FormElement';
import { Modax } from '../dialog/Modax';
import { sanitize } from './helpers';
import { CharCount } from '../charcount/CharCount';

export class TextInput extends FormElement {
  static get styles() {
    return css`
      .input-container {
        border-radius: var(--curvature-widget);
        cursor: var(--input-cursor);
        background: var(--color-widget-bg);
        border: 1px solid var(--color-widget-border);
        transition: all ease-in-out var(--transition-speed);
        display: flex;
        flex-direction: row;
        align-items: stretch;
        box-shadow: var(--widget-box-shadow);
        caret-color: var(--input-caret);
      }

      .clear-icon {
        --icon-color: var(--color-text-dark-secondary);
        cursor: pointer;
        margin: auto;
        padding-right: 10px;
        line-height: 1;
      }

      .clear-icon:hover {
        --icon-color: var(--color-text-dark);
      }

      .hidden {
        visibility: hidden;
        position: absolute;
      }

      .input-container:focus-within {
        border-color: var(--color-focus);
        background: var(--color-widget-bg-focused);
        box-shadow: var(--widget-box-shadow-focused);
        position: relative;
      }

      .input-container:hover {
      }

      textarea {
        height: var(--textarea-height);
        min-height: var(--textarea-min-height, var(--textarea-height));
      }

      .textinput {
        padding: var(--temba-textinput-padding);
        border: none;
        flex: 1;
        margin: 0;
        background: none;
        background-color: transparent;
        color: var(--color-widget-text);
        font-family: var(--font-family);
        font-size: var(--temba-textinput-font-size);
        line-height: normal;
        cursor: var(--input-cursor);
        resize: none;
        font-weight: 300;
        width: 100%;
      }

      .textinput:focus {
        outline: none;
        box-shadow: none;
        cursor: text;
        color: var(--color-widget-text-focused, var(--color-widget-text));
      }

      .textinput::placeholder {
        color: var(--color-placeholder);
        font-weight: 300;
      }

      .grow-wrap {
        display: flex;
        align-items: stretch;
        width: 100%;
      }

      .grow-wrap > div {
        border: 0px solid green;
        width: 100%;
        padding: var(--temba-textinput-padding);
        flex: 1;
        margin: 0;
        background: none;
        color: var(--color-widget-text);
        font-family: var(--font-family);
        font-size: var(--temba-textinput-font-size);
        line-height: normal;
        cursor: text;
        resize: none;
        font-weight: 300;
        width: 100%;
        visibility: hidden;
        word-break: break-word;
      }

      .grow-wrap textarea {
        margin-left: -100%;
      }
    `;
  }

  @property({ type: Boolean })
  textarea: boolean;

  @property({ type: String })
  placeholder = '';

  @property({ type: Boolean })
  password: boolean;

  @property({ type: Number })
  maxlength: number;

  @property({ type: Object })
  inputElement: HTMLInputElement;

  @property({ type: Boolean })
  clearable: boolean;

  @property({ type: Boolean })
  gsm: boolean;

  @property({ type: String })
  counter: string;

  // if we are still loading
  @property({ type: Boolean })
  loading = true;

  @property({ type: Boolean })
  submitOnEnter = true;

  @property()
  onBlur: any;

  @property({ type: Boolean })
  autogrow = false;

  counterElement: CharCount = null;
  cursorStart = -1;
  cursorEnd = -1;

  public constructor() {
    super();
  }

  public firstUpdated(changes: Map<string, any>) {
    super.firstUpdated(changes);

    this.inputElement = this.shadowRoot.querySelector('.textinput');

    if (changes.has('counter')) {
      let root = this.getParentModax() as any;
      if (root) {
        root = root.shadowRoot;
      }
      if (!root) {
        root = document;
      }
      this.counterElement = root.querySelector(this.counter);
      this.counterElement.text = this.value;
    }
  }

  public updated(changes: Map<string, any>) {
    super.updated(changes);

    if (changes.has('value')) {
      this.fireEvent('change');

      if (this.textarea && this.autogrow) {
        const autogrow = this.shadowRoot.querySelector(
          '.grow-wrap > div'
        ) as HTMLDivElement;
        autogrow.innerText = this.value + String.fromCharCode(10);
      }

      if (this.cursorStart > -1 && this.cursorEnd > -1) {
        this.inputElement.setSelectionRange(this.cursorStart, this.cursorEnd);
        this.cursorStart = -1;
        this.cursorEnd = -1;
      }
    }
  }

  public getDisplayValue() {
    return this.inputElement.value;
  }

  private handleClear(event: any): void {
    event.stopPropagation();
    event.preventDefault();
    this.value = null;
  }

  private updateValue(value: string): void {
    const cursorStart = this.inputElement.selectionStart;
    const cursorEnd = this.inputElement.selectionEnd;

    const sanitized = this.sanitizeGSM(value);

    if (sanitized !== value) {
      this.cursorStart = cursorStart;
      this.cursorEnd = cursorEnd;
    }

    this.value = sanitized;

    if (this.textarea) {
      this.inputElement.value = this.value;
    }

    if (this.counterElement) {
      this.counterElement.text = value;
    }
  }

  private sanitizeGSM(text: string): string {
    return this.gsm ? sanitize(text) : text;
  }

  private handleChange(update: any): void {
    if (this.disabled) {
      return;
    }
    this.updateValue(update.target.value);
    this.fireEvent('change');
  }

  private handleContainerClick(): void {
    if (this.disabled) {
      return;
    }
    if (this.inputElement) {
      this.inputElement.click();
    }
  }

  private handleContainerFocus(): void {
    if (this.disabled) {
      return;
    }
    if (this.inputElement) {
      this.inputElement.focus();
    }
  }

  private handleInput(update: any): void {
    if (this.disabled) {
      return;
    }

    this.updateValue(update.target.value);
    this.fireEvent('input');
  }

  /** we just return the value since it should be a string */
  public serializeValue(value: any): string {
    return value;
  }

  public getParentModax(): Modax {
    let parent = this as HTMLElement;

    while (parent) {
      if (parent.parentElement) {
        parent = parent.parentElement;
      } else {
        parent = (parent as any).getRootNode().host;
      }

      if (!parent) {
        return null;
      }

      if (parent.tagName == 'TEMBA-MODAX') {
        return parent as Modax;
      }
    }
  }

  public getParentForm(): HTMLFormElement {
    let parent = this as HTMLElement;

    while (parent) {
      if (parent.parentElement) {
        parent = parent.parentElement;
      } else {
        parent = (parent as any).getRootNode().host;
      }

      if (!parent) {
        return null;
      }

      if (parent.tagName === 'FORM') {
        return parent as HTMLFormElement;
      }
    }
  }

  public click(): void {
    super.click();
    this.handleContainerClick();
  }

  public focus(): void {
    super.focus();
    this.handleContainerFocus();
  }

  // TODO make this a formelement and have contactsearch set the root
  public render(): TemplateResult {
    const containerStyle = {
      height: `${this.textarea ? '100%' : 'auto'}`,
    };

    const clear =
      this.clearable && this.inputElement && this.inputElement.value
        ? html`<temba-icon
            name="x"
            class="clear-icon"
            @click=${this.handleClear}
          />`
        : null;

    let input = html`
      <input
        class="textinput"
        name=${this.name}
        type="${this.password ? 'password' : 'text'}"
        maxlength="${ifDefined(this.maxlength)}"
        @change=${this.handleChange}
        @input=${this.handleInput}
        @blur=${this.blur}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const input = this;

            if (this.submitOnEnter) {
              const parentModax = input.getParentModax();
              const parentForm = !parentModax ? input.getParentForm() : null;

              // if we don't have something to submit then bail
              if (!parentModax && !parentForm) {
                return false;
              }

              // don't submit disabled forms on enter
              if (parentModax && parentModax.disabled) {
                return false;
              }

              input.blur();

              // look for a form to submit
              window.setTimeout(function () {
                // first, look for a modax that contains us
                const modax = input.getParentModax();
                if (modax) {
                  input.blur();

                  modax.submit();
                } else {
                  // otherwise, just look for a vanilla submit button
                  const form = input.getParentForm();

                  if (form) {
                    const submitButton = form.querySelector(
                      "input[type='submit']"
                    ) as HTMLInputElement;
                    if (submitButton) {
                      submitButton.click();
                    } else {
                      form.submit();
                    }
                  }
                }
              }, 10);
              // this is needed for firefox, would be nice to
              // find a way to do this with a callback instead
            }
          }
        }}
        placeholder=${this.placeholder}
        .value=${this.value}
        .disabled=${this.disabled}
      />
    `;

    if (this.textarea) {
      input = html`
        <textarea
          class="textinput"
          name=${this.name}
          maxlength="${ifDefined(this.maxlength)}"
          placeholder=${this.placeholder}
          @change=${this.handleChange}
          @input=${this.handleInput}
          @blur=${this.blur}
          .value=${this.value}
          .disabled=${this.disabled}
        ></textarea>
      `;

      if (this.autogrow) {
        input = html` <div class="grow-wrap">
          <div></div>
          ${input}
        </div>`;
      }
    }

    return html`
      <temba-field
        name=${this.name}
        .label="${this.label}"
        .helpText="${this.helpText}"
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        .hideLabel=${this.hideLabel}
        .disabled=${this.disabled}
      >
        <div
          class="input-container"
          style=${styleMap(containerStyle)}
          @click=${this.handleContainerClick}
        >
          <slot name="prefix"></slot>
          ${input} ${clear}
          <slot></slot>
        </div>
      </temba-field>
    `;
  }
}
