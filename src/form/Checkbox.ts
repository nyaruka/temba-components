import { TemplateResult, html, css } from 'lit';
import { FieldElement } from './FieldElement';
import { property } from 'lit/decorators.js';
import { Icon } from '../Icons';
import { renderMarkdownInline } from '../markdown';

export class Checkbox extends FieldElement {
  static get styles() {
    return css`
      ${super.styles}

      :host {
        color: var(--color-text);
        display: inline-block;
      }

      :host([label]) {
        width: 100%;
      }

      .wrapper.label {
        padding: var(--checkbox-padding, 10px);
        border-radius: var(--curvature);
      }

      .wrapper.label:hover {
        background: var(--checkbox-hover-bg, #f9f9f9);
      }

      .checkbox-container {
        cursor: pointer;
        display: flex;
        align-items: flex-start;
        user-select: none;
        -webkit-user-select: none;
      }

      .checkbox-container temba-icon {
        align-self: flex-start;
        vertical-align: top;
        line-height: 1;
      }

      .label-and-help {
        flex-grow: 1;
        margin-left: 8px;
      }

      .checkbox-label {
        font-family: var(--font-family);
        padding: 0px;
        margin: 0px;
        font-size: 14px;
        line-height: 19px;
      }

      .checkbox-help-text {
        font-family: var(--font-family);
        font-size: var(--help-text-size, 0.85em);
        line-height: normal;
        color: var(--color-text-help);
        margin-top: 4px;
        opacity: 1;
      }

      /* Checkbox help text should align with the checkbox icon, not indented */
      .help-text {
        margin-left: 0;
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
  partial: boolean;

  @property({ type: Boolean })
  disabled = false;

  @property({ type: Number })
  size = 1.2;

  @property({ type: String })
  animateChange = 'pulse';

  public connectedCallback() {
    super.connectedCallback();
  }

  public updated(changes: Map<string, any>) {
    super.updated(changes);

    // Normalize label property changes
    if (changes.has('label')) {
      // Normalize whitespace labels to empty string for proper behavior
      if (
        this.label &&
        typeof this.label === 'string' &&
        this.label.trim() === ''
      ) {
        this.label = '';
      }
      // Ensure undefined labels remain as null to match test expectations
      if (this.label === undefined) {
        this.label = null;
      }
    }

    if (changes.has('checked') || changes.has('value')) {
      if (this.checked || this.partial) {
        this.internals.setFormValue(this.value || '1');
      } else {
        this.internals.setFormValue(undefined);
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

  protected renderWidget(): TemplateResult {
    const icon = html`<temba-icon
      name="${this.checked
        ? Icon.checkbox_checked
        : this.partial
        ? Icon.checkbox_partial
        : Icon.checkbox}"
      size="${this.size}"
      animatechange="${this.animateChange}"
    ></temba-icon>`;

    return html`
      <div
        class="wrapper ${this.label ? 'label' : ''}"
        @click=${this.handleClick}
      >
        <div class="checkbox-container ${this.disabled ? 'disabled' : ''}">
          ${icon}
          <div class="label-and-help">
            ${this.label && String(this.label).trim()
              ? html`<div class="checkbox-label">${this.label}</div>`
              : null}
            ${this.helpText && this.helpText !== 'None'
              ? html` <div class="checkbox-help-text">${this.helpText}</div> `
              : null}
          </div>
        </div>
      </div>
    `;
  }

  protected renderField(): TemplateResult {
    // Use standard FieldElement behavior but skip the field label since checkbox renders its own inline
    const hasErrors = !this.hideErrors && this.errors && this.errors.length > 0;
    const errors = hasErrors
      ? this.errors.map((error: string) => {
          return html`
            <div class="alert-error">${renderMarkdownInline(error)}</div>
          `;
        })
      : [];

    if (this.widgetOnly) {
      return html`
        <div class="${this.disabled ? 'disabled' : ''}">
          ${this.renderWidget()}
        </div>
        ${errors}
      `;
    }

    // This matches FieldElement.renderField() but without the field label
    return html`
      <div
        class="field ${this.disabled ? 'disabled' : ''} ${hasErrors
          ? 'has-error'
          : ''}"
      >
        <div class="widget">${this.renderWidget()} ${errors}</div>
      </div>
    `;
  }

  public render(): TemplateResult {
    return this.renderField();
  }
}
