import { css, html, TemplateResult } from 'lit';
import { TembaList } from './TembaList';
import { Options } from '../options/Options';
import { Icon } from '../vectoricon';

interface Notification {
  created_on: string;
  type: string;
  target_url: string;
  is_seen: boolean;
  export?: {
    type: string;
  };
  import?: {
    type: string;
    num_records: number;
  };
  incident?: {
    type: string;
    started_on: string;
    ended_on?: string;
  };
}

export class NotificationList extends TembaList {
  reverseRefresh = false;
  internalFocusDisabled = true;
  static get styles() {
    return css`
      :host {
        --option-hover-bg: #f9f9f9;
      }

      .header {
        padding: 0.25em 1em;
        background: #f9f9f9;
        border-top-left-radius: var(--curvature);
        border-top-right-radius: var(--curvature);
        display: flex;
        color: #999;
        border-bottom: 1px solid #f3f3f3;
      }

      .header temba-icon {
        margin-right: 0.35em;
      }

      .footer {
        background: #f9f9f9;
      }

      .title {
        font-weight: normal;
      }
    `;
  }

  constructor() {
    super();
    this.valueKey = 'target_url';
    this.renderOption = (notification: Notification): TemplateResult => {
      let icon = null;
      let body = null;
      const color = '#333';

      if (notification.type === 'incident:started') {
        if (notification.incident.type === 'org:flagged') {
          icon = Icon.incidents;
          body =
            'Your workspace was flagged, please contact support for assistance.';
        } else if (notification.incident.type === 'org:suspended') {
          icon = Icon.incidents;
          body =
            'Your workspace was suspended, please contact support for assistance.';
        } else if (notification.incident.type === 'channel:disconnected') {
          icon = Icon.channel;
          body = 'Your android channel is not connected';
        } else if (notification.incident.type === 'channel:templates_failed') {
          icon = Icon.channel;
          body = 'Your WhatsApp channel templates failed syncing';
        } else if (notification.incident.type === 'webhooks:unhealthy') {
          icon = Icon.webhook;
          body = 'Your webhook calls are not working properly.';
        }
      } else if (notification.type === 'import:finished') {
        if (notification.import.type === 'contact') {
          icon = Icon.contact_import;
          body = `Imported ${notification.import.num_records.toLocaleString()} contacts`;
        }
      } else if (notification.type === 'export:finished') {
        if (notification.export.type === 'contact') {
          icon = Icon.contact_export;
          body = 'Exported contacts';
        } else if (notification.export.type === 'message') {
          icon = Icon.message_export;
          body = 'Exported messages';
        } else if (notification.export.type === 'results') {
          icon = Icon.results_export;
          body = 'Exported flow results';
        } else if (notification.export.type === 'ticket') {
          icon = Icon.tickets_export;
          body = 'Exported tickets';
        }
      } else if (notification.type === 'tickets:activity') {
        icon = Icon.tickets;
        body = 'New ticket activity';
      } else if (notification.type === 'tickets:opened') {
        icon = Icon.tickets;
        body = 'New unassigned ticket';
      }
      return html`<div
        style="color:${color};display:flex;align-items:flex-start;flex-direction:row;font-weight:${notification.is_seen
          ? 400
          : 500}"
      >
        ${icon
          ? html`<div style="margin-right:0.6em">
              <temba-icon name="${icon}"></temba-icon>
            </div>`
          : null}
        <div style="display:flex;flex-direction:column">
          <div style="line-height:1.1em">${body}</div>
          <temba-date
            style="font-size:80%"
            value=${notification.created_on}
            display="duration"
          ></temba-date>
        </div>
      </div>`;
    };
  }

  public renderHeader(): TemplateResult {
    return html`<div class="header">
      <temba-icon name="notification"></temba-icon>
      <div class="title">Notifications</div>
    </div>`;
  }

  protected handleSelection(event: CustomEvent) {
    super.handleSelected(event);
  }

  public scrollToTop(): void {
    // scroll back to the top
    window.setTimeout(() => {
      const options = this.shadowRoot.querySelector('temba-options') as Options;
      options.scrollToTop();
    }, 1000);
  }
}
