import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { ContactStoreElement, getDestinationURN } from './ContactStoreElement';

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
      // show the URN that will be used when messaging the contact, falling
      // back to their highest priority URN if none are sendable
      const urn = getDestinationURN(this.data) || this.data.urns[0] || null;
      return html` <temba-contact-name
          name=${this.data.name || this.data.ref}
          urn=${urn ? `${urn.scheme}:${urn.display || urn.path}` : null}
        ></temba-contact-name>
        <slot></slot>`;
    }
    return super.render();
  }
}
