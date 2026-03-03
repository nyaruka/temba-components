import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';

/**
 * A simple list that can be sorted by dragging
 */

// how far we have to drag before it starts
const DRAG_THRESHOLD = 2;

// padding around container for external drag detection
const EXTERNAL_DRAG_PADDING = 50;

export class SortableList extends RapidElement {
  originalDownDisplay: string;
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

      .slot {
        flex-grow: 1;
      }

      slot > * {
        user-select: none;
        touch-action: none;
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

  @property({ type: Boolean })
  externalDrag: boolean = false;

  /**
   * Optional callback to allow parent components to customize the ghost node.
   * Called after the ghost node is cloned but before it is appended to the DOM.
   */
  @property({ attribute: false })
  prepareGhost?: (ghost: HTMLElement) => void;

  ghostElement: HTMLDivElement = null;
  downEle: HTMLDivElement = null;
  originalElementRect: DOMRect = null; // Store viewport dimensions for ghost
  originalLayoutSize: { width: number; height: number } = null; // Store layout dimensions for placeholders
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
  isExternalDrag = false;

  private clickBlocker: ((e: MouseEvent) => void) | null = null;

  public constructor() {
    super();
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
  }

  private getSortableElements(): Element[] {
    const eles = this.shadowRoot
      .querySelector('slot')
      .assignedElements()
      .filter(
        (ele) =>
          ele.classList.contains('sortable') &&
          !ele.classList.contains('drop-placeholder')
      );
    return eles;
  }

  private isMouseOverContainer(mouseX: number, mouseY: number): boolean {
    const container = this.shadowRoot.querySelector('.container');
    if (!container) return false;

    const rect = container.getBoundingClientRect();
    // add some padding to make it easier to stay within the container
    return (
      mouseX >= rect.left - EXTERNAL_DRAG_PADDING &&
      mouseX <= rect.right + EXTERNAL_DRAG_PADDING &&
      mouseY >= rect.top - EXTERNAL_DRAG_PADDING &&
      mouseY <= rect.bottom + EXTERNAL_DRAG_PADDING
    );
  }

  private cloneElementWithState(element: HTMLElement): HTMLElement {
    // First create a basic clone
    const clone = element.cloneNode(true) as HTMLElement;

    // Helper function to copy form element values recursively
    const copyFormValues = (original: HTMLElement, cloned: HTMLElement) => {
      try {
        // Copy input values
        const originalInputs = original.querySelectorAll(
          'input, textarea, select'
        );
        const clonedInputs = cloned.querySelectorAll('input, textarea, select');

        originalInputs.forEach((originalInput, index) => {
          const clonedInput = clonedInputs[index] as
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement;
          if (clonedInput) {
            if (originalInput instanceof HTMLInputElement) {
              const originalHtmlInput = originalInput as HTMLInputElement;
              const clonedHtmlInput = clonedInput as HTMLInputElement;

              if (
                originalHtmlInput.type === 'checkbox' ||
                originalHtmlInput.type === 'radio'
              ) {
                clonedHtmlInput.checked = originalHtmlInput.checked;
              } else {
                clonedHtmlInput.value = originalHtmlInput.value;
              }
            } else if (originalInput instanceof HTMLTextAreaElement) {
              (clonedInput as HTMLTextAreaElement).value = originalInput.value;
            } else if (originalInput instanceof HTMLSelectElement) {
              (clonedInput as HTMLSelectElement).selectedIndex =
                originalInput.selectedIndex;
            }
          }
        });

        // Copy properties from all custom elements that might have a value property
        const allOriginalElements = Array.from(original.querySelectorAll('*'));
        const allClonedElements = Array.from(cloned.querySelectorAll('*'));

        allOriginalElements.forEach((originalEl, index) => {
          const clonedEl = allClonedElements[index];
          if (clonedEl && originalEl) {
            // Special handling for temba components
            if (
              originalEl.tagName &&
              originalEl.tagName.toLowerCase().startsWith('temba-')
            ) {
              try {
                // Copy common temba component properties
                const tembaProps = [
                  'value',
                  'values',
                  'selectedValue',
                  'checked',
                  'selected',
                  'textContent'
                ];
                tembaProps.forEach((prop) => {
                  if (
                    prop in originalEl &&
                    (originalEl as any)[prop] !== undefined
                  ) {
                    (clonedEl as any)[prop] = (originalEl as any)[prop];
                  }
                });

                // Copy all attributes for temba components to preserve state
                Array.from(originalEl.attributes).forEach((attr) => {
                  clonedEl.setAttribute(attr.name, attr.value);
                });
              } catch (e) {
                // Ignore errors when copying temba properties
              }
            } else {
              // Try to copy value property for other elements
              try {
                if (
                  'value' in originalEl &&
                  (originalEl as any).value !== undefined
                ) {
                  (clonedEl as any).value = (originalEl as any).value;
                }
              } catch (e) {
                // Ignore errors when copying properties
              }

              // Copy data attributes that might contain state
              try {
                Array.from(originalEl.attributes).forEach((attr) => {
                  if (
                    attr.name.startsWith('data-') ||
                    attr.name.startsWith('aria-')
                  ) {
                    clonedEl.setAttribute(attr.name, attr.value);
                  }
                });
              } catch (e) {
                // Ignore errors when copying attributes
              }
            }
          }
        });
      } catch (e) {
        // If anything fails, just return the basic clone
        console.warn('Failed to copy form values in cloneElementWithState:', e);
      }
    };

    // Copy form values for the root element and all descendants
    copyFormValues(element, clone);

    return clone;
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

    // Use layout-space dimensions for placeholders (unaffected by ancestor transforms)
    if (this.originalLayoutSize) {
      const size = this.originalLayoutSize;
      this.dropPlaceholder.style.width = size.width + 'px';
      this.dropPlaceholder.style.height = size.height + 'px';
      this.dropPlaceholder.style.minHeight = size.height + 'px';
      this.dropPlaceholder.style.borderRadius = 'var(--curvature)';
      this.dropPlaceholder.style.flexShrink = '0';
      this.dropPlaceholder.style.background = '#f3f4f6';
      this.dropPlaceholder.style.outline = '2px dashed #d1d5db';
      this.dropPlaceholder.style.outlineOffset = '-2px';
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

  private showInitialPlaceholder() {
    if (!this.downEle || !this.originalElementRect) return;

    this.dropPlaceholder = document.createElement('div');
    this.dropPlaceholder.className = 'drop-placeholder sortable';

    // Use layout-space dimensions for placeholders (unaffected by ancestor transforms)
    const size = this.originalLayoutSize;
    this.dropPlaceholder.style.width = size.width + 'px';
    this.dropPlaceholder.style.height = size.height + 'px';
    this.dropPlaceholder.style.minHeight = size.height + 'px';
    this.dropPlaceholder.style.borderRadius = 'var(--curvature)';
    this.dropPlaceholder.style.flexShrink = '0';
    this.dropPlaceholder.style.background = '#f3f4f6';
    this.dropPlaceholder.style.outline = '2px dashed #d1d5db';
    this.dropPlaceholder.style.outlineOffset = '-2px';

    // Insert the placeholder right after the hidden original element
    this.downEle.insertAdjacentElement('afterend', this.dropPlaceholder);
  }

  /**
   * Shared drag-start logic for both mouse and touch.
   * Returns true if a drag target was found and state was initialised.
   */
  private beginDrag(
    target: HTMLElement,
    clientX: number,
    clientY: number
  ): boolean {
    // if we have a drag handle, only allow dragging from that element
    if (this.dragHandle) {
      if (!target.classList.contains(this.dragHandle)) {
        return false;
      }
    }

    const ele = target.closest('.sortable') as HTMLDivElement;
    if (!ele) return false;

    this.downEle = ele;
    this.draggingId = ele.id;
    this.draggingIdx = this.getRowIndex(ele.id);
    this.draggingEle = ele;

    const rect = ele.getBoundingClientRect();
    this.originalElementRect = rect;
    this.originalLayoutSize = {
      width: ele.offsetWidth,
      height: ele.offsetHeight
    };
    this.xOffset = clientX - rect.left;
    this.yOffset = clientY - rect.top;
    this.yDown = clientY;
    this.xDown = clientX;

    return true;
  }

  private handleMouseDown(event: MouseEvent) {
    if (
      this.beginDrag(event.target as HTMLElement, event.clientX, event.clientY)
    ) {
      event.preventDefault();
      event.stopPropagation();
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    }
  }

  private handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;
    if (
      this.beginDrag(event.target as HTMLElement, touch.clientX, touch.clientY)
    ) {
      event.stopPropagation();
      document.addEventListener('touchmove', this.handleTouchMove, {
        passive: false
      });
      document.addEventListener('touchend', this.handleTouchEnd);
      document.addEventListener('touchcancel', this.handleTouchEnd);
    }
  }

  /**
   * Shared drag-move logic for both mouse and touch.
   */
  private processDragMove(clientX: number, clientY: number) {
    if (
      !this.ghostElement &&
      this.downEle &&
      (Math.abs(clientY - this.yDown) > DRAG_THRESHOLD ||
        Math.abs(clientX - this.xDown) > DRAG_THRESHOLD)
    ) {
      this.fireCustomEvent(CustomEventType.DragStart, {
        id: this.downEle.id
      });

      // Capture the original index BEFORE hiding the element
      this.originalDragIndex = this.getRowIndex(this.downEle.id);

      // Create a clone of the element to use as the ghost
      this.ghostElement = this.cloneElementWithState(
        this.downEle
      ) as HTMLDivElement;

      // Hide the original element during dragging using inline styles
      this.originalDownDisplay = this.downEle.style.display;
      this.downEle.style.display = 'none';

      // Style the clone as a ghost
      this.ghostElement.classList.add('ghost');

      // Detect ancestor scale transform (e.g. zoom) by comparing viewport
      // to layout dimensions, so the ghost renders content at the right scale
      const rect = this.originalElementRect;
      const layoutSize = this.originalLayoutSize;
      const ancestorScale =
        layoutSize.width > 0 ? rect.width / layoutSize.width : 1;
      const hasAncestorScale = Math.abs(ancestorScale - 1) > 0.001;

      this.ghostElement.style.position = 'fixed';
      this.ghostElement.style.left = clientX - this.xOffset + 'px';
      this.ghostElement.style.top = clientY - this.yOffset + 'px';
      this.ghostElement.style.zIndex = '99999';
      this.ghostElement.style.opacity = '0.8';

      if (hasAncestorScale) {
        // Use layout dimensions with ancestor scale so content renders correctly
        this.ghostElement.style.width = layoutSize.width + 'px';
        this.ghostElement.style.height = layoutSize.height + 'px';
        this.ghostElement.style.transform = `scale(${ancestorScale * 1.03})`;
        this.ghostElement.style.transformOrigin = '0 0';
      } else {
        this.ghostElement.style.width = rect.width + 'px';
        this.ghostElement.style.height = rect.height + 'px';
        this.ghostElement.style.transform = 'scale(1.03)';
      }

      // allow component to customize the ghost node
      if (this.prepareGhost) {
        this.prepareGhost(this.ghostElement);
      }

      // Add the clone to document.body for dragging
      document.body.appendChild(this.ghostElement);

      // Show initial placeholder in the original position to maintain layout
      this.showInitialPlaceholder();

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
      this.ghostElement.style.left = clientX - this.xOffset + 'px';
      this.ghostElement.style.top = clientY - this.yOffset + 'px';

      // check if the drag is over the container (only if external dragging is allowed)
      const isOverContainer = this.externalDrag
        ? this.isMouseOverContainer(clientX, clientY)
        : true; // always consider "over container" if external drag is disabled

      // detect transition between internal and external drag (only if allowed)
      if (this.externalDrag && !isOverContainer && !this.isExternalDrag) {
        // transitioning to external drag
        this.isExternalDrag = true;
        this.hideDropPlaceholder();

        // hide the ghost element when dragging externally
        if (this.ghostElement) {
          this.ghostElement.style.display = 'none';
        }

        this.fireCustomEvent(CustomEventType.DragExternal, {
          id: this.downEle.id,
          mouseX: clientX,
          mouseY: clientY
        });
      } else if (this.externalDrag && isOverContainer && this.isExternalDrag) {
        // transitioning back to internal drag
        this.isExternalDrag = false;

        // show the ghost element again when dragging internally
        if (this.ghostElement) {
          this.ghostElement.style.display = 'block';
        }

        this.fireCustomEvent(CustomEventType.DragInternal, {
          id: this.downEle.id
        });
      }

      // only show drop placeholder and calculate drop position if internal drag
      if (!this.isExternalDrag) {
        const targetInfo = this.getDropTargetInfo(clientX, clientY);
        if (targetInfo) {
          const { element: targetElement, insertAfter } = targetInfo;
          const targetIdx = this.getRowIndex(targetElement.id);

          // Use the original drag index we captured before moving the element
          const originalDragIdx = this.originalDragIndex;

          // Calculate where the dragged element will end up in the final array
          // targetIdx is the position of target element in current DOM (missing dragged element)

          let dropIdx;
          if (targetIdx < originalDragIdx) {
            // Target is before the original drag position - moving backward
            dropIdx = insertAfter ? targetIdx + 1 : targetIdx;
          } else {
            // Target was originally after the drag position - moving forward
            dropIdx = insertAfter ? targetIdx : targetIdx - 1;
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
      } else {
        // external drag - continue firing external drag events with updated position
        this.fireCustomEvent(CustomEventType.DragExternal, {
          id: this.downEle.id,
          mouseX: clientX,
          mouseY: clientY
        });
      }
    }
  }

  private handleMouseMove(event: MouseEvent) {
    this.processDragMove(event.clientX, event.clientY);
  }

  private handleTouchMove(event: TouchEvent) {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    this.processDragMove(touch.clientX, touch.clientY);
  }

  /**
   * Shared drag-end logic for both mouse and touch.
   */
  private processDragEnd(clientX: number, clientY: number) {
    if (this.draggingId && this.ghostElement) {
      // Remove the ghost clone from document.body
      if (this.ghostElement) {
        this.ghostElement.remove();
      }

      // Restore visibility of the original element by clearing inline styles
      if (this.downEle) {
        this.downEle.style.display = this.originalDownDisplay;
      }

      // Clear visual effects before firing events
      this.hideDropPlaceholder();

      // fire the order changed event only when dropped if we have a valid drop position
      if (
        !this.isExternalDrag &&
        this.pendingDropIndex >= 0 &&
        this.pendingTargetElement
      ) {
        // Use the original drag index we captured before hiding the element
        const originalDragIdx = this.originalDragIndex;

        // use swap-based logic - report which indexes need to be swapped
        const fromIdx = originalDragIdx;
        const toIdx = this.pendingDropIndex;

        // only fire if the position actually changed AND this is not an external drag
        // External drags are handled by external drop handlers
        if (fromIdx !== toIdx && !this.isExternalDrag) {
          this.fireCustomEvent(CustomEventType.OrderChanged, {
            swap: [fromIdx, toIdx]
          });
        }
      }

      this.fireCustomEvent(CustomEventType.DragStop, {
        id: this.draggingId,
        isExternal: this.isExternalDrag,
        mouseX: clientX,
        mouseY: clientY
      });

      this.draggingId = null;
      this.dropTargetId = null;
      this.downEle = null;
      this.originalElementRect = null;
      this.originalDragIndex = -1;
      this.pendingDropIndex = -1;
      this.pendingTargetElement = null;
      this.isExternalDrag = false;

      // Clear the ghost reference since we removed it
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
  }

  private handleMouseUp(evt: MouseEvent) {
    if (this.draggingId && this.ghostElement) {
      evt.preventDefault();
      evt.stopPropagation();
    }
    this.processDragEnd(evt.clientX, evt.clientY);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    this.dispatchEvent(new Event('change'));
  }

  private handleTouchEnd(evt: TouchEvent) {
    const touch = evt.changedTouches[0];
    const clientX = touch?.clientX ?? 0;
    const clientY = touch?.clientY ?? 0;
    this.processDragEnd(clientX, clientY);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('touchcancel', this.handleTouchEnd);
    this.dispatchEvent(new Event('change'));
  }

  public render(): TemplateResult {
    return html`
      <div
        class="container ${this.horizontal ? 'horizontal' : ''}"
        style="gap: ${this.gap}"
      >
        <slot
          @mousedown=${this.handleMouseDown}
          @touchstart=${this.handleTouchStart}
        ></slot>
      </div>
    `;
  }
}
