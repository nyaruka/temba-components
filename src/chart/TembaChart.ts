import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';
import { html, TemplateResult } from 'lit';
import { Chart, ChartType } from 'chart.js/auto';

/*
const colors = [
  'rgba(255, 99, 132, 0.2)',
  'rgba(255, 159, 64, 0.2)',
  'rgba(255, 205, 86, 0.2)',
  'rgba(75, 192, 192, 0.2)',
  'rgba(54, 162, 235, 0.2)',
  'rgba(153, 102, 255, 0.2)',
  'rgba(201, 203, 207, 0.2)'
];

const colorsBorder = [
  'rgb(255, 99, 132)',
  'rgb(255, 159, 64)',
  'rgb(255, 205, 86)',
  'rgb(75, 192, 192)',
  'rgb(54, 162, 235)',
  'rgb(153, 102, 255)',
  'rgb(201, 203, 207)'
];*/

export class TembaChart extends RapidElement {
  @property({ type: String })
  chartType: ChartType = 'bar';

  chart: Chart;

  shadowRootDiv: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    super.connectedCallback();

    this.shadowRootDiv = document.createElement('div');
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('height', '300px');
    this.shadowRootDiv.append(this.canvas);
    this.shadowRoot.appendChild(this.shadowRootDiv);

    this.ctx = this.canvas.getContext('2d');
    this.createChart();
  }

  private createChart(): void {
    const data = {
      type: this.chartType,
      data: {
        labels: [
          '3/4/2025',
          '3/5/2025',
          '3/6/2025',
          '3/7/2025',
          '3/8/2025',
          '3/9/2025',
          '3/10/2025',
          '3/11/2025',
          '3/12/2025',
          '3/13/2025',
          '3/14/2025'
        ],
        datasets: [
          {
            label: 'General',
            data: [65, 9, 23, 15, 20, 68, 19, 44, 97, 28, 30]
          },
          {
            label: 'VIPs',
            data: [5, 19, 3, 52, 10, 58, 9, 14, 37, 29, 39]
          },
          {
            label: 'Support',
            data: [29, 65, 45, 5, 2, 6, 31, 54, 67, 48, 25]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            stacked: true
          },
          x: {
            stacked: true
          }
        }
      }
    };

    this.chart = new Chart(this.ctx, data);
  }

  protected render(): TemplateResult {
    // const data = JSON.parse(this.getAttribute('data'));

    // window.setTimeout(() => {}, 0);

    return html``;
  }
}
