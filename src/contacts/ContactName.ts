import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { ContactStoreElement } from './ContactStoreElement';

export class ContactName extends ContactStoreElement {
  @property({ type: Number, attribute: 'icon-size' })
  size = 20;

  static get styles() {
    return css`
      :host {
        display: flex;
      }

      temba-urn {
        margin-right: 0.2em;
        margin-top: 2px;
      }
    `;
  }

  public render(): TemplateResult {
    if (this.data) {
      const urn =
        this.data.urns.length > 0
          ? html`<temba-urn
              size=${this.size}
              urn="${this.data.urns[0]}"
            ></temba-urn>`
          : null;
      return html`
        ${urn}
        <div class="name">${this.data.name}</div>
      `;
    }
  }
}
