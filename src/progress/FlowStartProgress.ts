import { html, PropertyValueMap, TemplateResult } from 'lit';
import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';
import { fetchResults } from '../utils';

export class FlowStartProgress extends RapidElement {
  @property({ type: String })
  uuid: string;

  @property({ type: Number })
  started: number;

  @property({ type: Number })
  total: number;

  @property({ type: Number })
  refreshes: number = 0;

  public updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('uuid')) {
      this.refresh();
    }
  }

  public refresh(): void {
    fetchResults(`/api/v2/flow_starts.json?uuid=${this.uuid}`).then(
      (data: any) => {
        if (data.length > 0) {
          this.refreshes++;
          const start = data[0];
          this.started = start.progress.started;
          this.total = start.progress.total;
          if (this.started < this.total) {
            // refresh with a backoff up to 1 minute
            setTimeout(() => {
              this.refresh();
            }, Math.min(1000 * this.refreshes, 60000));
          }
        }
      }
    );
  }

  public render(): TemplateResult {
    return html`<temba-progress
      total=${this.total}
      current=${this.started}
    ></temba-progress>`;
  }
}
