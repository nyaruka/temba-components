import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators';
import { ScheduledEvent, ScheduledEventType } from '../interfaces';
import { StoreElement } from '../store/StoreElement';

const ICONS = {
  [ScheduledEventType.CampaignEvent]: 'campaign',
  [ScheduledEventType.ScheduledBroadcast]: 'message-square',
  [ScheduledEventType.ScheduledTrigger]: 'radio',
};

export class ContactPending extends StoreElement {
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
    W: this.lang_weekly,
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

      .campaign_event .scheduled-by:hover {
        color: var(--color-link-primary);
        --icon-color: var(--color-link-primary);
        cursor: pointer;
      }

      .scheduled-by .name {
        flex-grow: 1;
      }
    `;
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
  }

  public renderEvent(event: ScheduledEvent) {
    return html`
      <div class="event ${event.type}">
        <div class="type">
          <temba-icon
            size="2"
            name="${event.message ? 'message-square' : 'flow'}"
          ></temba-icon>
        </div>

        <div class="details">
          <div>
            ${event.flow
              ? html`
                  <div
                    class="flow linked"
                    href="/flow/editor/${event.flow.uuid}/"
                    onclick="goto(event)"
                  >
                    ${event.flow.name}
                  </div>
                `
              : null}
            ${event.message
              ? html` <div class="message">${event.message}</div> `
              : null}
          </div>

          <div class="scheduled-by">
            ${event.campaign
              ? html`<div
                  style="display:flex"
                  href="/campaign/read/${event.campaign.uuid}/"
                  onclick="goto(event, this)"
                >
                  <temba-icon name="campaign"></temba-icon>
                  <div class="name">${event.campaign.name}</div>
                </div>`
              : html`
                  ${event.type === ScheduledEventType.ScheduledTrigger
                    ? html`<temba-icon
                        name="${ICONS[event.type]}"
                      ></temba-icon>`
                    : null}
                  <div class="name">
                    ${this.REPEAT_PERIOD[event.repeat_period]}
                  </div>
                `}
          </div>
        </div>

        <div class="time">
          <div class="duration">
            <temba-tip
              text=${this.store.formatDate(event.scheduled)}
              position="left"
            >
              ${this.store.getShortDuration(event.scheduled)}
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
          ${this.data.map(event => {
            return this.renderEvent(event);
          })}
        `;
      } else {
        return html`<slot name="empty"></slot>`;
      }
    }
  }
}
