import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { Contact, Group, Ticket } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { isDate, timeSince, truncate } from '../utils';
import { Store } from '../store/Store';
import { BODY_SNIPPET_LENGTH, fetchContact } from './helpers';

export class ContactDetails extends RapidElement {
  static get styles() {
    return css`
      :host {
        background: #f9f9f9;
        display: block;
        height: 100%;
        position: relative;
        overflow: hidden;
        -webkit-mask-image: -webkit-radial-gradient(white, black);
      }

      .contact {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        height: 100%;
      }

      .wrapper {
        padding: 0em 1em;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
      }

      a {
        color: var(--color-link-primary);
      }

      .field-links {
        font-size: 0.8em;
      }

      .contact > .name {
        font-size: 1.2em;
        font-weight: 400;
        padding: 0.5em 0.75em;
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
        user-select: none;
        -webkit-user-select: none;
        margin-right: 0.75em;
        margin-bottom: 0.75em;
      }

      .groups {
        margin-top: 0.55em;
        padding: 0px 0.75em;
        margin-bottom: 0.3em;
      }

      .start-flow {
      }

      .actions {
        margin-top: 16px;
        border: 0px solid #ddd;
        border-radius: var(--curvature);
        padding: 0px;
      }

      .fields-wrapper {
        background: #fff;
        overflow: hidden;
        margin: 0em -1em;

        display: flex;
        align-items: stretch;
        flex-direction: column;
        transition: all 300ms linear;
      }

      .fields-wrapper.expanded {
        flex-grow: 2;
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
        overflow-y: auto;
      }

      .fields-wrapper.expanded .fields {
        flex-grow: 1;
        height: 0px;
      }

      .field {
        border-radius: var(--curvature);

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

  @property({ type: Object })
  contact: Contact;

  @property({ attribute: false })
  flow: any = null;

  // the fields with values for this contact
  @property({ type: Array })
  fields: string[] = [];

  @property({ type: String })
  endpoint: string;

  @property({ type: Boolean })
  expandFields = false;

  @property({ type: Boolean })
  expandBody = false;

  @property({ type: Boolean })
  showGroups = false;

  @property({ type: Boolean })
  showFlows = false;

  @property({ type: Object })
  ticket: Ticket = null;

  public updated(changes: Map<string, any>) {
    super.updated(changes);

    if (changes.has('contact')) {
      const store: Store = document.querySelector('temba-store');
      if (this.contact && this.contact.fields) {
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
      }
    }

    if (changes.has('endpoint')) {
      this.flow = null;
      this.expandFields = false;
      fetchContact(this.endpoint).then((contact: Contact) => {
        this.contact = contact;
      });
    }
  }

  private handleFlowChanged(evt: CustomEvent) {
    this.flow = evt.detail.selected as any;
  }

  private handleToggleFields(): void {
    this.expandFields = !this.expandFields;
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
        ${this.ticket
          ? html`<div class="name">${this.name || this.contact.name}</div>`
          : null}
        ${this.showGroups && !this.ticket
          ? html`<div class="groups">
              ${this.contact.groups.map((group: Group) => {
                return html`
                  <div
                    onclick="goto(event)"
                    href="/contact/filter/${group.uuid}/"
                    class="group-label"
                    style="cursor:pointer"
                  >
                    ${group.is_dynamic
                      ? html`<temba-icon name="atom"></temba-icon>`
                      : null}${group.name}
                  </div>
                `;
              })}
            </div>`
          : html``}

        <div class="wrapper">
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
            ? html` <div
                  class="fields-wrapper ${this.expandFields ? 'expanded' : ''}"
                >
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
                  </div>
                </div>
                <div style="display:flex;">
                  <div style="flex-grow:1"></div>
                  <div style="margin-right:1em;margin-top:-0.5em">
                    ${this.fields.length > 3
                      ? html`<temba-icon
                          name="chevrons-${this.expandFields ? 'up' : 'down'}"
                          @click=${this.handleToggleFields}
                          animateChange="spin"
                          circled
                          clickable
                        ></temba-icon>`
                      : null}
                  </div>
                </div>`
            : null}
          <div style="flex-grow:1"></div>
        </div>
      </div>`;
    }
  }
}
