import { css, html, PropertyValueMap, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../../../shared/interfaces';
import { RapidElement } from '../../../components/base/RapidElement';

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

      .dragged-item {
        opacity: 0;
        pointer-events: none;
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

  @property({ type: String })
  dragHandle: string;

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
      .filter((ele) => ele.classList.contains('sortable'));
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

      // dim the original element while dragging
      this.downEle.style.pointerEvents = 'none';
      this.downEle.style.opacity = '0.5';

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

      // this.downEle = null;

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
        const originalDragIdx = this.getRowIndex(this.draggingEle.id);

        // Calculate the intended drop index
        let dropIdx = targetIdx;
        if (insertAfter) {
          dropIdx += 1;
        }

        // Adjust dropIdx if dragging forward in the list
        if (originalDragIdx < dropIdx) {
          dropIdx -= 1;
        }

        // Store pending drop info but don't fire event yet
        this.dropTargetId = targetElement.id;
        this.pendingDropIndex = dropIdx;
        this.pendingTargetElement = targetElement;

        // Show drop indicator
        this.showDropIndicator(targetElement, insertAfter);
      } else {
        this.hideDropIndicator();
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

      // restore visibility of the dragged item

      if (this.downEle) {
        this.downEle.style.pointerEvents = '';
        this.downEle.style.opacity = '1';
      }

      // fire the order changed event only when dropped if we have a valid drop position
      if (this.pendingDropIndex >= 0 && this.pendingTargetElement) {
        const originalDragIdx = this.getRowIndex(this.draggingEle.id);

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
      this.pendingDropIndex = -1;
      this.pendingTargetElement = null;

      if (this.ghostElement) {
        // Remove from body if present
        if (this.ghostElement.parentNode) {
          this.ghostElement.parentNode.removeChild(this.ghostElement);
        }
        this.ghostElement = null;
      }

      this.hideDropIndicator();

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
      <div class="container ${this.horizontal ? 'horizontal' : ''}">
        <slot @mousedown=${this.handleMouseDown}></slot>
      </div>
    `;
  }
}
