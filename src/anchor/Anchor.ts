import { LitElement, TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';

export class Anchor extends LitElement {
  static get styles() {
    return css`
      :host {
        cursor: pointer;
        color: var(--color-link-primary);
      }
    `;
  }

  @property({ type: String })
  href: string;

  private handleClick(evt: MouseEvent) {
    // TODO: fire event instead to be handled upstream
    (window as any).goto(evt);
  }

  public render(): TemplateResult {
    return html`
      <slot href="${this.href}" @click="${this.handleClick}"></slot>
    `;
  }
}
