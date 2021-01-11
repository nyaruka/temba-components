import {
  css,
  customElement,
  html,
  property,
  TemplateResult,
} from "lit-element";
import RapidElement from "../RapidElement";
import { fetchResultsPage, ResultsPage } from "../utils";

@customElement("temba-list")
export default class TembaList extends RapidElement {
  @property({ type: Array, attribute: false })
  items: any[];

  @property({ type: Object, attribute: false })
  selected: any;

  @property({ type: String })
  endpoint: string;

  @property({ type: Number })
  tabIndex: number = 1;

  @property({ attribute: false })
  sanitizeOption: (option: any) => any;

  @property({ attribute: false })
  renderOption: (option: any, selected: boolean) => TemplateResult;

  @property({ attribute: false })
  renderOptionDetail: (option: any, selected: boolean) => TemplateResult;

  // our next page from our endpoint
  nextPage: string = null;

  static get styles() {
    return css`
      :host {
        display: block;
        height: 100%;
      }

      temba-options {
        display: block;
        height: 100%;
      }
    `;
  }

  constructor() {
    super();
    this.handleSelection.bind(this);
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has("endpoint") && this.endpoint) {
      this.nextPage = null;
      fetchResultsPage(this.endpoint).then((page: ResultsPage) => {
        if (this.sanitizeOption) {
          page.results.forEach(this.sanitizeOption);
        }
        this.items = page.results;
        this.nextPage = page.next;
      });
    }
  }

  private handleScrollThreshold(event: CustomEvent) {
    if (this.nextPage) {
      fetchResultsPage(this.nextPage).then((page: ResultsPage) => {
        this.items = [...this.items, ...page.results];
        this.nextPage = page.next;
      });
    }
  }

  private handleSelection(event: CustomEvent) {
    this.selected = event.detail.selected;
    const evt = new Event("change", { bubbles: true });
    this.dispatchEvent(evt);
  }

  public render(): TemplateResult {
    return html`<temba-options
      ?visible=${true}
      ?block=${true}
      .renderOption=${this.renderOption}
      .renderOptionDetail=${this.renderOptionDetail}
      @temba-scroll-threshold=${this.handleScrollThreshold}
      @temba-selection=${this.handleSelection.bind(this)}
      .options=${this.items}
    ></temba-options>`;
  }
}
