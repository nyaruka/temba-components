import { css, html, property, TemplateResult } from 'lit-element';
import { Contact, Group, Ticket } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { isDate, timeSince, truncate } from '../utils';
import { Store } from '../store/Store';
import { BODY_SNIPPET_LENGTH, fetchContact } from './helpers';

export class ContactDetails extends RapidElement {
  static get styles() {
    return css`
      :host {
        box-shadow: inset 14px 0 7px -14px rgba(0, 0, 0, 0.15);
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

      .contact > .name {
        font-size: 18px;
        font-weight: 400;
        padding: 0.75em;
        padding-right: 1em;
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

      .body-wrapper {
        overflow: hidden;
      }

      .body {
        max-height: 200px;
        overflow-y: auto;
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
        word-break: break-word;
      }
      .field .value {
        font-size: 0.8em;
        word-break: break-word;
      }

      temba-button {
        margin-top: 5px;
        display: block;
        --button-y: 0;
      }
    `;
  }

  // optional display name
  @property({ type: String })
  name: string;

  @property({ type: String })
  uuid: string;

  @property({ attribute: false, type: Object })
  contact: Contact;

  @property({ attribute: false })
  flow: any = null;

  // the fields with values for this contact
  @property({ type: Array })
  fields: string[] = [];

  @property({ type: String })
  endpoint: string;

  @property({ type: Boolean })
  expandFields: boolean = false;

  @property({ type: Boolean })
  expandBody: boolean = false;

  @property({ type: Boolean })
  showGroups: boolean = false;

  @property({ type: Boolean })
  showFlows: boolean = false;

  @property({ type: Object })
  ticket: Ticket = null;

  public updated(changes: Map<string, any>) {
    super.updated(changes);
    if (changes.has('endpoint')) {
      this.flow = null;
      this.expandFields = false;

      const store: Store = document.querySelector('temba-store');

      fetchContact(this.endpoint).then((contact: Contact) => {
        this.contact = contact;
        this.fields = Object.keys(this.contact.fields).filter((key: string) => {
          const hasField = !!this.contact.fields[key];
          return hasField && store.getContactField(key).pinned;
        });

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

  private handleExpandBody(): void {
    this.expandBody = true;
  }

  private handleHideBody(): void {
    this.expandBody = false;
  }

  public render(): TemplateResult {
    const store: Store = document.querySelector('temba-store');

    let body = this.ticket ? this.ticket.body : null;
    const showBodyToggle = body ? body.length > BODY_SNIPPET_LENGTH : false;
    if (
      !this.expandBody &&
      this.ticket &&
      this.ticket.body.length > BODY_SNIPPET_LENGTH
    ) {
      body = truncate(this.ticket.body, BODY_SNIPPET_LENGTH);
    }

    if (this.contact) {
      return html`<div class="contact">
        <div class="name">${this.name || this.contact.name}</div>
        <div class="wrapper">
          ${this.showGroups
            ? html`<div>
                ${this.contact.groups.map((group: Group) => {
                  return html`<a
                    href="/contact/filter/${group.uuid}/"
                    target="_"
                    ><div class="group-label" style="cursor:pointer">
                      ${group.is_dynamic
                        ? html`<temba-icon name="atom"></temba-icon>`
                        : null}${group.name}
                    </div></a
                  >`;
                })}
              </div>`
            : html``}
          ${body
            ? html`<div class="body-wrapper">
                <div class="body">${body}</div>
                <div class="field-links">
                  ${showBodyToggle
                    ? !this.expandBody
                      ? html`<a href="#" @click="${this.handleExpandBody}"
                          >more</a
                        >`
                      : html`<a href="#" @click="${this.handleHideBody}"
                          >less</a
                        >`
                    : null}
                </div>
              </div>`
            : null}
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

          <div class="actions">
            ${this.showGroups
              ? html`
                  <div class="start-flow">
                    <temba-select
                      endpoint="/api/v2/flows.json?archived=false"
                      placeholder="Start Flow"
                      flavor="small"
                      .values=${this.flow ? [this.flow] : []}
                      @temba-selection=${this.handleFlowChanged}
                    ></temba-select>
                  </div>
                `
              : null}
          </div>
        </div>
      </div>`;
    }
  }
}
