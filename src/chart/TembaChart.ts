import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';
import { html, TemplateResult } from 'lit';
import { Chart, ChartType } from 'chart.js/auto';

/* const colors = [
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
    this.shadowRootDiv = document.createElement('div');
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('width', '100%');
    this.canvas.setAttribute('height', '30px');
    this.shadowRootDiv.append(this.canvas);
    this.shadowRoot.appendChild(this.shadowRootDiv);
  }

  protected render(): TemplateResult {
    // const data = JSON.parse(this.getAttribute('data'));
    const data = {
      type: this.chartType,
      data: {
        labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        datasets: [
          {
            label: 'dataset 1',
            data: [5, 9, 3, 5, 2, 6, 1, 4, 7, 8, 0],
            borderWidth: 1,
            backgroundColor: ['rgba(54, 162, 235, 0.2)'],
            borderColor: ['rgb(54, 162, 235)']
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    window.setTimeout(() => {
      const context = this.canvas.getContext('2d');
      this.chart = new Chart(context, data);
    }, 0);

    return html``;
  }
}
