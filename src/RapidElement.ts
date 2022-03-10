import { LitElement } from 'lit';
import { CustomEventType } from './interfaces';

export interface EventHandler {
  event: string;
  method: EventListener;
  isDocument?: boolean;
}

export class RapidElement extends LitElement {
  private eles: { [selector: string]: HTMLDivElement } = {};

  public getEventHandlers(): EventHandler[] {
    return [];
  }

  connectedCallback() {
    super.connectedCallback();

    for (const handler of this.getEventHandlers()) {
      if (handler.isDocument) {
        document.addEventListener(handler.event, handler.method.bind(this));
      } else {
        this.addEventListener(handler.event, handler.method.bind(this));
      }
    }
  }

  disconnectedCallback() {
    for (const handler of this.getEventHandlers()) {
      if (handler.isDocument) {
        document.removeEventListener(handler.event, handler.method);
      } else {
        this.removeEventListener(handler.event, handler.method);
      }
    }
    super.disconnectedCallback();
  }

  public fireEvent(type: string): any {
    return this.dispatchEvent(
      new Event(type, {
        bubbles: true,
        composed: true,
      })
    );
  }

  public fireCustomEvent(type: CustomEventType, detail: any = {}): any {
    const event = new CustomEvent(type, {
      detail,
      bubbles: true,
      composed: true,
    });

    return this.dispatchEvent(event);
  }

  public dispatchEvent(event: any): any {
    super.dispatchEvent(event);
    const ele = event.target;
    if (ele) {
      // lookup events with - prefix and try to invoke them
      const eventFire = (ele as any)['-' + event.type];
      if (eventFire) {
        return eventFire(event);
      } else {
        const func = new Function(
          'event',
          `with(document) {
          with(this) {
            let handler = ${ele.getAttribute('-' + event.type)};
            if(typeof handler === 'function') { 
              handler(event) ;
            }
          }
        }`
        );
        return func.call(ele, event);
      }
    }
  }

  public closestElement(selector: string, base: Element = this) {
    function __closestFrom(el: Element | Window | Document): Element {
      if (!el || el === document || el === window) return null;
      if ((el as any).assignedSlot) el = (el as any).assignedSlot;
      const found = (el as Element).closest(selector);
      return found
        ? found
        : __closestFrom(((el as Element).getRootNode() as ShadowRoot).host);
    }
    return __closestFrom(base);
  }

  public getDiv(selector: string) {
    let ele = this.eles[selector];
    if (ele) {
      return ele;
    }

    ele = this.shadowRoot.querySelector(selector);
    if (ele) {
      this.eles[selector] = ele;
    }
    return ele;
  }
}
