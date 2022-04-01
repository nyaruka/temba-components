import { TemplateResult, html, css } from 'lit';
import { FormElement } from '../FormElement';
import { property } from 'lit/decorators';

export class Checkbox extends FormElement {
  static get styles() {
    return css`
      :host {
        color: var(--color-text);
        display: inline-block;
      }

      :host([label]) {
        width: 100%;
      }

      .wrapper.label {
        padding: 10px;
        border-radius: var(--curvature);
      }

      .wrapper.label:hover {
        background: #f9f9f9;
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
        flex-grow: 1;
      }

      .far {
        height: 16px;
        margin-top: 1px;
      }

      .disabled {
        cursor: not-allowed;
        --icon-color: #ccc;
      }
    `;
  }

  @property({ type: String })
  name = '';

  @property({ type: Boolean })
  checked: boolean;

  @property({ type: Boolean })
  disabled = false;

  @property({ type: Number })
  size = 1.2;

  @property({ type: String })
  animateChange = 'pulse';

  public updated(changes: Map<string, any>) {
    super.updated(changes);
    if (changes.has('checked')) {
      if (this.checked) {
        this.setValue(1);
      } else {
        this.setValue('');
      }

      this.fireEvent('change');
    }
  }

  public serializeValue(value: any): string {
    return value;
  }

  private handleClick(): void {
    if (!this.disabled) {
      this.checked = !this.checked;
    }
  }

  public click(): void {
    this.handleClick();
    super.click();
  }

  public render(): TemplateResult {
    const icon = html`<temba-icon
      name="${this.checked ? 'check-' : ''}square"
      size="${this.size}"
      animatechange="${this.animateChange}"
    />`;

    return html`
      <div class="wrapper ${this.label ? 'label' : ''}">
        <temba-field
          name=${this.name}
          .helpText=${this.helpText}
          .errors=${this.errors}
          .widgetOnly=${this.widgetOnly}
          .helpAlways=${true}
          ?disabled=${this.disabled}
          @click=${this.handleClick}
        >
          <div class="checkbox-container ${this.disabled ? 'disabled' : ''}">
            ${icon}
            ${this.label
              ? html`<div class="checkbox-label">${this.label}</div>`
              : null}
          </div>
        </temba-field>
      </div>
    `;
  }
}
