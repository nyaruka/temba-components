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
        display: grid;
        grid-template-columns: 1fr;
      }

      .container.horizontal {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
      }

      .dragging {
        background: var(--color-selection);
      }

      .dragged-item {
        opacity: 0;
        pointer-events: none;
      }

      .sortable {
        transition: transform 300ms ease-in-out;
        display: flex;
        padding: 0.4em 0;
        border: 5px solid purple;
      }

      .sortable.translating {
        transform: translateY(var(--translate-distance, 0));
      }

      .container.horizontal .sortable.translating {
        transform: translateX(var(--translate-distance, 0));
      }

      .container.horizontal .sortable {
        padding: 0;
        margin-right: 0.25em;
        margin-bottom: 0.25em;
      }

      .drop-placeholder {
        background: red !important;
        border: 2px dashed var(--color-primary-dark, #1c7cd6);
        border-radius: 4px;
        opacity: 0.6;
        pointer-events: none;
        box-sizing: border-box;
        transition: all 200ms ease-in-out;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.4em 0;
      }

      .container.horizontal .drop-placeholder {
        padding: 0;
        margin-right: 0.25em;
        margin-bottom: 0.25em;
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

  @property({ type: String })
  dragHandle: string;

  @property({ type: String })
  gap: string = '0em';

  /**
   * Optional callback to allow parent components to customize the ghost node.
   * Called after the ghost node is cloned but before it is appended to the DOM.
   */
  @property({ attribute: false })
  prepareGhost?: (ghost: HTMLElement) => void;

  ghostElement: HTMLDivElement = null;
  downEle: HTMLDivElement = null;
  originalElementRect: DOMRect = null; // Store original dimensions
  originalParent: Element = null; // Store original parent for restoration
  originalNextSibling: Element = null; // Store original next sibling for restoration
  originalDragIndex: number = -1; // Store original index before moving element
  xOffset = 0;
  yOffset = 0;
  yDown = 0;
  xDown = 0;

  draggingIdx = -1;
  draggingEle = null;
  dropPlaceholder: HTMLDivElement = null;
  pendingDropIndex = -1;
  pendingTargetElement: HTMLElement = null;

  private clickBlocker: ((e: MouseEvent) => void) | null = null;

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

  private getSortableElements(): Element[] {
    return this.shadowRoot
      .querySelector('slot')
      .assignedElements()
      .filter(
        (ele) =>
          ele.classList.contains('sortable') &&
          !ele.classList.contains('drop-placeholder')
      );
  }

  public getIds() {
    return this.getSortableElements().map((ele) => ele.id);
  }

  private getRowIndex(id: string): number {
    return this.getSortableElements().findIndex((ele) => ele.id === id);
  }

  private getDropTargetInfo(
    mouseX: number,
    mouseY: number
  ): { element: HTMLDivElement; insertAfter: boolean } | null {
    const elements = this.getSortableElements().filter(
      (ele) => ele.id !== this.draggingEle?.id
    );

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

  private showDropPlaceholder(
    targetElement: HTMLElement,
    insertAfter: boolean
  ) {
    this.hideDropPlaceholder();

    if (!targetElement || !this.draggingEle) return;

    // Don't show placeholder if we're targeting the dragging element itself
    if (targetElement === this.draggingEle) return;

    this.dropPlaceholder = document.createElement('div');

    this.dropPlaceholder.className = 'drop-placeholder sortable';

    // Copy dimensions from the original element (before it was hidden)
    if (this.originalElementRect) {
      const rect = this.originalElementRect;
      this.dropPlaceholder.style.width = rect.width + 'px';
      this.dropPlaceholder.style.height = rect.height + 'px';
      this.dropPlaceholder.style.minHeight = rect.height + 'px';
      this.dropPlaceholder.style.background = 'var(--color-selection)';
      this.dropPlaceholder.style.borderRadius = 'var(--curvature)';
      this.dropPlaceholder.style.flexShrink = '0';
    }

    // Insert the placeholder in the correct position in the DOM
    if (insertAfter) {
      targetElement.insertAdjacentElement('afterend', this.dropPlaceholder);
    } else {
      targetElement.insertAdjacentElement('beforebegin', this.dropPlaceholder);
    }
  }

  private hideDropPlaceholder() {
    if (this.dropPlaceholder) {
      this.dropPlaceholder.remove();
      this.dropPlaceholder = null;
    }
  }

  private handleMouseDown(event: MouseEvent) {
    let ele = event.target as HTMLDivElement;

    // if we have a drag handle, only allow dragging from that element
    if (this.dragHandle) {
      if (!ele.classList.contains(this.dragHandle)) {
        return;
      }
    }

    ele = ele.closest('.sortable');
    if (ele) {
      event.preventDefault();
      event.stopPropagation();
      this.downEle = ele;
      this.draggingId = ele.id;
      this.draggingIdx = this.getRowIndex(ele.id);
      this.draggingEle = ele;

      // Use getBoundingClientRect for accurate offsets and store original dimensions
      const rect = ele.getBoundingClientRect();
      this.originalElementRect = rect; // Store the original rect before hiding
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

      // Capture the original index BEFORE moving the element
      this.originalDragIndex = this.getRowIndex(this.downEle.id);

      // Instead of cloning, let's move the actual element and style it as ghost
      this.ghostElement = this.downEle;

      // Store the original parent so we can restore it later
      this.originalParent = this.ghostElement.parentElement;
      this.originalNextSibling = this.ghostElement.nextElementSibling;

      // Move the element to document.body and style it as a ghost
      this.ghostElement.classList.add('ghost');

      // Use the stored original dimensions for positioning
      const rect = this.originalElementRect;

      this.ghostElement.style.position = 'fixed';
      this.ghostElement.style.left = event.clientX - this.xOffset + 'px';
      this.ghostElement.style.top = event.clientY - this.yOffset + 'px';
      this.ghostElement.style.width = rect.width + 'px';
      this.ghostElement.style.height = rect.height + 'px';
      this.ghostElement.style.pointerEvents = 'none';
      this.ghostElement.style.zIndex = '99999';
      this.ghostElement.style.opacity = '0.8';
      this.ghostElement.style.borderRadius = 'var(--curvature)';

      // allow component to customize the ghost node
      if (this.prepareGhost) {
        this.prepareGhost(this.ghostElement);
      }

      // Move to document.body for dragging
      document.body.appendChild(this.ghostElement);

      // Add global click blocker when drag starts
      if (!this.clickBlocker) {
        this.clickBlocker = (e: MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
        };
        // Use capture phase to intercept clicks before they reach any elements
        document.addEventListener('click', this.clickBlocker, true);
      }
    }

    if (this.ghostElement) {
      this.ghostElement.style.left = event.clientX - this.xOffset + 'px';
      this.ghostElement.style.top = event.clientY - this.yOffset + 'px';

      const targetInfo = this.getDropTargetInfo(event.clientX, event.clientY);
      if (targetInfo) {
        const { element: targetElement, insertAfter } = targetInfo;
        const targetIdx = this.getRowIndex(targetElement.id);

        // Use the original drag index we captured before moving the element
        const originalDragIdx = this.originalDragIndex;

        // Calculate where the dragged element will end up in the final array
        // targetIdx is the position of target element in current DOM (missing dragged element)

        let dropIdx;
        if (targetIdx < originalDragIdx) {
          // Target is before the original drag position
          dropIdx = insertAfter ? targetIdx + 1 : targetIdx;
        } else {
          // Target was originally after the drag position
          // Its original position was targetIdx + 1
          dropIdx = insertAfter ? targetIdx + 1 : targetIdx;
        }

        // Store pending drop info but don't fire event yet
        this.dropTargetId = targetElement.id;
        this.pendingDropIndex = dropIdx;
        this.pendingTargetElement = targetElement;

        // Show drop placeholder
        this.showDropPlaceholder(targetElement, insertAfter);
      } else {
        this.hideDropPlaceholder();
        this.dropTargetId = null;
        this.pendingDropIndex = -1;
        this.pendingTargetElement = null;
      }
    }
  }

  private handleMouseUp(evt: MouseEvent) {
    if (this.draggingId && this.ghostElement) {
      evt.preventDefault();
      evt.stopPropagation();

      // Restore the element to its original position and styling
      if (this.ghostElement && this.originalParent) {
        // Clear ghost styling
        this.ghostElement.classList.remove('ghost');
        this.ghostElement.style.position = '';
        this.ghostElement.style.left = '';
        this.ghostElement.style.top = '';
        this.ghostElement.style.width = '';
        this.ghostElement.style.height = '';
        this.ghostElement.style.pointerEvents = '';
        this.ghostElement.style.zIndex = '';
        this.ghostElement.style.background = '';
        this.ghostElement.style.opacity = '';
        this.ghostElement.style.borderRadius = '';
        this.ghostElement.style.boxShadow = '';

        // Restore to original position in the DOM
        if (this.originalNextSibling) {
          this.originalParent.insertBefore(
            this.ghostElement,
            this.originalNextSibling
          );
        } else {
          this.originalParent.appendChild(this.ghostElement);
        }
      }

      // Clear visual effects before firing events
      this.hideDropPlaceholder();

      // fire the order changed event only when dropped if we have a valid drop position
      if (this.pendingDropIndex >= 0 && this.pendingTargetElement) {
        // Use the original drag index we captured before moving the element
        const originalDragIdx = this.originalDragIndex;

        // use swap-based logic - report which indexes need to be swapped
        const fromIdx = originalDragIdx;
        const toIdx = this.pendingDropIndex;

        // only fire if the position actually changed
        if (fromIdx !== toIdx) {
          this.fireCustomEvent(CustomEventType.OrderChanged, {
            swap: [fromIdx, toIdx]
          });
        }
      }

      this.fireCustomEvent(CustomEventType.DragStop, {
        id: this.draggingId
      });

      this.draggingId = null;
      this.dropTargetId = null;
      this.downEle = null;
      this.originalElementRect = null; // Clean up stored rect
      this.originalParent = null; // Clean up stored parent
      this.originalNextSibling = null; // Clean up stored sibling
      this.originalDragIndex = -1; // Clean up stored index
      this.pendingDropIndex = -1;
      this.pendingTargetElement = null;

      // Ghost element is now restored to its original position, so just clear the reference
      this.ghostElement = null;

      this.hideDropPlaceholder();

      // Keep the click blocker active for a short time after drop
      if (this.clickBlocker) {
        // We'll clean it up after a timeout
        setTimeout(() => {
          if (this.clickBlocker) {
            document.removeEventListener('click', this.clickBlocker, true);
            this.clickBlocker = null;
          }
        }, 100);
      }
    }
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    this.dispatchEvent(new Event('change'));
  }

  public render(): TemplateResult {
    return html`
      <div
        class="container ${this.horizontal ? 'horizontal' : ''}"
        style="gap: ${this.gap}"
      >
        <slot @mousedown=${this.handleMouseDown}></slot>
      </div>
    `;
  }
}
