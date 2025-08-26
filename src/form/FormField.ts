import { TemplateResult, html, css, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { renderMarkdownInline } from '../markdown';

/**
 * A small wrapper to display labels and help text in a smartmin style.
 * This exists so we can display things consistently before restyling.
 */
export class FormField extends LitElement {
  static get styles() {
    return css`
      :host {
        font-family: var(--font-family);
      }

      label {
        margin-bottom: 5px;
        margin-left: 4px;
        display: block;
        font-weight: 400;
        font-size: var(--label-size);
        letter-spacing: 0.05em;
        line-height: normal;
        color: var(--color-label, #777);
      }

      .help-text {
        font-size: var(--help-text-size);
        line-height: normal;
        color: var(--color-text-help);
        margin-left: var(--help-text-margin-left);
        margin-top: 6px;
        opacity: 1;
      }

      .alert-error {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 1000;
        background: white;
        border: 1px solid var(--color-error);
        color: var(--color-error);
        padding: 8px 12px;
        margin: 2px 0 0 0;
        border-radius: var(--curvature);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
          0 2px 4px -1px rgba(0, 0, 0, 0.06);
        font-size: 0.85em;
        line-height: 1.2;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-12px);
        transition: opacity 0.2s ease-in-out, visibility 0.2s ease-in-out,
          transform 0.2s ease-in-out;
      }

      .field:hover .alert-error {
        opacity: 1;
        visibility: visible;
        transform: translateY(2px);
      }

      /* Hide error popup when widget is focused */
      .field:focus-within .alert-error {
        opacity: 0;
        visibility: hidden;
        transform: translateY(-4px);
      }

      .field.has-error {
        position: relative;
        /* Set CSS custom properties that form components can use */
        --color-widget-border: var(--color-error);
        --widget-box-shadow-focused: var(
          --widget-box-shadow-focused-error,
          0 0 0 3px rgba(255, 99, 71, 0.3)
        );
        --color-focus: var(--color-error);
      }

      .field.has-error .widget {
        border-radius: var(--curvature-widget);
        position: relative;
      }

      /* Force error styling with higher specificity */
      :host(.has-error) .field.has-error .widget .input-container,
      :host(.has-error) .field.has-error .widget .select-container,
      :host(.has-error) .field.has-error .widget .comp-container,
      :host(.has-error) .field.has-error .widget .checkbox-container,
      :host(.has-error) .field.has-error .widget .container,
      :host(.has-error) .field.has-error .widget .range-container,
      .field.has-error .widget .input-container,
      .field.has-error .widget .select-container,
      .field.has-error .widget .comp-container,
      .field.has-error .widget .checkbox-container,
      .field.has-error .widget .container,
      .field.has-error .widget .range-container {
        border-color: var(--color-error) !important;
      }

      /* When error field is focused, use error-colored focus ring */
      :host(.has-error) .field.has-error .widget .input-container:focus-within,
      :host(.has-error) .field.has-error .widget .select-container:focus-within,
      :host(.has-error) .field.has-error .widget .select-container.focused,
      :host(.has-error) .field.has-error .widget .comp-container:focus-within,
      :host(.has-error)
        .field.has-error
        .widget
        .checkbox-container:focus-within,
      :host(.has-error) .field.has-error .widget .container:focus-within,
      :host(.has-error) .field.has-error .widget .range-container:focus-within,
      .field.has-error .widget .input-container:focus-within,
      .field.has-error .widget .select-container:focus-within,
      .field.has-error .widget .select-container.focused,
      .field.has-error .widget .comp-container:focus-within,
      .field.has-error .widget .checkbox-container:focus-within,
      .field.has-error .widget .container:focus-within,
      .field.has-error .widget .range-container:focus-within {
        border-color: var(--color-error) !important;
        box-shadow: var(
          --widget-box-shadow-focused-error,
          0 0 0 3px rgba(255, 99, 71, 0.3)
        ) !important;
      }

      .alert-error p {
        margin: 0;
        padding: 0;
      }

      .disabled {
        opacity: var(--disabled-opacity) !important;
        pointer-events: none !important;
      }
    `;
  }

  @property({ type: Boolean, attribute: 'hide_label' })
  hideLabel = false;

  @property({ type: Boolean, attribute: 'widget_only' })
  widgetOnly = false;

  @property({ type: Array, attribute: false })
  errors: string[] = [];

  @property({ type: Boolean })
  hideErrors = false;

  @property({ type: String, attribute: 'help_text' })
  helpText = '';

  @property({ type: String })
  label = '';

  @property({ type: String })
  name = '';

  @property({ type: Boolean })
  disabled = false;

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);

    if (
      changedProperties.has('errors') ||
      changedProperties.has('hideErrors')
    ) {
      const hasErrors =
        !this.hideErrors && this.errors && this.errors.length > 0;
      this.classList.toggle('has-error', hasErrors);
    }
  }

  public render(): TemplateResult {
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
        <div class="${this.disabled ? 'disabled' : ''}"><slot></slot></div>
        ${errors}
      `;
    }

    return html`
      <div
        class="field ${this.disabled ? 'disabled' : ''} ${hasErrors
          ? 'has-error'
          : ''}"
      >
        ${!!this.name && !this.hideLabel && !!this.label
          ? html`
              <label class="control-label" for="${this.name}"
                >${this.label}</label
              >
            `
          : null}
        <div class="widget">
          <slot></slot>
          ${errors}
        </div>
        ${this.helpText && this.helpText !== 'None'
          ? html`
              <div class="help-text">
                ${renderMarkdownInline(this.helpText)}
              </div>
            `
          : null}
      </div>
    `;
  }
}
