import {
  customElement,
  property,
  LitElement,
  TemplateResult,
  html,
  css,
} from "lit-element";

@customElement("temba-icon")
export default class VectorIcon extends LitElement {
  static get styles() {
    return css`
      :host {
        margin: auto;
        --icon-color: var(--text-color);
        --icon-color-hover: var(--icon-color);
      }

      :host([id="flow"]),
      :host([name="flow"]) {
        padding-bottom: 0.2em;
      }

      :host([id="bullhorn"]),
      :host([name="bullhorn"]) {
        padding-bottom: 0.1em;
      }

      :host([id="warning"]),
      :host([name="warning"]) {
        fill: var(--color-error);
      }

      svg {
        display: block;
        fill: var(--icon-color);
      }

      svg:hover {
      }
    `;
  }

  constructor() {
    super();
  }

  @property({ type: String })
  name: string;

  // same as name but without implicit coloring
  @property({ type: String })
  id: string;

  @property({ type: Number })
  size: number = 1;

  public render(): TemplateResult {
    return html`
      <svg style="height:${this.size}em;width:${this.size}em;">
        <use href="/sitestatic/icons/symbol-defs.svg?#icon-${
          this.name || this.id
        }"></i>
      </span>
    `;
  }
}
