import { LitElement, PropertyValueMap } from 'lit';
import { CustomEventType } from './interfaces';

enum Color {
  YELLOW = 33,
  PURPLE = 35,
  WHITE = 37,
  BLUE = 34,
  RED = 31,
  CYAN = 36,
  GREEN = 32,
  BLACK = 30,
}

const colorize = (text: string, color: Color) => {
  return `\x1b[${color}m${text}\x1b[0m`;
};

const tag = (ele: HTMLElement) => {
  return colorize(ele.tagName.padEnd(30), Color.PURPLE);
};

const showUpdates = (
  ele: HTMLElement,
  changes: Map<PropertyKey, unknown>,
  firstUpdated = false
) => {
  if (ele['DEBUG_UPDATES'] || ele['DEBUG']) {
    if (changes.size > 0) {
      console.log(
        tag(ele),
        firstUpdated
          ? colorize('<updated>', Color.YELLOW)
          : colorize('<first-updated>', Color.BLACK)
      );
      for (const [key, value] of changes.entries()) {
        console.log(
          '  ' + String(key).padEnd(30),
          value,
          colorize('=>', Color.WHITE),
          ele[key]
        );
      }
    }
  }
};

const showEvent = (ele: HTMLElement, type: string, details = undefined) => {
  if (ele['DEBUG_EVENTS'] || ele['DEBUG']) {
    console.log(
      tag(ele),
      details !== undefined
        ? colorize('<custom-event>', Color.RED)
        : colorize('<event>       ', Color.CYAN),
      colorize(type, Color.BLUE),
      details !== undefined ? details : ''
    );
  }
};

export interface EventHandler {
  event: string;
  method: EventListener;
  isDocument?: boolean;
}

export class RapidElement extends LitElement {
  DEBUG = false;
  DEBUG_UPDATES = false;
  DEBUG_EVENTS = false;

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

  protected firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    showUpdates(this, changes, true);
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    showUpdates(this, changes, false);
  }

  public fireEvent(type: string): any {
    showEvent(this, type);

    return this.dispatchEvent(
      new Event(type, {
        bubbles: true,
        composed: true,
      })
    );
  }

  public fireCustomEvent(type: CustomEventType, detail: any = {}): any {
    if (this['DEBUG_EVENTS']) {
      showEvent(this, type, detail);
    }

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
}
