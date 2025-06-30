import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import {
  CustomEventType,
  ScheduledEvent,
  ScheduledEventType
} from '../interfaces';
import { EndpointMonitorElement } from '../store/EndpointMonitorElement';
import { Icon } from '../vectoricon';

const ICONS = {
  [ScheduledEventType.CampaignEvent]: Icon.campaign,
  [ScheduledEventType.ScheduledBroadcast]: Icon.message,
  [ScheduledEventType.ScheduledTrigger]: Icon.trigger
};

export class ContactPending extends EndpointMonitorElement {
  @property({ type: String })
  contact: string;

  @property({ type: Object, attribute: false })
  data: ScheduledEvent[];

  @property({ type: String })
  lang_weekly = 'Weekly';

  @property({ type: String })
  lang_daily = 'Daily';

  @property({ type: String })
  lang_once = 'Once';

  REPEAT_PERIOD = {
    O: this.lang_once,
    D: this.lang_daily,
    W: this.lang_weekly
  };

  static get styles() {
    return css`
      :host {
      }

      a,
      .linked {
        color: var(--color-link-primary);
        cursor: pointer;
      }

      a:hover,
      .linked:hover {
        text-decoration: underline;
        color: var(--color-link-primary-hover);
      }

      .type {
        background: rgba(0, 0, 0, 0.02);
        padding: 1em;
        display: flex;
        align-self: stretch;
        --icon-color: rgba(50, 50, 50, 0.25);
        border-top-left-radius: var(--curvature);
        border-bottom-left-radius: var(--curvature);
      }

      .details {
        display: flex;
        flex-direction: column;
        padding: 0.5em 1em;
        flex-grow: 1;
      }

      .campaign {
        display: flex;
        color: var(--text-color);
        --icon-color: var(--text-color);
        align-self: center;
        white-space: nowrap;
      }

      .message {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        padding: 0.1em;
      }

      .event {
        margin-bottom: 0.5em;
        border-radius: var(--curvature);
        display: flex;
        flex-direction: row;
        align-items: center;
        box-shadow: 0 0 8px 1px rgba(0, 0, 0, 0.055),
          0 0 0px 1px rgba(0, 0, 0, 0.02);
      }

      .event:hover {
        cursor: pointer;
        box-shadow: 0 0 8px 1px rgba(0, 0, 0, 0.055),
          0 0 0px 2px var(--color-link-primary);
      }

      .time {
        white-space: nowrap;
        background: rgba(0, 0, 0, 0.02);
        border-top-right-radius: var(--curvature);
        border-bottom-right-radius: var(--curvature);
        display: flex;
        align-self: stretch;
        padding: 0 1em;
        min-width: 5em;
      }

      .duration {
        align-self: center;
        flex-grow: 1;
        text-align: center;
      }

      .flow {
        display: inline-block;
      }

      temba-tip {
        cursor: default;
      }

      .scheduled-by {
        font-size: 0.85em;
        display: flex;
        color: var(--text-color);
        --icon-color: var(--text-color);
      }

      .scheduled-by temba-icon {
        margin-right: 0.25em;
      }

      .scheduled-by .name {
        flex-grow: 1;
      }
    `;
  }

  constructor() {
    super();
    this.handleEventClicked = this.handleEventClicked.bind(this);
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('contact')) {
      if (this.contact) {
        this.url = `/contact/scheduled/${this.contact}/`;
      } else {
        this.url = null;
      }
    }

    if (changes.has('data')) {
      this.fireCustomEvent(CustomEventType.DetailsChanged, {
        count: this.data.length
      });
    }
  }

  public handleEventClicked(event: ScheduledEvent) {
    this.fireCustomEvent(CustomEventType.Selection, event);
  }

  public renderEvent(scheduledEvent: ScheduledEvent) {
    return html`
      <div
        class="event ${scheduledEvent.type}"
        @click="${() => this.handleEventClicked(scheduledEvent)}"
      >
        <div class="type">
          <temba-icon
            size="2"
            name="${scheduledEvent.message ? Icon.message : Icon.flow}"
          ></temba-icon>
        </div>

        <div class="details">
          <div>
            ${scheduledEvent.flow
              ? html` Start ${scheduledEvent.flow.name}`
              : null}
            ${scheduledEvent.message
              ? html` <div class="message">${scheduledEvent.message}</div> `
              : null}
          </div>

          <div class="scheduled-by">
            ${scheduledEvent.campaign
              ? html`<div style="display:flex">
                  <temba-icon name="${Icon.campaign}"></temba-icon>
                  <div class="name">${scheduledEvent.campaign.name}</div>
                </div>`
              : html`
                  ${scheduledEvent.type === ScheduledEventType.ScheduledTrigger
                    ? html`<temba-icon
                        name="${ICONS[scheduledEvent.type]}"
                      ></temba-icon>`
                    : null}
                  <div class="name">
                    ${this.REPEAT_PERIOD[scheduledEvent.repeat_period]}
                  </div>
                `}
          </div>
        </div>

        <div class="time">
          <div class="duration">
            <temba-tip
              text=${this.store.formatDate(scheduledEvent.scheduled)}
              position="left"
            >
              ${this.store.getShortDurationFromIso(scheduledEvent.scheduled)}
            </temba-tip>
          </div>
        </div>
      </div>
    `;
  }

  public render(): TemplateResult {
    if (this.data) {
      if (this.data.length > 0) {
        return html`
          ${this.data.map((event) => {
            return this.renderEvent(event);
          })}
        `;
      } else {
        return html`<slot name="empty"></slot>`;
      }
    }
  }
}
