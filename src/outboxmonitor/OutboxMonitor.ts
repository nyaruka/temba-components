import { css, html, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { ResizeElement } from '../ResizeElement';
import { fetchResults } from '../utils';

const MIN_BACKLOG = 500000;
export class OutboxMonitor extends ResizeElement {
  @property({ type: Number })
  backlogSize = 0;

  @property({ type: String })
  endpoint = '/msg/menu/';

  folders: { [id: string]: { start: number; current: number } } = {};

  @property({ type: Object })
  firstFetch: Date;

  @property({ type: Object })
  lastFetch: Date;

  @property({ type: Number })
  fetches = 0;

  @property({ type: Number })
  msgsPerSecond = 0;

  @property({ type: Object })
  estimatedCompletionDate: Date;

  public static get styles() {
    return css`
      .monitor {
        margin: 1rem;
        margin-bottom: -0.5rem;
      }

      .header {
        font-weight: bold;
      }

      .estimate {
        font-size: 0.9em;
      }
    `;
  }

  private fetchFolders() {
    fetchResults(this.endpoint).then((items) => {
      items
        .filter(
          (item) =>
            item.id === 'outbox' || item.id === 'sent' || item.id === 'failed'
        )
        .forEach((item) => {
          if (this.folders[item.id]) {
            this.folders[item.id].current = item.count;
          } else {
            this.folders[item.id] = {
              start: item.count,
              current: item.count
            };
          }
        });

      if (this.firstFetch) {
        this.lastFetch = new Date();
      } else {
        this.firstFetch = new Date();
      }
      this.fetches++;

      console.log(this.folders);

      this.scheduleRefresh(Math.min(this.fetches * 5000, 60000));

      const outbox = this.folders['outbox'];

      this.backlogSize = outbox.current;
      if (outbox.current > 1) {
        this.estimateCompletion();
      }
    });
  }

  private estimateCompletion() {
    if (this.lastFetch) {
      const time =
        (this.lastFetch.getTime() - this.firstFetch.getTime()) / 1000;
      const sent = this.folders['sent'];
      const failed = this.folders['failed'];

      const totalCompleted = sent.current + failed.current;
      const startCount = sent.start + failed.start;

      const sentInWindow = totalCompleted - startCount;
      this.msgsPerSecond = sentInWindow / time;

      const remaining = this.folders['outbox'].current;
      console.log(remaining, this.msgsPerSecond);
      const secondsRemaining = remaining / this.msgsPerSecond;

      this.estimatedCompletionDate = new Date(
        new Date().getTime() + secondsRemaining * 1000
      );
    }
  }

  private scheduleRefresh(time: number) {
    setTimeout(() => {
      this.fetchFolders();
    }, time);
  }

  protected firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (changes.has('endpoint') && this.endpoint) {
      this.fetchFolders();
    }
  }

  public hasBacklog() {
    return this.backlogSize > MIN_BACKLOG;
  }

  public render() {
    const roundedRate = Math.round(this.msgsPerSecond);
    if (this.hasBacklog() && this.estimatedCompletionDate && !this.isMobile()) {
      return html`<div class="monitor">
        <temba-alert
          ><div class="header">Outbox Notice</div>
          <div class="estimate">
            If your outbox becomes too full, you won't be able to send new flows
            or broadcasts. Your channels are currently sending at
            ${roundedRate.toLocaleString()}
            message${roundedRate == 1 ? '' : 's'} per second. At that rate, your
            outbox should be clear
            <temba-date
              value="${this.estimatedCompletionDate.toISOString()}"
              display="duration"
            ></temba-date
            >.
          </div></temba-alert
        >
      </div>`;
    } else {
      return null;
    }
  }
}
