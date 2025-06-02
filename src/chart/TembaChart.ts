import { RapidElement } from '../RapidElement';
import { property, state } from 'lit/decorators.js';
import { css, html, PropertyValueMap, TemplateResult } from 'lit';

import { Select, SelectOption } from '../select/Select';
import { getClasses } from '../utils';
import { getStore } from '../store/Store';

import Chart, { ChartType } from 'chart.js/auto';
import 'chartjs-adapter-luxon';

const colors = [
  'rgba(54, 162, 235, 0.2)',
  'rgba(255, 159, 64, 0.2)',
  'rgba(75, 192, 192, 0.2)',
  'rgba(153, 102, 255, 0.2)',
  'rgba(255, 205, 86, 0.2)',
  'rgba(255, 99, 132, 0.2)'
];

const colorsBorder = [
  'rgb(54, 162, 235)',
  'rgb(255, 159, 64)',
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
  'rgb(255, 205, 86)',
  'rgb(255, 99, 132)'
];

const otherBackgroundColor = 'rgba(201, 203, 207, 0.2)';
const otherBorderColor = 'rgb(201, 203, 207)';

export interface RapidChartData {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

export class TembaChart extends RapidElement {
  @property({ type: String })
  chartType: ChartType = 'bar';

  @property({ type: String })
  url: string;

  @property({ type: String })
  header: string = '';

  @property({ type: Boolean })
  other: boolean = false;

  @property({ type: Object })
  data: RapidChartData;

  @state()
  datasets: { label: string; data: number[] }[] = [];

  @property({ type: Number })
  maxSplits: number = 2;

  @state()
  splits: string[] = [];

  @property({ type: String })
  dataname = 'Counts';

  @property({ type: Boolean })
  single: boolean = false;

  @property({ type: Boolean })
  legend: boolean = false;

  @property({ type: Boolean })
  config: boolean = false;

  @property({ type: Number })
  colorIndex: number = 0;

  @state()
  showConfig: boolean = false;

  chart: Chart;
  shadowRootDiv: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  static get styles() {
    return css`
      .chart-title {
        font-size: 1.2em;
        font-weight: 600;
        text-align: center;
      }

      temba-select {
        display: block;
      }

      .config-toggle {
        margin-top: -2.5em;
        margin-right: -0.5em;
        color: #bbb;
        display: none;
      }

      .config-toggle:hover {
        color: #666;
      }

      .config-toggle.show {
        color: #666;
        display: block;
      }

      .config {
        max-height: 0px;
        margin: 2em 0.5em;
        padding: 0em 1em;
        border-radius: var(--curvature);
        border: 1px solid transparent;
        background: transparent;
        overflow: hidden;
        transition: all 0.2s ease-in-out;
      }

      .config.show {
        padding: 1em;
        max-height: 50px;
        background: rgba(0, 0, 0, 0.02);
        border: 1px solid rgba(0, 0, 0, 0.09);
      }
    `;
  }

  constructor() {
    super();
  }

  protected firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
    const wrapper = this.shadowRoot.querySelector('#canvas-wrapper');
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('height', '300px');
    wrapper.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('data') || changes.has('splits')) {
      this.calculateSplits();
    }

    if (changes.has('datasets')) {
      this.updateChart();
    }

    if (changes.has('url')) {
      const store = getStore();
      store.getUrl(this.url).then((response) => {
        this.data = response.json.data;
      });
    }
  }

  private calculateSplits() {
    if (this.data) {
      const datasets = [];
      // keep a running list of values that is the sum at each index
      const sums = [];
      for (const dataset of this.data.datasets) {
        if (this.splits.find((s) => s === dataset.label) === undefined) {
          // update our sums
          for (let i = 0; i < dataset.data.length; i++) {
            if (sums[i] === undefined) {
              sums[i] = dataset.data[i];
            } else {
              sums[i] += dataset.data[i];
            }
          }
        } else {
          datasets.push({
            ...dataset,
            backgroundColor:
              colors[datasets.length + (this.colorIndex % colors.length)],
            borderColor:
              colorsBorder[
                datasets.length + (this.colorIndex % colorsBorder.length)
              ],
            borderWidth: 1
          });
        }
      }

      if (datasets.length === 0) {
        datasets.push({
          label: this.single ? this.dataname : `All ${this.dataname}`,
          data: sums,
          backgroundColor: colors[this.colorIndex % colors.length],
          borderColor: colorsBorder[this.colorIndex % colorsBorder.length],
          borderWidth: 1
        });
      } else {
        datasets.push({
          label: 'Other',
          data: sums,
          backgroundColor: otherBackgroundColor,
          borderColor: otherBorderColor,
          borderWidth: 1
        });
      }
      this.datasets = datasets;
    }
  }

  public updateChart(): void {
    if (this.datasets?.length > 0) {
      if (this.chart) {
        this.chart.data.labels = this.data.labels;
        this.chart.data.datasets = this.datasets;
        this.chart.update();
      } else {
        const chartData = {
          type: this.chartType,
          data: {
            labels: this.data.labels,
            datasets: this.datasets
          },
          options: {
            plugins: {
              legend: {
                display: this.legend
              }
            },
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              x: { from: 500 },
              y: { from: 500 }
            },
            animations: {
              tension: {
                duration: 1000,
                easing: 'linear',
                from: 1,
                to: 0,
                loop: true
              }
            },
            scales: {
              y: {
                min: 0,
                stacked: true
              },
              x: {
                type: 'time',
                time: {
                  unit: 'day',
                  tooltipFormat: 'DDD', // Luxon for 'Feb 16, 2025'
                  displayFormats: {
                    day: 'MMM dd'
                  }
                },
                grid: {
                  display: false
                },
                stacked: true
              }
            }
          }
        };
        this.chart = new Chart(this.ctx, chartData as any);
      }
    }
  }

  private handleSplitsChanged(e: Event) {
    const select = e.target as Select<SelectOption>;
    this.splits = select.values.map((option) => {
      return option.value;
    });
  }

  private handleToggleConfig() {
    this.showConfig = !this.showConfig;
    if (!this.showConfig) {
      this.splits = [];
    }
  }

  protected render(): TemplateResult {
    return html`<div>
      ${this.header
        ? html`<div class="chart-title">${this.header}</div>`
        : null}
      <div id="canvas-wrapper"></div>
      ${this.config && this.data
        ? html`
            <div
              class="${getClasses({
                'config-toggle': true,
                show: this.showConfig && this.data?.datasets?.length > 1
              })}"
              style="display: flex; flex-direction: row; align-items: center; justify-content: space-between;"
            >
              <div></div>
              <div>
                <temba-icon
                  animateChange="spin"
                  name="${this.showConfig ? 'close' : 'settings'}"
                  clickable
                  size="1.5"
                  @click=${this.handleToggleConfig}
                ></temba-icon>
              </div>
            </div>
          `
        : null}

      <div class=${getClasses({ config: true, show: this.showConfig })}>
        <temba-select
          multi
          placeholder="Select ${this.dataname}"
          options=${JSON.stringify(
            this.data?.datasets.map((dataset) => ({
              name: dataset.label,
              value: dataset.label
            }))
          )}
          .values=${this.splits.map((s) => ({ name: s, value: s }))}
          @change=${this.handleSplitsChanged}
        >
        </temba-select>
        <div></div>
      </div>
    </div>`;
  }
}
