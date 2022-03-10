import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { getUrl, WebResponse } from '../utils';
import { TextInput } from '../textinput/TextInput';
import '../alert/Alert';
import { Contact, CustomEventType } from '../interfaces';
import { styleMap } from 'lit-html/directives/style-map';
import { FormElement } from '../FormElement';

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
        margin-top: 10px;
        margin-right: 10px;
        opacity: 0;
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

  @property({ attribute: false })
  summary: SummaryResponse;

  private lastQuery: number;

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('query')) {
      this.fetching = !!this.query;

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

  public executeQuery(query: string): any {
    const url = this.endpoint + query.replace('\n', ' ');
    getUrl(url).then((response: WebResponse) => {
      if (response.status === 200) {
        const summary = response.json as SummaryResponse;
        this.fireCustomEvent(CustomEventType.FetchComplete, summary);
      }
    });
  }

  public fetchSummary(query: string): any {
    const url = this.endpoint + query.replace('\n', ' ');
    getUrl(url).then((response: WebResponse) => {
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
      }
    });
  }

  private handleQueryChange(evt: KeyboardEvent) {
    const input = evt.target as TextInput;
    this.query = input.inputElement.value;
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
          <div class="summary ${this.expanded ? 'expanded' : ''}">
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
                    <td class="urn">
                      ${(contact as any).primary_urn_formatted}
                    </td>
                    <td class="name">${contact.name}</td>
                    ${fields.map(
                      field => html`
                        <td class="field">
                          ${(
                            (contact as any).fields[field.uuid] || { text: '' }
                          ).text}
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
          </div>
        `;
      }
    }

    const loadingStyle = this.fetching ? { opacity: '1' } : {};

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

      ${this.fetching
        ? html`<temba-loading
            units="4"
            style=${styleMap(loadingStyle)}
          ></temba-loading>`
        : this.summary
        ? html` <div class="summary">${summary}</div> `
        : null}
    `;
  }
}
