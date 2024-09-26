import { LitElement, PropertyValueMap } from 'lit';
import { CustomEventType } from './interfaces';
import { Color, log } from './utils';
import { property } from 'lit/decorators.js';

const showUpdates = (
  ele: HTMLElement,
  changes: Map<PropertyKey, unknown>,
  firstUpdated = false
) => {
  if (ele['DEBUG_UPDATES'] || ele['DEBUG']) {
    if (changes.size > 0) {
      const fromto = {};
      for (const key of changes.keys()) {
        fromto[key] = [changes[key], ele[key]];
      }

      log(ele.tagName, Color.PURPLE, [
        firstUpdated ? '<first-updated>' : '<updated>',
        fromto
      ]);
    }
  }
};

const showEvent = (ele: HTMLElement, type: string, details = undefined) => {
  if (ele['DEBUG_EVENTS'] || ele['DEBUG']) {
    if (details !== undefined) {
      log(ele.tagName, Color.GREEN, [type, details]);
    } else {
      log(ele.tagName, Color.GREEN, [type]);
    }
  }
};

export interface EventHandler {
  event: string;
  method: EventListener;
  isDocument?: boolean;
  isWindow?: boolean;
}

export class RapidElement extends LitElement {
  DEBUG = false;
  DEBUG_UPDATES = false;
  DEBUG_EVENTS = false;

  @property({ type: String })
  service: string;

  private eles: { [selector: string]: HTMLDivElement } = {};
  public getEventHandlers(): EventHandler[] {
    return [];
  }

  connectedCallback() {
    super.connectedCallback();

    for (const handler of this.getEventHandlers()) {
      if (handler.isDocument) {
        document.addEventListener(handler.event, handler.method.bind(this));
      } else if (handler.isWindow) {
        window.addEventListener(handler.event, handler.method.bind(this));
      } else {
        this.addEventListener(handler.event, handler.method.bind(this));
      }
    }
  }

  disconnectedCallback() {
    for (const handler of this.getEventHandlers()) {
      if (handler.isDocument) {
        document.removeEventListener(handler.event, handler.method);
      } else if (handler.isWindow) {
        window.removeEventListener(handler.event, handler.method);
      } else {
        this.removeEventListener(handler.event, handler.method);
      }
    }
    super.disconnectedCallback();
  }

  protected firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
    showUpdates(this, changes, true);
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    showUpdates(this, changes, false);
  }

  public getHeaders() {
    if (!this.service) {
      return {};
    }

    return {
      'X-Temba-Service-Org': this.service
    };
  }

  public fireEvent(type: string): any {
    showEvent(this, type);

    return this.dispatchEvent(
      new Event(type, {
        bubbles: true,
        composed: true
      })
    );
  }

  swallowEvent(event: Event) {
    event.stopPropagation();
    event.preventDefault();
  }

  public fireCustomEvent(type: CustomEventType, detail: any = {}): any {
    if (this['DEBUG_EVENTS']) {
      showEvent(this, type, detail);
    }

    const event = new CustomEvent(type, {
      detail,
      bubbles: true,
      composed: true
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
          `
          with(document) {
            with(this) {
              let handler = ${ele.getAttribute('-' + event.type)};
              if(typeof handler === 'function') { 
                handler(event);
              }
            }
          }
        `
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

  public stopEvent(event: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  public isMobile() {
    const win = window as any;
    if (win.isMobile) {
      return win.isMobile();
    }
    return false;
  }
}
