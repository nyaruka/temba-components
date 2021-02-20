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
import { getContactDisplayName } from "./helpers";

@customElement("temba-contacts")
export default class ContactList extends FormElement {
  @property({ type: String })
  endpoint: string;

  @property({ type: String })
  refreshKey: string;

  static get styles() {
    return css``;
  }

  public refresh(): void {
    this.refreshKey = "requested_" + new Date().getTime();
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
          <div style="flex: 1; font-weight:400; color:#333; margin-top: 0.4em">
            ${getContactDisplayName(contact)}
          </div>
          <div style="font-size: 11px">
            ${timeSince(new Date(contact.modified_on))}
          </div>
        </div>
        ${contact.last_msg
          ? html`
              <div style="font-size: 11px; margin:0.4em 0">
                ${contact.last_msg.text}
              </div>
            `
          : null}
      </div>
    `;
  }

  public render(): TemplateResult {
    return html`
      <temba-list
        @change=${this.handleChange.bind(this)}
        valueKey="uuid"
        .endpoint="${this.endpoint}&folder=open"
        .refreshKey=${this.refreshKey}
        .renderOption=${this.renderOption.bind(this)}
      ></temba-list>
    `;
  }
}
