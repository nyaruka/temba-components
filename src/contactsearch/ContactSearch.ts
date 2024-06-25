import { TemplateResult, html, css } from 'lit';
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js';
import { property } from 'lit/decorators.js';
import { getClasses, postJSON, stopEvent, WebResponse } from '../utils';
import { TextInput } from '../textinput/TextInput';
import '../alert/Alert';
import { Contact, CustomEventType } from '../interfaces';
import { FormElement } from '../FormElement';
import { Checkbox } from '../checkbox/Checkbox';
import { msg } from '@lit/localize';
import { OmniOption } from '../omnibox/Omnibox';
import { Select } from '../select/Select';

const QUEIT_MILLIS = 2000;

interface SummaryResponse {
  total: number;
  sample: Contact[];
  query: string;
  fields: { [uuid: string]: { label: string; type: string } };
  error?: string;
  warnings: string[];
  blockers: string[];
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
        display: flex;
        flex-grow: 1;
        align-items: center;
      }

      .summary .result-count {
        flex-grow: 1;
      }

      .results.empty {
        display: none !important;
      }

      .results.initialized {
        display: flex;
        align-items: center;
        margin-top: 0.5em;
        margin-left: 0.6em;
      }

      .advanced-icon {
        cursor: pointer;
        margin-right: 0.5em;
      }

      .query .advanced-icon {
        margin-top: 1em;
        margin-right: 1em;
      }

      .advanced-icon:hover {
        --icon-color: var(--color-link-primary-hover) !important;
      }

      .query {
        --textarea-height: 5em;
      }

      #recipients {
        margin-bottom: 1em;
        display: block;
      }

      temba-alert {
        margin: 1em 0;
      }

      temba-select[name='not_seen_since_days'] {
        margin-bottom: 1em;
        display: block;
      }
    `;
  }

  @property({ type: Boolean })
  in_a_flow: boolean;

  @property({ type: Boolean })
  started_previously: boolean;

  @property({ type: Boolean })
  not_seen_since_days: boolean;

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

  @property({ type: Array })
  recipients: OmniOption[] = [];

  @property({ type: Boolean })
  advanced = false;

  @property({ type: String })
  refreshKey = '0';

  public refresh(): void {
    this.refreshKey = 'requested_' + new Date().getTime();
  }

  @property({ type: Object })
  private exclusions = {};

  private lastQuery: number;
  private initialized = false;

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('advanced') && this.advanced) {
      return;
    }

    // if we remove the in_a_flow option, make sure it's not part of our exclusions
    if (changedProperties.has('in_a_flow') && !this.in_a_flow) {
      delete this.exclusions['in_a_flow'];
      this.requestUpdate('exclusions');
    }

    if (
      (changedProperties.has('query') && this.advanced) ||
      (changedProperties.has('refreshKey') && this.refreshKey !== '0')
    ) {
      this.summary = null;
      // this.errors = [];
      this.fireCustomEvent(CustomEventType.ContentChanged, { reset: true });
      if (this.lastQuery) {
        window.clearTimeout(this.lastQuery);
        this.fetching = false;
      }

      if (this.query.trim().length > 0 || this.recipients.length > 0) {
        this.fetching = true;
        this.lastQuery = window.setTimeout(() => {
          this.fetchSummary();
        }, QUEIT_MILLIS);
      }
    }
  }

  public fetchSummary(): any {
    if (this.endpoint) {
      const group_uuids = this.recipients
        .filter((value: OmniOption) => value.type === 'group')
        .map((value: OmniOption) => value.id);

      const contact_uuids = this.recipients
        .filter((value: OmniOption) => value.type === 'contact')
        .map((value: OmniOption) => value.id);

      postJSON(this.endpoint, {
        include: this.advanced
          ? { query: this.query }
          : { contact_uuids, group_uuids },

        exclude: this.exclusions
      }).then((response: WebResponse) => {
        this.fetching = false;
        if (response.status === 200) {
          this.summary = response.json as SummaryResponse;
          if (!this.advanced) {
            this.query = this.summary.query;
          }
          this.setValue({
            advanced: this.advanced,
            query: this.query,
            exclusions: this.exclusions,
            recipients: this.recipients
          });

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

  private handleAdvancedToggle(evt: MouseEvent) {
    stopEvent(evt);
    this.recipients = [];
    this.exclusions = {};
    if (this.advanced) {
      this.query = '';
      this.value = null;
    }
    this.advanced = !this.advanced;

    this.setValue({
      advanced: this.advanced,
      query: this.query,
      exclusions: this.exclusions,
      recipients: this.recipients
    });
  }

  private handleQueryChange(evt: KeyboardEvent) {
    const input = evt.target as TextInput;
    this.query = input.inputElement.value;
  }

  private handleRecipientsChanged() {
    if (this.refreshKey !== '0' || this.initialized) {
      this.refresh();
    } else {
      this.initialized = true;
    }
  }

  private handleActivityLevelChanged(evt: any) {
    const select = evt.target as Select;
    if (select.value && select.value !== 'all') {
      this.exclusions['not_seen_since_days'] = parseInt(select.value);
    } else {
      delete this.exclusions['not_seen_since_days'];
    }
    this.refresh();
  }

  private handleExclusionChanged(evt: any) {
    if (evt.target.tagName === 'TEMBA-CHECKBOX') {
      const ex = JSON.stringify(this.exclusions);
      const checkbox = evt.target as Checkbox;
      const value = checkbox.checked as any;

      if (!value) {
        delete this.exclusions[checkbox.name];
      } else {
        this.exclusions[checkbox.name] = value;
      }

      if (ex !== JSON.stringify(this.exclusions)) {
        this.refresh();
      }
    }
  }

  public render(): TemplateResult {
    let summary: TemplateResult;
    if (this.summary) {
      if (!this.summary.error) {
        const count = this.summary.total || 0;

        summary = html`
          <div class="result-count">
            Found
            <a
              class="linked"
              target="_"
              href="/contact/?search=${encodeURIComponent(this.summary.query)}"
            >
              ${count.toLocaleString()}
            </a>
            contact${count !== 1 ? 's' : ''}
          </div>
          <temba-button
            class="edit"
            name="edit"
            secondary
            small
            @click=${this.handleAdvancedToggle}
          >
            <div slot="name">
              <div style="display: flex; align-items: center;">
                ${this.advanced
                  ? html` <temba-icon
                        name="reset"
                        style="margin-right:0.5em"
                      ></temba-icon>
                      Start Over`
                  : html` <temba-icon
                        name="edit"
                        style="margin-right:0.5em"
                      ></temba-icon>
                      Edit Query`}
              </div>
            </div>
          </temba-button>
        `;
      }
    }

    if (
      this.summary &&
      this.summary.blockers &&
      this.summary.blockers.length > 0
    ) {
      return html`${this.summary.blockers.map(
        (error) =>
          html`<temba-alert level="error">${unsafeHTML(error)}</temba-alert>`
      )}`;
    }

    return html`
      ${this.advanced
        ? html`<div class="query">
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
          </div>`
        : html`<temba-omnibox
              placeholder="Search for contacts or groups"
              widget_only=""
              groups=""
              contacts=""
              label="Recipients"
              help_text="The contacts to send the message to."
              .errors=${this.errors}
              id="recipients"
              name="recipients"
              .value=${this.recipients}
              endpoint="/contact/omnibox/?"
              @change=${this.handleRecipientsChanged}
            >
            </temba-omnibox>

            ${this.not_seen_since_days
              ? html`<temba-select
                  name="not_seen_since_days"
                  class="activity-select"
                  help_text="${msg(
                    'Only include contacts who have sent a message in the last 90 days.'
                  )}"
                  widget_only
                  @change=${this.handleActivityLevelChanged}
                >
                  <temba-option
                    name="Active in the last 30 days"
                    value="30"
                    icon="filter"
                    ?checked=${this.exclusions['not_seen_since_days'] === 30}
                  ></temba-option>
                  <temba-option
                    name="Active in the last 90 days"
                    value="90"
                    icon="filter"
                    ?checked=${this.exclusions['not_seen_since_days'] === 90}
                  ></temba-option>
                  <temba-option
                    name="Active in the last year"
                    value="365"
                    icon="filter"
                    ?checked=${this.exclusions['not_seen_since_days'] === 365}
                  ></temba-option>
                  <temba-option
                    name="Don't filter by activity"
                    value="all"
                  ></temba-option>
                </temba-select>`
              : null}
            ${this.in_a_flow
              ? html`<temba-checkbox
                  name="in_a_flow"
                  label="${msg('Skip contacts currently in a flow')}"
                  help_text="${msg(
                    'Avoid interrupting a contact who is already in a flow.'
                  )}"
                  ?checked=${this.exclusions['in_a_flow']}
                  @change=${this.handleExclusionChanged}
                ></temba-checkbox>`
              : null}
            ${this.started_previously
              ? html`<temba-checkbox
                  name="started_previously"
                  label="${msg('Skip repeat contacts')}"
                  help_text="${msg(
                    'Avoid restarting a contact who has been in this flow in the last 90 days.'
                  )}"
                  ?checked=${this.exclusions['started_previously']}
                  @change=${this.handleExclusionChanged}
                ></temba-checkbox>`
              : null}`}

      <div
        class="results ${getClasses({
          fetching: this.fetching,
          initialized: this.initialized || this.fetching,
          empty:
            ((this.summary && this.summary.error) || !this.summary) &&
            !this.fetching
        })}"
      >
        <temba-loading units="6" size="8"></temba-loading>
        <div class="summary ${this.expanded ? 'expanded' : ''}">${summary}</div>
      </div>

      ${this.summary && this.summary.warnings
        ? this.summary.warnings.map(
            (warning) =>
              html`<temba-alert level="warning"
                >${unsafeHTML(warning)}</temba-alert
              >`
          )
        : ``}
    `;
  }
}
