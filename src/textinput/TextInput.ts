import {
  customElement,
  TemplateResult,
  html,
  css,
  property,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import { styleMap } from "lit-html/directives/style-map.js";
import FormElement from "../FormElement";
import "lit-flatpickr";
import Modax from "../dialog/Modax";
import { sanitize } from "./helpers";
import CharCount from "../charcount/CharCount";

@customElement("temba-textinput")
export default class TextInput extends FormElement {
  static get styles() {
    return css`
      .input-container {
        border-radius: var(--curvature-widget);
        cursor: text;
        background: var(--color-widget-bg);
        border: 1px solid var(--color-widget-border);
        transition: all ease-in-out 200ms;
        display: flex;
        flex-direction: row;
        align-items: stretch;
        box-shadow: 0 3px 20px 0 rgba(0, 0, 0, 0.04),
          0 1px 2px 0 rgba(0, 0, 0, 0.02);

        caret-color: var(--input-caret);
      }

      .clear-icon {
        color: var(--color-text-dark-secondary);
        cursor: pointer;
        margin: auto;
        padding-right: 10px;
        line-height: 1;
      }

      .clear-icon:hover {
        color: var(--color-text-dark);
      }

      .hidden {
        visibility: hidden;
        position: absolute;
      }

      .input-container:focus-within {
        border-color: var(--color-focus);
        background: var(--color-widget-bg-focused);
        box-shadow: var(--widget-box-shadow-focused);
      }

      .input-container:hover {
        background: var(--color-widget-bg-focused);
      }

      textarea {
        height: var(--textarea-height);
      }

      .textinput {
        padding: var(--temba-textinput-padding);
        border: none;
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
      }

      .textinput.withdate {
        cursor: pointer;
      }

      .textinput.withdate.loading {
        color: #fff;
      }

      .datepicker {
        padding: 9px;
        margin: 0px;
        border: 1px red solid;
      }

      .textinput:focus {
        outline: none;
        box-shadow: none;
        cursor: text;
      }

      .textinput::placeholder {
        color: var(--color-placeholder);
        font-weight: 300;
      }
    `;
  }

  @property({ type: Boolean })
  textarea: boolean;

  @property({ type: Boolean })
  datepicker: boolean;

  @property({ type: Boolean })
  datetimepicker: boolean;

  @property({ type: String })
  placeholder: string = "";

  @property({ type: String })
  value: string = "";

  @property({ type: String })
  name: string = "";

  @property({ type: Boolean })
  password: boolean;

  @property({ type: Number })
  maxlength: number;

  @property({ type: Object })
  inputElement: HTMLInputElement;

  @property({ type: Object })
  dateElement: any;

  @property({ type: Boolean })
  clearable: boolean;

  @property({ type: Boolean })
  gsm: boolean;

  @property({ type: String })
  counter: string;

  // if we are still loading
  @property({ type: Boolean })
  loading: boolean = true;

  @property({ type: Boolean })
  ignoreSubmit: boolean = false;

  @property()
  onBlur: any;

  counterElement: CharCount = null;

  public firstUpdated(changes: Map<string, any>) {
    super.firstUpdated(changes);

    this.inputElement = this.shadowRoot.querySelector(".textinput");
    this.dateElement = this.shadowRoot.querySelector(".datepicker");

    if (changes.has("counter")) {
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

    if (this.dateElement) {
      const picker = this.dateElement;
      window.setTimeout(() => {
        this.dateElement.set(
          "onValueUpdate",
          (dates: Date[], formattedDate: string) => {
            this.inputElement.value = picker.formatDate(
              dates[0],
              picker.altFormat
            );
            this.setValue(formattedDate);
            this.inputElement.blur();
          }
        );

        if (this.value) {
          this.inputElement.value = picker.formatDate(
            picker.parseDate(this.value),
            picker.altFormat
          );
          this.dateElement.setDate(this.value);
        }
        this.loading = false;
      }, 300);
    }
  }

  public updated(changes: Map<string, any>) {
    super.updated(changes);
    if (changes.has("value")) {
      this.setValues([this.value]);
      this.fireEvent("change");
    }
  }

  private handleClear(event: any): void {
    event.stopPropagation();
    event.preventDefault();
    this.value = null;
  }

  private updateValue(value: string): void {
    this.value = this.sanitizeGSM(value);
    if (this.counterElement) {
      this.counterElement.text = value;
    }
  }

  private sanitizeGSM(text: string): string {
    return this.gsm ? sanitize(text) : text;
  }

  private handleChange(update: any): void {
    this.updateValue(update.target.value);
    this.fireEvent("change");
  }

  private handleDateClick(): void {
    (this.shadowRoot.querySelector(".datepicker") as any).open();
  }

  private handleContainerClick(): void {
    const input: any = this.shadowRoot.querySelector(".textinput");
    if (input) {
      input.focus();
    } else {
      const datepicker: any = this.shadowRoot.querySelector(".datepicker");
      datepicker.open();
      datepicker.focus();
    }
  }

  private handleInput(update: any): void {
    this.updateValue(update.target.value);
    this.setValues([this.value]);
    this.fireEvent("input");
  }

  /** we just return the value since it should be a string */
  public serializeValue(value: any): string {
    return value;
  }

  public getParentModax(): Modax {
    var parent = this as HTMLElement;

    while (parent) {
      if (parent.parentElement) {
        parent = parent.parentElement;
      } else {
        parent = (parent as any).getRootNode().host;
      }

      if (!parent) {
        return null;
      }

      if (parent.tagName == "TEMBA-MODAX") {
        return parent as Modax;
      }
    }
  }

  public getParentForm(): HTMLFormElement {
    var parent = this as HTMLElement;

    while (parent) {
      if (parent.parentElement) {
        parent = parent.parentElement;
      } else {
        parent = (parent as any).getRootNode().host;
      }

      if (!parent) {
        return null;
      }

      if (parent.tagName === "FORM") {
        return parent as HTMLFormElement;
      }
    }
  }

  // TODO make this a formelement and have contactsearch set the root
  public render(): TemplateResult {
    const containerStyle = {
      height: `${this.textarea ? "100%" : "auto"}`,
    };

    const clear =
      this.clearable && this.inputElement && this.inputElement.value
        ? html`<fa-icon
            class="fa times clear-icon"
            size="14px"
            path-prefix="/sitestatic"
            @click=${this.handleClear}
          />`
        : null;

    let input = html`
      <input
        class="textinput"
        name=${this.name}
        type="${this.password ? "password" : "text"}"
        maxlength="${ifDefined(this.maxlength)}"
        @change=${this.handleChange}
        @input=${this.handleInput}
        @blur=${this.blur}
        @keydown=${(e: KeyboardEvent) => {
          if (e.keyCode == 13) {
            if (!this.ignoreSubmit) {
              this.value = this.values[0];
              this.fireEvent("change");

              const input = this;
              input.blur();

              // look for a form to submit
              window.setTimeout(function () {
                // first, look for a modax that contains us
                const modax = input.getParentModax();
                if (modax) {
                  modax.submit();
                } else {
                  // otherwise, just look for a vanilla submit button
                  const form = input.getParentForm();

                  if (form) {
                    var submitButton = form.querySelector(
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
        value="${this.value}"
      />
    `;
    if (this.textarea) {
      input = html`
        <textarea
          class="textinput"
          name=${this.name}
          placeholder=${this.placeholder}
          @change=${this.handleChange}
          @input=${this.handleInput}
          @blur=${this.blur}
          value=${this.value}
        >
        </textarea>
      `;
    }

    if (this.datepicker || this.datetimepicker) {
      input = html`
        <input
          class="textinput withdate ${this.loading ? "loading" : ""}"
          name=${this.name}
          type="text"
          @click=${this.handleDateClick}
          @focus=${this.handleDateClick}
          @keydown=${(e: any) => {
            e.preventDefault();
          }}
          readonly="true"
          placeholder=${this.placeholder}
          .value="${this.value}"
        />
        <lit-flatpickr
          class="datepicker hidden"
          altInput
          altFormat="${this.datepicker ? "F j, Y" : "F j, Y h:i K"}"
          dateFormat="${this.datepicker ? "Y-m-d" : "Y-m-d H:i"}"
          ?enableTime=${this.datetimepicker}
        ></lit-flatpickr>
      `;
    }

    return html`
      <temba-field
        name=${this.name}
        .label=${this.label}
        .helpText=${this.helpText}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        .hideLabel=${this.hideLabel}
      >
        <div
          class="input-container"
          style=${styleMap(containerStyle)}
          @click=${this.handleContainerClick}
        >
          ${input} ${clear}
          <slot></slot>
        </div>
      </temba-field>
    `;
  }
}
