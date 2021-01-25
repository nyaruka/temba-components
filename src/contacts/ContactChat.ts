import {
  css,
  customElement,
  html,
  property,
  TemplateResult,
} from "lit-element";
import RapidElement from "../RapidElement";
import ContactDetails from "../contacts/ContactDetails";
import { Contact } from "../interfaces";

@customElement("temba-contact-chat")
export default class ContactChat extends RapidElement {
  @property({ type: Object })
  contact: Contact;

  static get styles() {
    return css`
      :host {
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
          0 1px 2px 0 rgba(0, 0, 0, 0.06);
        padding: 1rem;
        height: 100%;
        border-radius: 0.5rem;
        background-color: #fff;
        flex-grow: 1;
        width: 100%;
        display: block;
        overflow: hidden;
      }

      temba-contact-details {
        margin: -1em;
        width: 200px;
      }

      temba-textinput {
        --textarea-height: 75px;
      }
    `;
  }

  public render(): TemplateResult {
    return html`
      <div style="display: flex; height: 100%">
        <div style="flex-grow: 2; margin-right: 2em; min-width:400px">
          <div style="display: flex; flex-direction: column; height: 100%">
            <div style="flex-grow: 1;">Chat history</div>
            <temba-textinput textarea></temba-textinput>
          </div>
        </div>
        <temba-contact-details .contact=${this.contact}></temba-contact-details>
      </div>
    `;
  }
}
