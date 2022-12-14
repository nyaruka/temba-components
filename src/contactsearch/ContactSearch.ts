import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { getClasses, postJSON, WebResponse } from '../utils';
import { TextInput } from '../textinput/TextInput';
import '../alert/Alert';
import { Contact, CustomEventType } from '../interfaces';
import { FormElement } from '../FormElement';
import { Checkbox } from '../checkbox/Checkbox';

const QUEIT_MILLIS = 1000;

interface SummaryResponse {
  total: number;
  sample: Contact[];
  query: string;
  fields: { [uuid: string]: { label: string; type: string } };
  error?: string;
}

export class ContactSearch extends FormElement {
  static get styles() {
    return css`
      :host {
        color: var(--color-text);
      }

      .urn {
        width: 120px;
      }

      .name {
        width: 160px;
      }

      .date {
        text-align: right;
      }

      .field-header {
        font-size: 80%;
        color: var(--color-text-dark);
      }

      .field-header.date {
        text-align: right;
      }

      .more {
        font-size: 90%;
        padding-top: 5px;
        padding-right: 3px;
        text-align: right;
        width: 100px;
        vertical-align: top;
      }

      table {
        width: 100%;
      }

      .contact td {
        border-bottom: 1px solid var(--color-borders);
        padding: 5px 3px;
      }

      .table-footer td {
        padding: 10px 3px;
      }

      .query-replaced,
      .count-replaced {
        display: inline-block;
        background: var(--color-primary-light);
        color: var(--color-text-dark);
        padding: 3px 6px;
        border-radius: var(--curvature);
        font-size: 85%;
        margin: 0px 3px;
      }

      temba-loading {
        transform: scale(0);
        max-width: 0;
        opacity: 0;
        transition: transform 200ms ease-in-out;
      }

      .fetching temba-loading {
        transform: scale(1);
        max-width: 500px;
        opacity: 1;
        display: block;
      }

      .error {
        margin-top: 10px;
      }

      .match-count {
        padding: 4px;
        margin-top: 6px;
      }

      .linked {
        color: var(--color-link-primary);
        text-decoration: none;
        cursor: pointer;
      }

      .header td {
        border-bottom: 0px solid var(--color-borders);
        padding: 5px 3px;
      }

      .expanded .header td {
        border-bottom: 2px solid var(--color-borders);
      }

      td.field-header,
      tr.table-footer,
      tr.contact {
        display: none;
      }

      .expanded td.field-header {
        display: table-cell;
      }

      .expanded tr.contact,
      .expanded tr.table-footer {
        display: table-row;
      }

      .query {
        display: var(--contact-search-query-display);
        margin-bottom: 10px;
      }

      .results {
        display: none;
      }

      .summary {
        min-height: 2.2em;
      }

      .results.initialized {
        display: flex;
        align-items: center;
        margin-top: 0.5em;
        margin-left: 0.6em;
      }
    `;
  }

  // private cancelToken: CancelTokenSource;

  @property({ type: Boolean })
  fetching: boolean;

  @property({ type: Boolean })
  expanded: boolean;

  @property({ type: String })
  endpoint: string;

  @property({ type: String })
  placeholder = '';

  @property({ type: String })
  name = '';

  @property({ type: String })
  query = '';

  @property({ type: Number })
  inactiveThreshold = 1000;

  @property({ type: Number })
  inactiveDays = 90;

  @property({ type: Object, attribute: false })
  summary: SummaryResponse;

  @property({ type: Object, attribute: false })
  flow: any;

  private lastQuery: number;
  private initialized = false;

  private exclusions = {};

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('query') || changedProperties.has('endpoint')) {
      this.fetching = !!this.query && !!this.endpoint;

      if (this.fetching) {
        this.initialized = true;
        // clear our summary on any change
        this.summary = null;
        if (this.lastQuery) {
          window.clearTimeout(this.lastQuery);
        }

        if (this.query.trim().length > 0) {
          this.lastQuery = window.setTimeout(() => {
            this.fetchSummary(this.query);
          }, QUEIT_MILLIS);
        }
      }
    }
  }

  public fetchSummary(query: string): any {
    if (this.endpoint) {
      postJSON(this.endpoint, {
        include: { query },
        exclude: this.exclusions,
      }).then((response: WebResponse) => {
        this.fetching = false;
        if (response.status === 200) {
          this.summary = response.json as SummaryResponse;

          if (this.summary.error) {
            this.errors = [this.summary.error];
          } else {
            this.errors = [];
          }
          this.requestUpdate('errors');
          this.fireCustomEvent(CustomEventType.ContentChanged, this.summary);
        } else {
          this.summary = response.json as SummaryResponse;
          if (this.summary.error) {
            this.errors = [this.summary.error];
          }
          this.requestUpdate('errors');
          this.fireCustomEvent(CustomEventType.ContentChanged, this.summary);
        }
      });
    }
  }

  private handleQueryChange(evt: KeyboardEvent) {
    const input = evt.target as TextInput;
    this.query = input.inputElement.value;
  }

  private handleSlotChanged(evt: any) {
    if (evt.target.tagName === 'TEMBA-CHECKBOX') {
      const checkbox = evt.target as Checkbox;
      let value = checkbox.checked as any;

      if (!value) {
        delete this.exclusions[checkbox.name];
      } else {
        if (checkbox.name === 'not_seen_since_days') {
          value = 90;
        }

        this.exclusions[checkbox.name] = value;
      }
    }

    this.requestUpdate('query');
  }

  public render(): TemplateResult {
    let summary: TemplateResult;
    if (this.summary) {
      const fields = Object.keys(this.summary.fields || []).map(
        (uuid: string) => {
          return { uuid, ...this.summary.fields[uuid] };
        }
      );

      if (!this.summary.error) {
        const count = this.summary.total;
        const lastSeenOn = this.summary.query.indexOf('last_seen_on') > -1;

        summary = html`
          <table cellspacing="0" cellpadding="0">
            <tr class="header">
              <td colspan="2">
                Found
                <a
                  class="linked"
                  target="_"
                  href="/contact/?search=${encodeURIComponent(
                    this.summary.query
                  )}"
                >
                  ${count.toLocaleString()}
                </a>
                contact${count !== 1 ? 's' : ''}
              </td>
              ${fields.map(
                field => html` <td class="field-header">${field.label}</td> `
              )}
              <td></td>
              <td class="field-header date">
                ${lastSeenOn ? 'Last Seen' : 'Created'}
              </td>
            </tr>

            ${this.summary.sample.map(
              (contact: Contact) => html`
                <tr class="contact">
                  <td class="urn">${(contact as any).primary_urn_formatted}</td>
                  <td class="name">${contact.name}</td>
                  ${fields.map(
                    field => html`
                      <td class="field">
                        ${((contact as any).fields[field.uuid] || { text: '' })
                          .text}
                      </td>
                    `
                  )}
                  <td></td>
                  <td class="date">
                    ${lastSeenOn
                      ? contact.last_seen_on || '--'
                      : contact.created_on}
                  </td>
                </tr>
              `
            )}
            ${this.summary.total > this.summary.sample.length
              ? html`<tr class="table-footer">
                  <td class="query-details" colspan=${fields.length + 3}></td>
                  <td class="more">
                    <a
                      class="linked"
                      target="_"
                      href="/contact/?search=${encodeURIComponent(
                        this.summary.query
                      )}"
                      >more</a
                    >
                  </td>
                </tr>`
              : null}
          </table>
        `;
      }
    }

    return html`
      <div class="query">
        <temba-textinput
          .label=${this.label}
          .helpText=${this.helpText}
          .widgetOnly=${this.widgetOnly}
          .errors=${this.errors}
          name=${this.name}
          .inputRoot=${this}
          @input=${this.handleQueryChange}
          placeholder=${this.placeholder}
          .value=${this.query}
          textarea
          autogrow
        >
        </temba-textinput>
      </div>

      <slot @change=${this.handleSlotChanged}></slot>

      <div
        class="results ${getClasses({
          fetching: this.fetching,
          initialized: this.initialized || this.fetching,
        })}"
      >
        <temba-loading units="6" size="8"></temba-loading>
        <div class="summary ${this.expanded ? 'expanded' : ''}">${summary}</div>
      </div>
    `;
  }
}
