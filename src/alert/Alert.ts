import {
  css,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";

@customElement("temba-alert")
export default class Alert extends LitElement {
  static get styles() {
    return css`
      :host {
        display: block;
      }

      .temba-alert {
        color: var(--color-text-dark);
        padding: 8px;
        border-left: 6px inset rgba(0, 0, 0, 0.2);
        border-radius: var(--curvature-widget);
        font-size: 12px;
      }

      .temba-info {
        background: var(--color-info);
      }

      .temba-warning {
        background: var(--color-warning);
      }

      .temba-error {
        color: var(--color-error);
      }
    `;
  }

  @property({ type: String })
  level: string = "info";

  public render(): TemplateResult {
    return html`
      <div class="temba-alert temba-${this.level}"><slot></slot></div>
    `;
  }
}
