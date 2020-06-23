import {
  customElement,
  TemplateResult,
  html,
  css,
  property,
  LitElement,
} from "lit-element";

/**
 * A small wrapper to display labels and help text in a smartmin style.
 * This exists so we can display things consistently before restyling.
 */
@customElement("temba-field")
export default class FormField extends LitElement {
  static get styles() {
    return css`
      :host {
        font-family: var(--font-family);
      }

      label {
        margin-bottom: 2px;
        margin-left: 4px;
        display: block;   
        font-weight: 400;
        font-size: 13px;
        letter-spacing: 0.05em;
        line-height: inherit;
        color: #777;
      }

      .help-text {
        font-size: 11px;
        line-height: inherit;
        color: var(--color-text-help);
        margin-left: 4px;
        margin-top: -20px;
        opacity: 0;
        transition: opacity ease-in-out 100ms, margin-top ease-in-out 200ms;
        pointer-events: none;
      }

      .field:focus-within .help-text {
        margin-top: 2px;
        opacity: 1;
      }

      temba-alert {
        margin-top: 10px;
      }
    }`;
  }

  @property({ type: Boolean, attribute: "hide_label" })
  hideLabel: boolean;

  @property({ type: Boolean, attribute: "widget_only" })
  widgetOnly: boolean;

  @property({ type: Array, attribute: false })
  errors: string[] = [];

  @property({ type: String, attribute: "help_text" })
  helpText: string;

  @property({ type: String })
  label: string;

  @property({ type: String })
  name: string;

  public render(): TemplateResult {
    const errors = (this.errors || []).map((error: string) => {
      return html` <temba-alert level="error">${error}</temba-alert> `;
    });

    if (this.widgetOnly) {
      return html`
        <slot></slot>
        ${errors}
      `;
    }

    return html`
      <div class="field">
        ${this.name && !this.hideLabel
          ? html`
              <label class="control-label" for="${this.name}"
                >${this.label}</label
              >
            `
          : null}
        <div class="widget">
          <slot></slot>
        </div>
        ${this.helpText
          ? html` <div class="help-text">${this.helpText}</div> `
          : null}
        ${errors}
      </div>
    `;
  }
}
