import {
  customElement,
  TemplateResult,
  html,
  css,
  property,
} from "lit-element";
import FormElement from "../FormElement";
import "fa-icons";

@customElement("temba-checkbox")
export default class Checkbox extends FormElement {
  static get styles() {
    return css`
      :host {
        color: var(--color-text);
      }

      temba-field {
        --help-text-margin-left: 24px;
        cursor: pointer;
      }

      .checkbox-container {
        cursor: pointer;
        display: flex;
        user-select: none;
        -webkit-user-select: none;
      }

      .checkbox-label {
        font-family: var(--font-family);
        padding: 0px;
        margin-left: 8px;
        font-weight: 300;
        font-size: 14px;
        line-height: 19px;
      }

      .far {
        height: 16px;
        margin-top: 1px;
      }

      .disabled {
        opacity: 0.5;
      }
    `;
  }

  @property({ type: String })
  name: string;

  @property({ type: Boolean })
  checked: boolean;

  @property({ type: Boolean })
  disabled = false;

  public updated(changes: Map<string, any>) {
    super.updated(changes);
    if (changes.has("checked")) {
      if (this.checked) {
        this.setValue(1);
      } else {
        this.setValue("");
      }
    }
  }

  public serializeValue(value: any): string {
    return value;
  }

  private handleClick(event: MouseEvent): void {
    if (!this.disabled) {
      this.checked = !this.checked;
    }
  }

  public render(): TemplateResult {
    const icon = this.checked
      ? html`
          <fa-icon
            class="far fa-check-square"
            size="16px"
            path-prefix="/sitestatic"
          >
          </fa-icon>
        `
      : html`
          <fa-icon class="far fa-square" size="16px" path-prefix="/sitestatic">
          </fa-icon>
        `;

    return html`
      <temba-field
        name=${this.name}
        .helpText=${this.helpText}
        .errors=${this.errors}
        .widgetOnly=${this.widgetOnly}
        .helpAlways=${true}
        .disabled=${this.disabled}
        @click=${this.handleClick}
      >
        <div class="checkbox-container ${this.disabled ? "disabled" : ""}">
          ${icon}
          ${this.label
            ? html`<div class="checkbox-label">${this.label}</div>`
            : null}
        </div>
      </temba-field>
    `;
  }
}
