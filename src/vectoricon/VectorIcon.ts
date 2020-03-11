import {
  customElement,
  property,
  LitElement,
  TemplateResult,
  html,
  css
} from "lit-element";

@customElement("temba-icon")
export default class VectorIcon extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline-block;
        --icon-color: var(--color-text);
      }

      .fas {
        transition: transform ease-in-out 150ms;
        color: var(--icon-color);
      }
    `;
  }

  constructor() {
    super();
    const fontEl = document.createElement("link");
    fontEl.rel = "stylesheet";
    fontEl.href = "https://use.fontawesome.com/releases/v5.0.13/css/all.css";
    document.head.appendChild(fontEl);
  }

  @property({ type: String })
  name: string;

  @property({ type: Number })
  size: number = 16;

  @property({ type: String })
  hoverColor: string = "#666";

  public render(): TemplateResult {
    return html`
      <span style="font-size: ${this.size}px;">
        <i class="fas fa-${this.name}"></i>
      </span>
    `;
  }
}
