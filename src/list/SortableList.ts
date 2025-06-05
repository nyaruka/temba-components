import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';

/**
 * A simple list that can be sorted by dragging
 */

// how far we have to drag before it starts
const DRAG_THRESHOLD = 2;
export class SortableList extends RapidElement {
  static get styles() {
    return css`
      :host {
        margin: auto;
      }

      .container {
        user-select: none;
      }

      .container.horizontal {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
      }

      .dragging {
        background: var(--color-selection);
      }

      .sortable {
        transition: all 300ms ease-in-out;
        display: flex;
        padding: 0.4em 0;
      }

      .container.horizontal .sortable {
        padding: 0;
        margin-right: 0.25em;
        margin-bottom: 0.25em;
      }

      .drop-indicator {
        position: absolute;
        background: var(--color-primary, #1c7cd6);
        z-index: 1000;
        pointer-events: none;
      }

      .container.horizontal .drop-indicator {
        width: 2px;
        height: 100%;
        top: 0;
      }

      .container:not(.horizontal) .drop-indicator {
        height: 2px;
        width: 100%;
        left: 0;
      }

      .sortable:hover temba-icon {
        opacity: 1;
        cursor: move;
      }

      .ghost {
        position: absolute;
        opacity: 0.7;
        transition: none;
        background: var(--color-background, white);
        border: 1px solid var(--color-primary, #1c7cd6);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        pointer-events: none;
        z-index: 999;
        transform: rotate(2deg);
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

  @property({ type: Boolean })
  horizontal: boolean = false;

  @property({ type: String })
  dropTargetId: string;

  ghostElement: HTMLDivElement = null;
  downEle: HTMLDivElement = null;
  xOffset = 0;
  yOffset = 0;
  yDown = 0;
  xDown = 0;

  draggingIdx = -1;
  draggingEle = null;
  dropIndicator: HTMLDivElement = null;

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

  private getDropTargetInfo(
    mouseX: number,
    mouseY: number
  ): { element: HTMLDivElement; insertAfter: boolean } | null {
    const elements = this.shadowRoot
      .querySelector('slot')
      .assignedElements()
      .filter((ele) => ele.id !== this.draggingEle?.id);

    if (elements.length === 0) return null;

    if (this.horizontal) {
      // For horizontal layout, find the insertion point based on mouse X position
      for (let i = 0; i < elements.length; i++) {
        const ele = elements[i];
        const rect = ele.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;

        if (mouseX < centerX) {
          // Insert before this element
          return { element: ele as HTMLDivElement, insertAfter: false };
        }
      }
      // If we're past all elements, insert after the last one
      return {
        element: elements[elements.length - 1] as HTMLDivElement,
        insertAfter: true
      };
    } else {
      // For vertical layout, find the insertion point based on mouse Y position
      for (let i = 0; i < elements.length; i++) {
        const ele = elements[i];
        const rect = ele.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;

        if (mouseY < centerY) {
          // Insert before this element
          return { element: ele as HTMLDivElement, insertAfter: false };
        }
      }
      // If we're past all elements, insert after the last one
      return {
        element: elements[elements.length - 1] as HTMLDivElement,
        insertAfter: true
      };
    }
  }

  private showDropIndicator(targetElement: HTMLElement, insertAfter: boolean) {
    this.hideDropIndicator();

    if (!targetElement) return;

    const container = this.shadowRoot.querySelector('.container');
    this.dropIndicator = document.createElement('div');
    this.dropIndicator.className = 'drop-indicator';

    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (this.horizontal) {
      // For horizontal layout, show vertical line
      this.dropIndicator.style.height = targetRect.height + 'px';
      this.dropIndicator.style.top = targetRect.top - containerRect.top + 'px';

      if (insertAfter) {
        // Show line after target
        this.dropIndicator.style.left =
          targetRect.right - containerRect.left + 'px';
      } else {
        // Show line before target
        this.dropIndicator.style.left =
          targetRect.left - containerRect.left + 'px';
      }
    } else {
      // For vertical layout, show horizontal line
      this.dropIndicator.style.width = targetRect.width + 'px';
      this.dropIndicator.style.left =
        targetRect.left - containerRect.left + 'px';

      if (insertAfter) {
        // Show line after target
        this.dropIndicator.style.top =
          targetRect.bottom - containerRect.top + 'px';
      } else {
        // Show line before target
        this.dropIndicator.style.top =
          targetRect.top - containerRect.top + 'px';
      }
    }

    container.appendChild(this.dropIndicator);
  }

  private hideDropIndicator() {
    if (this.dropIndicator) {
      this.dropIndicator.remove();
      this.dropIndicator = null;
    }
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
      this.xDown = event.clientX;

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
      (Math.abs(event.clientY - this.yDown) > DRAG_THRESHOLD ||
        Math.abs(event.clientX - this.xDown) > DRAG_THRESHOLD)
    ) {
      this.fireCustomEvent(CustomEventType.DragStart, {
        id: this.downEle.id
      });

      this.ghostElement = this.downEle.cloneNode(true) as HTMLDivElement;
      this.ghostElement.classList.add('ghost');

      const rect = this.downEle.getBoundingClientRect();

      this.ghostElement.style.width = rect.width + 'px';
      this.ghostElement.style.height = rect.height + 'px';
      const container = this.shadowRoot.querySelector('.container');

      container.appendChild(this.ghostElement);

      this.downEle = null;
    }

    if (this.ghostElement) {
      this.ghostElement.style.left = event.clientX - this.xOffset + 'px';
      this.ghostElement.style.top =
        event.clientY - this.yOffset - scrollTop + 'px';

      const targetInfo = this.getDropTargetInfo(event.clientX, event.clientY);
      if (targetInfo) {
        const { element: targetElement, insertAfter } = targetInfo;
        const targetIdx = this.getRowIndex(targetElement.id);
        const originalDragIdx = this.getRowIndex(this.draggingEle.id);

        // Show drop indicator
        this.showDropIndicator(targetElement, insertAfter);
        this.dropTargetId = targetElement.id;

        // Report the target element's index - the consuming component handles the logic
        this.fireCustomEvent(CustomEventType.OrderChanged, {
          from: this.draggingEle.id,
          to: targetElement.id,
          fromIdx: originalDragIdx,
          toIdx: targetIdx
        });

        // Update dragging index for visual feedback
        this.draggingIdx = targetIdx;
      } else {
        this.hideDropIndicator();
        this.dropTargetId = null;
      }
    }
  }

  private handleMouseUp() {
    if (this.draggingId) {
      this.fireCustomEvent(CustomEventType.DragStop, {
        id: this.draggingId
      });

      this.draggingId = null;
      this.dropTargetId = null;
      this.downEle = null;

      if (this.ghostElement) {
        this.ghostElement.remove();
        this.ghostElement = null;
      }

      this.hideDropIndicator();
    }
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    this.dispatchEvent(new Event('change'));
  }

  public render(): TemplateResult {
    return html`
      <div class="container ${this.horizontal ? 'horizontal' : ''}">
        <slot @mousedown=${this.handleMouseDown}></slot>
      </div>
    `;
  }
}
