import { html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';
import { Store } from './Store';

/**
 * StoreElement is a listener for a given endpoint that re-renders
 * when the underlying store element changes
 */
export class StoreElement extends RapidElement {
  @property({ type: String })
  url: string;

  @property({ type: Boolean })
  showLoading = false;

  @property({ type: Object, attribute: false })
  data: any;

  store: Store;

  prepareData(data: any): any {
    return data;
  }

  public refresh() {
    this.store.makeRequest(this.url, {
      prepareData: this.prepareData,
      force: true,
    });
  }

  private handleStoreUpdated(event: CustomEvent) {
    this.store.initialHttpComplete.then(() => {
      if (event.detail.url === this.url) {
        const previous = this.data;
        this.data = event.detail.data;
        this.fireCustomEvent(CustomEventType.Refreshed, {
          data: event.detail.data,
          previous,
        });
      }
    });
  }

  protected updated(
    properties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(properties);
    if (properties.has('url')) {
      if (this.url) {
        this.store.makeRequest(this.url, { prepareData: this.prepareData });
      } else {
        this.data = null;
      }
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.store = document.querySelector('temba-store') as Store;
    this.handleStoreUpdated = this.handleStoreUpdated.bind(this);
    this.prepareData = this.prepareData.bind(this);
    if (this.store) {
      this.store.addEventListener(
        CustomEventType.StoreUpdated,
        this.handleStoreUpdated
      );
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.store) {
      this.store.removeEventListener(
        CustomEventType.StoreUpdated,
        this.handleStoreUpdated
      );
    }
  }

  public render(): TemplateResult {
    if (!this.store.ready && this.showLoading) {
      return html`<temba-loading></temba-loading>`;
    }
  }
}
