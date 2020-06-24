import {
  customElement,
  TemplateResult,
  html,
  css,
  property,
} from "lit-element";
import { styleMap } from "lit-html/directives/style-map.js";
import FormElement from "../FormElement";
import "lit-flatpickr";

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
        padding: 9px;
        border: none;
        flex: 1;
        margin: 0;
        background: none;
        color: var(--color-widget-text);
        font-family: var(--font-family);
        font-size: 13px;
        cursor: text;
        resize: none;
        font-weight: 300;
        width: 100%;
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

  @property({ type: String })
  placeholder: string = "";

  @property({ type: String })
  value: string = "";

  @property({ type: String })
  name: string = "";

  @property({ type: Object })
  inputElement: HTMLInputElement;

  @property({ type: Object })
  dateElement: any;

  public firstUpdated(changes: Map<string, any>) {
    super.firstUpdated(changes);

    this.inputElement = this.shadowRoot.querySelector(".textinput");
    this.dateElement = this.shadowRoot.querySelector(".datepicker");

    if (this.dateElement) {
      const picker = this.dateElement;
      window.setTimeout(() => {
        this.dateElement.set(
          "onChange",
          (dates: Date[], formattedDate: string) => {
            this.inputElement.value = picker.formatDate(
              dates[0],
              picker.altFormat
            );
            this.setValue(formattedDate);
            this.inputElement.blur();
          }
        );
      }, 1000);
    }
  }

  public updated(changes: Map<string, any>) {
    super.updated(changes);
    if (changes.has("value")) {
      this.setValues([this.value]);
      this.fireEvent("change");
    }
  }

  private handleChange(update: any): void {
    this.value = update.target.value;
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
    this.value = update.target.value;
    this.fireEvent("input");
  }

  /** we just return the value since it should be a string */
  public serializeValue(value: any): string {
    return value;
  }

  // TODO make this a formelement and have contactsearch set the root
  public render(): TemplateResult {
    const containerStyle = {
      height: `${this.textarea ? "100%" : "auto"}`,
    };

    let input = html`
      <input
        class="textinput"
        name=${this.name}
        type="text"
        @change=${this.handleChange}
        @input=${this.handleInput}
        placeholder=${this.placeholder}
        .value="${this.value}"
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
          .value=${this.value}
        >
        </textarea>
      `;
    }

    if (this.datepicker) {
      input = html`
        <input
          class="textinput"
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
          id="my-date-picker"
          altInput
          altFormat="F j, Y"
          dateFormat="Y-m-d"
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
          ${input}
          <slot></slot>
        </div>
      </temba-field>
    `;
  }
}
