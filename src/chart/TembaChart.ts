import { RapidElement } from '../RapidElement';
import { property, state } from 'lit/decorators.js';
import { css, html, PropertyValueMap, TemplateResult } from 'lit';

import { Select, SelectOption } from '../select/Select';
import { getClasses } from '../utils';
import { getStore } from '../store/Store';

// eslint-disable-next-line import/no-named-as-default
import Chart, { ChartType } from 'chart.js/auto';
import 'chartjs-adapter-luxon';

const DEFAULT_PALETTE: keyof typeof COLOR_PALETTES = 'qualitative-set1';
const COLOR_PALETTES = {
  // Qualitative (categorical, no order)
  'qualitative-set1': [
    '#5ea3db',
    '#c186e3',
    '#66c2a5',
    '#fc8d62',
    '#a6d854',
    '#ffd92f',
    '#e5c494',
    '#b3b3b3'
  ],
  'qualitative-set2': [
    '#377eb8',
    '#984ea3',
    '#4daf4a',
    '#ff7f00',
    '#e41a1c',
    '#a65628',
    '#f781bf',
    '#ffff33'
  ],
  'qualitative-set3': [
    '#1b9e77',
    '#d95f02',
    '#7570b3',
    '#e7298a',
    '#66a61e',
    '#e6ab02',
    '#a6761d'
  ],
  'qualitative-paired': [
    '#1f78b4',
    '#a6cee3',
    '#6a3d9a',
    '#cab2d6',
    '#33a02c',
    '#b2df8a',
    '#e31a1c',
    '#fb9a99',
    '#ff7f00',
    '#fdbf6f'
  ],
  'qualitative-accent': [
    '#7fc97f',
    '#beaed4',
    '#fdc086',
    '#ffff99',
    '#386cb0',
    '#f0027f',
    '#bf5b17',
    '#666666'
  ],
  'qualitative-pastel1': [
    '#fbb4ae',
    '#b3cde3',
    '#ccebc5',
    '#decbe4',
    '#fed9a6',
    '#ffffcc',
    '#e5d8bd',
    '#fddaec'
  ],
  'qualitative-pastel2': [
    '#b3e2cd',
    '#fdcdac',
    '#cbd5e8',
    '#f4cae4',
    '#e6f5c9',
    '#fff2ae',
    '#f1e2cc'
  ],
  // Diverging (for data with midpoint like 0)
  'diverging-prgn': [
    '#40004b',
    '#762a83',
    '#9970ab',
    '#c2a5cf',
    '#e7d4e8',
    '#f7f7f7',
    '#d9f0d3',
    '#a6dba0',
    '#5aae61',
    '#1b7837',
    '#00441b'
  ],
  'diverging-spectral': [
    '#9e0142',
    '#d53e4f',
    '#f46d43',
    '#fdae61',
    '#fee08b',
    '#ffffbf',
    '#e6f598',
    '#abdda4',
    '#66c2a5',
    '#3288bd',
    '#5e4fa2'
  ],
  'diverging-piyg': [
    '#8e0152',
    '#c51b7d',
    '#de77ae',
    '#f1b6da',
    '#fde0ef',
    '#f7f7f7',
    '#e6f5d0',
    '#b8e186',
    '#7fbc41',
    '#4d9221',
    '#276419'
  ],
  'diverging-rdylgn': [
    '#a50026',
    '#d73027',
    '#f46d43',
    '#fdae61',
    '#fee08b',
    '#ffffbf',
    '#d9ef8b',
    '#a6d96a',
    '#66bd63',
    '#1a9850',
    '#006837'
  ],
  'diverging-brbg': [
    '#543005',
    '#8c510a',
    '#bf812d',
    '#dfc27d',
    '#f6e8c3',
    '#f5f5f5',
    '#c7eae5',
    '#80cdc1',
    '#35978f',
    '#01665e',
    '#003c30'
  ],

  // Sequential (for continuous or ordered data)
  'sequential-blues': [
    '#f7fbff',
    '#deebf7',
    '#c6dbef',
    '#9ecae1',
    '#6baed6',
    '#4292c6',
    '#2171b5',
    '#08519c',
    '#08306b'
  ],
  'sequential-greens': [
    '#f7fcf5',
    '#e5f5e0',
    '#c7e9c0',
    '#a1d99b',
    '#74c476',
    '#41ab5d',
    '#238b45',
    '#006d2c',
    '#00441b'
  ],
  'sequential-oranges': [
    '#fff5eb',
    '#fee6ce',
    '#fdd0a2',
    '#fdae6b',
    '#fd8d3c',
    '#f16913',
    '#d94801',
    '#a63603',
    '#7f2704'
  ],
  'sequential-purples': [
    '#fcfbfd',
    '#efedf5',
    '#dadaeb',
    '#bcbddc',
    '#9e9ac8',
    '#807dba',
    '#6a51a3',
    '#54278f',
    '#3f007d'
  ],
  'sequential-reds': [
    '#fff5f0',
    '#fee0d2',
    '#fcbba1',
    '#fc9272',
    '#fb6a4a',
    '#ef3b2c',
    '#cb181d',
    '#a50f15',
    '#67000d'
  ],
  'sequential-ylgnbu': [
    '#ffffd9',
    '#edf8b1',
    '#c7e9b4',
    '#7fcdbb',
    '#41b6c4',
    '#1d91c0',
    '#225ea8',
    '#253494',
    '#081d58'
  ]
};

const otherBackgroundColor = 'rgba(212, 212, 212, 0.5)';

/**
 * Formats a duration in seconds to a human-readable string showing the two largest units.
 * Examples: 68787 -> "19h 6m", 958000 -> "11d 2h", 3661 -> "1h 1m"
 */
export function formatDurationFromSeconds(seconds: number): string {
  if (seconds === 0) {
    return '0s';
  }

  const totalDays = Math.floor(seconds / 86400);
  const remainingAfterDays = seconds % 86400;
  const remainingHours = Math.floor(remainingAfterDays / 3600);
  const remainingAfterHours = remainingAfterDays % 3600;
  const remainingMinutes = Math.floor(remainingAfterHours / 60);
  const remainingSeconds = remainingAfterHours % 60;

  const units = [];

  if (totalDays > 0) {
    units.push(`${totalDays}d`);
  }
  if (remainingHours > 0) {
    units.push(`${remainingHours}h`);
  }
  if (remainingMinutes > 0 && units.length < 2) {
    units.push(`${remainingMinutes}m`);
  }
  if (remainingSeconds > 0 && units.length < 2) {
    units.push(`${remainingSeconds}s`);
  }

  // Return the first two most significant units
  return units.slice(0, 2).join(' ');
}

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

  @property({ type: String, attribute: 'splits' })
  splitNames: string;

  @property({ type: Boolean })
  hideOther: boolean = false;

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

  @property({ type: Boolean })
  formatDuration: boolean = false;

  @property({ type: Boolean })
  showAll: boolean = false;

  @property({ type: Number })
  colorIndex: number = 0;

  @state()
  showConfig: boolean = false;

  @property({ type: String })
  palette: keyof typeof COLOR_PALETTES;

  @property({ type: Number })
  opacity: number = 1;

  @property({ type: Number })
  seriesBorderRadius: number = 2;

  @property({ type: Number })
  seriesBorderWidth: number = 1;

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
        padding: 0em 1em;
        border-radius: var(--curvature);
        border: 1px solid transparent;
        background: transparent;
        overflow: hidden;
        transition: all 0.2s ease-in-out;
      }

      .config.show {
        padding: 2em 1em 1.5em 1em;
        max-height: 50px;
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

    if (changes.has('splitNames')) {
      this.splits = this.splitNames.split(',').map((s) => s.trim());
    }

    if (changes.has('data') || changes.has('splits')) {
      this.calculateSplits();
    }

    if (changes.has('datasets')) {
      this.updateChart();
    }

    if (changes.has('url')) {
      const store = getStore();
      store.getUrl(this.url, { skipCache: true }).then((response) => {
        this.data = response.json.data;
      });
    }

    if (changes.has('chartType')) {
      if (this.chartType === 'line') {
        this.seriesBorderWidth = Math.max(1, this.seriesBorderWidth);
      }
    }
  }

  /**
   * Returns a tuple: [backgroundColors[], borderColors[]].
   * Border colors are darkened versions of the base palette (before transparency).
   * Background colors have transparency applied.
   */
  get colors(): [string[], string[]] {
    const baseColors =
      COLOR_PALETTES[this.palette] || COLOR_PALETTES[DEFAULT_PALETTE];
    // Clamp transparency between 0 and 1
    const alpha = Math.max(0, Math.min(1, this.opacity));
    // Borders: darken base color, no transparency
    const borderColors = baseColors.map((color) =>
      this.darkenColor(color, 0.25)
    );
    // Backgrounds: apply transparency to base color
    const backgroundColors = baseColors.map((color) => {
      // If already rgba, just replace the alpha
      if (color.startsWith('rgba')) {
        return color.replace(
          /rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/,
          (_m, r, g, b) => {
            return `rgba(${r},${g},${b},${alpha})`;
          }
        );
      }
      // If already rgb, convert to rgba
      if (color.startsWith('rgb(')) {
        return color.replace(
          /rgb\(([^,]+),([^,]+),([^,]+)\)/,
          (_m, r, g, b) => {
            return `rgba(${r},${g},${b},${alpha})`;
          }
        );
      }
      // If hex, convert to rgba
      if (color.startsWith('#')) {
        let hex = color.replace('#', '');
        if (hex.length === 3) {
          hex = hex
            .split('')
            .map((c) => c + c)
            .join('');
        }
        const num = parseInt(hex, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r},${g},${b},${alpha})`;
      }
      // fallback
      return color;
    });
    return [backgroundColors, borderColors];
  }

  /**
   * Utility to darken an rgba or hex color by a given factor (0-1).
   */
  darkenColor(color: string, factor: number): string {
    // If rgba or rgb
    const rgbaMatch = color.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/
    );
    if (rgbaMatch) {
      // eslint-disable-next-line prefer-const
      let [r, g, b, a] = rgbaMatch
        .slice(1)
        .map((v, i) => (i < 3 ? parseInt(v) : parseFloat(v)));
      r = Math.max(0, Math.floor(r * (1 - factor)));
      g = Math.max(0, Math.floor(g * (1 - factor)));
      b = Math.max(0, Math.floor(b * (1 - factor)));
      if (rgbaMatch[4] !== undefined) {
        return `rgba(${r},${g},${b},${a})`;
      }
      return `rgb(${r},${g},${b})`;
    }
    // If hex
    if (color.startsWith('#')) {
      let hex = color.replace('#', '');
      if (hex.length === 3) {
        hex = hex
          .split('')
          .map((c) => c + c)
          .join('');
      }
      const num = parseInt(hex, 16);
      let r = (num >> 16) & 255;
      let g = (num >> 8) & 255;
      let b = num & 255;
      r = Math.max(0, Math.floor(r * (1 - factor)));
      g = Math.max(0, Math.floor(g * (1 - factor)));
      b = Math.max(0, Math.floor(b * (1 - factor)));
      return `rgb(${r},${g},${b})`;
    }
    // fallback
    return color;
  }

  private calculateSplits() {
    if (this.data) {
      const datasets = [];
      const sums = [];
      // Get color arrays
      const [backgroundColors, borderColors] = this.colors;
      for (const dataset of this.data.datasets) {
        if (
          !this.showAll &&
          this.splits.find((s) => s === dataset.label) === undefined
        ) {
          for (let i = 0; i < dataset.data.length; i++) {
            if (sums[i] === undefined) {
              sums[i] = dataset.data[i];
            } else {
              sums[i] += dataset.data[i];
            }
          }
        } else {
          const colorIdx =
            (datasets.length + this.colorIndex) % backgroundColors.length;
          const bgColor = backgroundColors[colorIdx];
          const borderColor = borderColors[colorIdx];
          datasets.push({
            ...dataset,
            backgroundColor: bgColor,
            borderColor,
            borderWidth: this.seriesBorderWidth,
            borderRadius: this.seriesBorderRadius
          });
        }
      }

      if (datasets.length === 0) {
        const idx = this.colorIndex % backgroundColors.length;
        datasets.push({
          label: this.single ? this.dataname : `All ${this.dataname}`,
          data: sums,
          backgroundColor: backgroundColors[idx],
          borderColor: borderColors[idx],
          borderWidth: this.seriesBorderWidth,
          borderRadius: this.seriesBorderRadius
        });
      } else {
        if (!this.hideOther && !this.showAll) {
          datasets.push({
            label: 'Other',
            data: sums,
            backgroundColor: otherBackgroundColor,
            borderColor: this.darkenColor(otherBackgroundColor, 0.05),
            borderWidth: 1,
            borderRadius: this.seriesBorderRadius
          });
        }
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
              },
              ...(this.formatDuration && {
                tooltip: {
                  callbacks: {
                    label: (context: any) => {
                      const label = context.dataset.label || '';
                      const value = context.parsed.y;
                      const formattedValue = formatDurationFromSeconds(value);
                      return `${label}: ${formattedValue}`;
                    }
                  }
                }
              })
            },
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              x: { from: 500 },
              y: { from: 500 }
            },
            scales: {
              y: {
                min: 0,
                stacked: true,
                ...(this.formatDuration && {
                  ticks: {
                    callback: (value: any) => {
                      return formatDurationFromSeconds(value);
                    }
                  }
                }),
                grid: { color: 'rgba(0,0,0,0.04)' }
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
