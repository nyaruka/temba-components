import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { ContactStoreElement } from './ContactStoreElement';

export class ContactNameFetch extends ContactStoreElement {
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
      const urn = this.data.urns.length > 0 ? this.data.urns[0] : null;
      return html` <temba-contact-name
          name=${this.data.name || this.data.ref}
          urn=${urn ? `${urn.scheme}:${urn.display || urn.path}` : null}
        ></temba-contact-name>
        <slot></slot>`;
    }
    return super.render();
  }
}
