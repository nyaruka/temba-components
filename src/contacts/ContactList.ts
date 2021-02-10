import {
  css,
  customElement,
  html,
  property,
  TemplateResult,
} from "lit-element";
import TembaList from "../list/TembaList";
import FormElement from "../FormElement";
import { timeSince } from "../utils";
import { loremIpsum } from "lorem-ipsum";

export const createContact = (contact: any) => {
  contact["snippet"] = loremIpsum();
};

@customElement("temba-contacts")
export default class ContactList extends FormElement {
  @property({ type: String })
  endpoint: string;

  static get styles() {
    return css``;
  }

  private handleChange(event: Event) {
    this.value = (event.target as TembaList).selected;
    this.dispatchEvent(new Event("change"));
  }

  /** An option in the drop down */
  private renderOption(contact: any, selected: boolean): TemplateResult {
    return html`
      <div style="display: flex-col;">
        <div style="display:flex;	align-items: center;">
          <div style="flex: 1; font-weight:400">${contact.name}</div>
          <div style="font-size: 11px">
            ${timeSince(new Date(contact.modified_on))}
          </div>
        </div>
        <div style="font-size: 11px">${contact.snippet}</div>
      </div>
    `;
  }

  public render(): TemplateResult {
    return html`
      <temba-list
        @change=${this.handleChange.bind(this)}
        valueKey="uuid"
        .endpoint=${this.endpoint}
        .renderOption=${this.renderOption.bind(this)}
        .sanitizeOption=${createContact}
      ></temba-list>
    `;
  }
}
