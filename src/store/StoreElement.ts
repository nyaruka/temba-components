import { PropertyValueMap } from 'lit';
import { property } from 'lit/decorators';
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
    if (event.detail.url === this.url) {
      this.data = event.detail.data;
      this.fireCustomEvent(CustomEventType.Refreshed, { data: this.data });
      // console.log("Updated!", this.data);
    }
  }

  protected updated(
    properties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(properties);
    if (properties.has('url')) {
      if (this.url) {
        this.store.makeRequest(this.url, { prepareData: this.prepareData });
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
}
