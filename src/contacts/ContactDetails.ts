import {
  css,
  customElement,
  html,
  property,
  TemplateResult,
} from "lit-element";
import { Contact, ContactTicket, Group } from "../interfaces";
import RapidElement from "../RapidElement";
import { fetchResults, isDate, timeSince } from "../utils";
import Button from "../button/Button";
import Store from "../store/Store";
import { fetchContact } from "./helpers";

@customElement("temba-contact-details")
export default class ContactDetails extends RapidElement {
  // display name comes from the tickets endpoint
  @property({ type: Object })
  ticket: ContactTicket;

  @property({ attribute: false, type: Object })
  contact: Contact;

  @property({ attribute: false })
  flow: any = null;

  // the fields with values for this contact
  @property({ type: Array })
  fields: string[] = [];

  @property({ type: String })
  endpoint: string;

  static get styles() {
    return css`
      :host {
        box-shadow: inset 7px 0 3px -7px rgba(0, 0, 0, 0.1);
        background: #f9f9f9;
        display: block;
        height: 100%;
      }

      .wrapper {
        padding-right: 3.5em;
        padding-left: 1em;
      }

      a {
        color: var(--color-link-primary);
      }

      .field-links {
        font-size: 0.8em;
      }

      .contact {
        // border-top-right-radius: 0.5em;
        // overflow: hidden;
      }

      .contact > .name {
        box-shadow: inset 7px 0 3px -7px rgba(0, 0, 0, 0.1);

        font-size: 18px;
        font-weight: 400;
        // margin-top: -0.75em;
        // margin-left: -0.75em;
        // margin-right: -2em;
        padding: 0.75em;
        padding-right: 1em;
        margin-bottom: 0.5em;
        background: #444;
        color: #f2f2f2;
      }

      .group-label temba-icon {
        display: inline-block;
        fill: var(--color-text-dark);
        margin-bottom: -2px;
        margin-right: 4px;
      }

      .group-label {
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
          0 1px 2px 0 rgba(0, 0, 0, 0.06);
        line-height: 1.25;
        text-decoration: none;
        cursor: default;
        padding-left: 0.5rem;
        padding-right: 0.5rem;
        padding-top: 0.25rem;
        padding-bottom: 0.25rem;
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 400;
        border-radius: 9999px;
        background-color: #f1f1f1;
        color: rgba(0, 0, 0, 0.5);
        letter-spacing: 0.025em;
        white-space: nowrap;
        text-align: center;
        margin-right: 6px;
        margin-top: 6px;
        user-select: none;
        -webkit-user-select: none;
      }

      .group-label::before {
        // content: "\ebeb";
        // font-family: "temba";
      }

      .start-flow {
      }

      .actions {
        margin-top: 16px;
        border: 0px solid #ddd;
        border-radius: 0.5em;
        padding: 0px;
      }

      .fields-wrapper {
        margin-top: 1em;
        background: #fff;
        border-radius: 0.5em;
        overflow: hidden;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
          0 1px 2px 0 rgba(0, 0, 0, 0.06);
      }

      .fields {
        padding: 1em;
        max-height: 200px;
        border-radius: 0.5em;
        overflow-y: auto;
        -webkit-mask-image: -webkit-radial-gradient(white, black);
      }

      .field {
        border-radius: 0.5em;

        display: flex;
        flex-direction: column;
        margin-bottom: 0.3em;
      }

      .field .name {
        margin-right: 8px;
        font-weight: 400;
        color: #666;
        font-size: 0.9em;
      }
      .field .value {
        font-size: 0.8em;
      }

      temba-button {
        margin-top: 5px;
        display: block;
        --button-y: 0;
      }
    `;
  }

  public updated(changes: Map<string, any>) {
    super.updated(changes);
    if (changes.has("endpoint")) {
      this.flow = null;
      this.expandFields = false;

      const store: Store = document.querySelector("temba-store");

      fetchContact(this.endpoint).then((contact: Contact) => {
        this.contact = contact;
        this.fields = Object.keys(this.contact.fields).filter(
          (key: string) => !!this.contact.fields[key]
        );

        this.contact.groups.forEach((group: Group) => {
          group.is_dynamic = store.isDynamicGroup(group.uuid);
        });

        this.contact.groups.sort((a: Group, b: Group) => {
          if (a.is_dynamic) {
            return -1;
          }
          if (b.is_dynamic) {
            return 1;
          }
          return a.name.localeCompare(b.name);
        });
      });
    }
  }

  private handleFlowChanged(evt: CustomEvent) {
    this.flow = evt.detail.selected as any;
  }

  private handleExpandFields(): void {
    this.expandFields = true;
  }

  private handleHideFields(): void {
    this.expandFields = false;
  }

  @property({ type: Boolean })
  expandFields: boolean = false;

  public render(): TemplateResult {
    const store: Store = document.querySelector("temba-store");
    if (this.contact) {
      return html`<div class="contact">
        <div class="name">${this.contact.name || this.ticket.contact.name}</div>
        <div class="wrapper">
          <div>
            ${this.contact.groups.map((group: Group) => {
              return html`<a href="/contact/filter/${group.uuid}/" target="_"
                ><div class="group-label" style="cursor:pointer">
                  ${group.is_dynamic
                    ? html`<temba-icon name="atom"></temba-icon>`
                    : null}${group.name}
                </div></a
              >`;
            })}
          </div>
          ${this.fields.length > 0
            ? html` <div class="fields-wrapper">
                <div class="fields">
                  ${this.fields
                    .slice(0, this.expandFields ? 255 : 3)
                    .map((key: string) => {
                      let value = this.contact.fields[key];

                      if (value) {
                        if (isDate(value)) {
                          value = timeSince(new Date(value));
                        }
                        return html`<div class="field">
                          <div class="name">
                            ${store.getContactField(key).label}
                          </div>
                          <div class="value">${value}</div>
                        </div>`;
                      }
                    })}

                  <div class="field-links">
                    ${this.fields.length > 3
                      ? !this.expandFields
                        ? html`<a href="#" @click="${this.handleExpandFields}"
                            >more</a
                          >`
                        : html`<a href="#" @click="${this.handleHideFields}"
                            >less</a
                          >`
                      : null}
                  </div>
                </div>
              </div>`
            : null}

          <!--div class="actions">
          <div class="start-flow">
            <temba-select
              endpoint="/api/v2/flows.json?archived=false"
              placeholder="Start Flow"
              flavor="small"
              .values=${this.flow ? [this.flow] : []}
              @temba-selection=${this.handleFlowChanged}
            ></temba-select>
          </div>
        </div-->
        </div>
      </div>`;
    }
  }
}
