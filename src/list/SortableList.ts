import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';

/**
 * A simple list that can be sorted by dragging
 */

// how far we have to drag before it starts
const DRAG_THRESHOLD = 5;
export class SortableList extends RapidElement {
  static get styles() {
    return css`
      :host {
        margin: auto;
      }

      .container {
        user-select: none;
      }

      .dragging {
        background: var(--color-selection);
      }

      .sortable {
        transition: all 300ms ease-in-out;
        display: flex;
        padding: 0.4em 0;
      }

      .sortable:hover temba-icon {
        opacity: 1;
        cursor: move;
      }

      .ghost {
        position: absolute;
        opacity: 0.5;
        transition: none;
      }

      .slot {
        flex-grow: 1;
      }

      slot > * {
        user-select: none;
      }

      temba-icon {
        opacity: 0.1;
        padding: 0.2em 0.5em;
        transition: all 300ms ease-in-out;
      }
    `;
  }

  @property({ type: String })
  draggingId: string;

  ghostElement: HTMLDivElement = null;
  downEle: HTMLDivElement = null;
  xOffset = 0;
  yOffset = 0;
  yDown = 0;

  draggingIdx = -1;
  draggingEle = null;

  public constructor() {
    super();
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(_changedProperties);
  }

  public getIds() {
    return this.shadowRoot
      .querySelector('slot')
      .assignedElements()
      .map((ele) => ele.id);
  }

  private getRowIndex(id: string): number {
    return this.shadowRoot
      .querySelector('slot')
      .assignedElements()
      .findIndex((ele) => ele.id === id);
  }

  private getOverlappingElement(mouseY: number): HTMLDivElement {
    const ghostRect = this.ghostElement.getBoundingClientRect();

    const ele = this.shadowRoot
      .querySelector('slot')
      .assignedElements()
      .find((otherEle) => {
        const rect = otherEle.getBoundingClientRect();

        // don't return ourselves
        if (otherEle.id === this.ghostElement.id) {
          return false;
        }

        if (mouseY > this.yDown) {
          // moving down
          return ghostRect.top < rect.bottom && ghostRect.bottom > rect.bottom;
        } else {
          // moving up
          return rect.top < ghostRect.bottom && rect.bottom > ghostRect.bottom;
        }
      });
    return ele as HTMLDivElement;
  }

  private handleMouseDown(event: MouseEvent) {
    let ele = event.target as HTMLDivElement;
    ele = ele.closest('.sortable');
    if (ele) {
      this.downEle = ele;
      this.draggingId = ele.id;
      this.draggingIdx = this.getRowIndex(ele.id);
      this.draggingEle = ele;

      this.xOffset = event.clientX - ele.offsetLeft;
      this.yOffset = event.clientY - ele.offsetTop;
      this.yDown = event.clientY;

      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    }
  }

  private handleMouseMove(event: MouseEvent) {
    const scrollTop = this.shadowRoot
      .querySelector('slot')
      .assignedElements()[0].parentElement.scrollTop;

    if (
      !this.ghostElement &&
      this.downEle &&
      Math.abs(event.clientY - this.yDown) > DRAG_THRESHOLD
    ) {
      this.fireCustomEvent(CustomEventType.DragStart, {
        id: this.downEle.id
      });

      this.ghostElement = this.downEle.cloneNode(true) as HTMLDivElement;
      this.ghostElement.classList.add('ghost');

      const computedStyle = getComputedStyle(this.downEle);

      this.ghostElement.style.width =
        this.downEle.clientWidth -
        parseFloat(computedStyle.paddingLeft) -
        parseFloat(computedStyle.paddingRight) +
        'px';
      const container = this.shadowRoot.querySelector('.container');

      container.appendChild(this.ghostElement);

      this.downEle = null;
    }

    if (this.ghostElement) {
      this.ghostElement.style.left = event.clientX - this.xOffset + 'px';
      this.ghostElement.style.top =
        event.clientY - this.yOffset - scrollTop + 'px';

      const other = this.getOverlappingElement(event.clientY);
      if (other) {
        const otherIdx = this.getRowIndex(other.id);
        const dragId = this.ghostElement.id;
        const otherId = other.id;

        this.fireCustomEvent(CustomEventType.OrderChanged, {
          from: dragId,
          to: otherId,
          fromIdx: this.draggingIdx,
          toIdx: otherIdx
        });

        // TODO: Dont do swapping, just send the full order?
        this.draggingIdx = otherIdx;
        this.draggingId = otherId;
      }
    }
  }

  private handleMouseUp() {
    if (this.draggingId) {
      this.fireCustomEvent(CustomEventType.DragStop, {
        id: this.draggingId
      });

      this.draggingId = null;
      this.downEle = null;

      if (this.ghostElement) {
        this.ghostElement.remove();
        this.ghostElement = null;
      }
    }
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    this.dispatchEvent(new Event('change'));
  }

  public render(): TemplateResult {
    return html`
      <div class="container">
        <slot @mousedown=${this.handleMouseDown}></slot>
      </div>
    `;
  }
}
