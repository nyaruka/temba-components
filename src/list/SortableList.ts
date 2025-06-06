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
        position: relative;
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
        background: var(--color-primary-dark, #1c7cd6);
        z-index: 1000;
        pointer-events: none;
      }

      .container.horizontal .drop-indicator {
        width: 2px;
        margin-top: -5px;
        padding-bottom: 10px;
      }

      .container:not(.horizontal) .drop-indicator {
        height: 2px;
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

  /**
   * Optional callback to allow parent components to customize the ghost node.
   * Called after the ghost node is cloned but before it is appended to the DOM.
   */
  @property({ attribute: false })
  prepareGhost?: (ghost: HTMLElement) => void;

  ghostElement: HTMLDivElement = null;
  downEle: HTMLDivElement = null;
  xOffset = 0;
  yOffset = 0;
  yDown = 0;
  xDown = 0;

  draggingIdx = -1;
  draggingEle = null;
  dropIndicator: HTMLDivElement = null;
  pendingDropIndex = -1;

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
  ): { targetIndex: number } | null {
    const elements = this.shadowRoot
      .querySelector('slot')
      .assignedElements();

    if (elements.length === 0) return null;

    if (this.horizontal) {
      // For horizontal layout, find which element we're over
      for (let i = 0; i < elements.length; i++) {
        const ele = elements[i];
        const rect = ele.getBoundingClientRect();

        if (mouseX >= rect.left && mouseX <= rect.right) {
          // We're over this element - check if we're on the left or right half
          const centerX = rect.left + rect.width / 2;
          if (mouseX < centerX) {
            // Left half - insert before this element
            return { targetIndex: i };
          } else {
            // Right half - insert after this element  
            return { targetIndex: i + 1 };
          }
        }
      }
      
      // Not over any element - find the closest insertion point
      for (let i = 0; i < elements.length; i++) {
        const ele = elements[i];
        const rect = ele.getBoundingClientRect();
        
        if (mouseX < rect.left) {
          // Insert before this element
          return { targetIndex: i };
        }
      }
      
      // Past all elements
      return { targetIndex: elements.length };
    } else {
      // For vertical layout, find which element we're over
      for (let i = 0; i < elements.length; i++) {
        const ele = elements[i];
        const rect = ele.getBoundingClientRect();

        if (mouseY >= rect.top && mouseY <= rect.bottom) {
          // We're over this element - check if we're on the top or bottom half
          const centerY = rect.top + rect.height / 2;
          if (mouseY < centerY) {
            // Top half - insert before this element
            return { targetIndex: i };
          } else {
            // Bottom half - insert after this element
            return { targetIndex: i + 1 };
          }
        }
      }
      
      // Not over any element - find the closest insertion point
      for (let i = 0; i < elements.length; i++) {
        const ele = elements[i];
        const rect = ele.getBoundingClientRect();
        
        if (mouseY < rect.top) {
          // Insert before this element
          return { targetIndex: i };
        }
      }
      
      // Past all elements
      return { targetIndex: elements.length };
    }
  }

  private showDropIndicator(targetIndex: number) {
    this.hideDropIndicator();

    if (targetIndex < 0) return;

    const elements = this.shadowRoot.querySelector('slot').assignedElements();
    if (targetIndex >= elements.length) {
      // Inserting at the end - show indicator after the last element
      if (elements.length > 0) {
        const lastElement = elements[elements.length - 1];
        this.showIndicatorRelativeToElement(lastElement, true);
      }
    } else {
      // Inserting before the element at targetIndex
      const targetElement = elements[targetIndex];
      this.showIndicatorRelativeToElement(targetElement, false);
    }
  }

  private showIndicatorRelativeToElement(targetElement: Element, insertAfter: boolean) {
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
      event.preventDefault();
      event.stopPropagation();

      this.downEle = ele;
      this.draggingId = ele.id;
      this.draggingIdx = this.getRowIndex(ele.id);
      this.draggingEle = ele;

      // Use getBoundingClientRect for accurate offsets
      const rect = ele.getBoundingClientRect();
      this.xOffset = event.clientX - rect.left;
      this.yOffset = event.clientY - rect.top;
      this.yDown = event.clientY;
      this.xDown = event.clientX;

      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    }
  }

  private handleMouseMove(event: MouseEvent) {
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
      this.ghostElement.style.transition = 'transform 300ms linear';

      this.ghostElement.style.width = rect.width + 'px';
      this.ghostElement.style.height = rect.height + 'px';
      this.ghostElement.style.position = 'fixed';
      this.ghostElement.style.left = event.clientX - this.xOffset + 'px';
      this.ghostElement.style.top = event.clientY - this.yOffset + 'px';
      this.ghostElement.style.pointerEvents = 'none';
      this.ghostElement.style.border =
        '1px solid var(--color-primary, #1c7cd6)';
      this.ghostElement.style.zIndex = '99999';
      this.ghostElement.style.background = '#fff';
      this.ghostElement.style.opacity = '0.7';
      this.ghostElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
      this.ghostElement.style.borderRadius = 'var(--curvature)';

      // allow component to customize the ghost node
      if (this.prepareGhost) {
        this.prepareGhost(this.ghostElement);
      }

      document.body.appendChild(this.ghostElement);

      this.downEle = null;
    }

    if (this.ghostElement) {
      this.ghostElement.style.left = event.clientX - this.xOffset + 'px';
      this.ghostElement.style.top = event.clientY - this.yOffset + 'px';

      const targetInfo = this.getDropTargetInfo(event.clientX, event.clientY);
      if (targetInfo) {
        this.pendingDropIndex = targetInfo.targetIndex;
        this.showDropIndicator(targetInfo.targetIndex);
      } else {
        this.pendingDropIndex = -1;
        this.hideDropIndicator();
      }
    }
  }

  private handleMouseUp(evt: MouseEvent) {
    if (this.draggingId && this.ghostElement) {
      evt.preventDefault();
      evt.stopPropagation();

      // Fire the order changed event only if we have a valid drop position
      if (this.pendingDropIndex >= 0) {
        const originalIdx = this.getRowIndex(this.draggingId);
        this.fireCustomEvent(CustomEventType.OrderChanged, {
          fromIdx: originalIdx,
          toIdx: this.pendingDropIndex,
          id: this.draggingId
        });
      }

      this.fireCustomEvent(CustomEventType.DragStop, {
        id: this.draggingId
      });

      this.draggingId = null;
      this.dropTargetId = null;
      this.downEle = null;
      this.pendingDropIndex = -1;

      if (this.ghostElement) {
        // Remove from body if present
        if (this.ghostElement.parentNode) {
          this.ghostElement.parentNode.removeChild(this.ghostElement);
        }
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
