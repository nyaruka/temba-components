import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { CustomEventType } from '../interfaces';
import { RapidElement } from '../RapidElement';

/**
 * A simple list that can be sorted by dragging
 */

// how far we have to drag before it starts
const DRAG_THRESHOLD = 2;
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

    // Copy dimensions from the original element (before it was hidden)
    if (this.originalElementRect) {
      const rect = this.originalElementRect;
      this.dropPlaceholder.style.width = rect.width + 'px';
      this.dropPlaceholder.style.height = rect.height + 'px';
      this.dropPlaceholder.style.minHeight = rect.height + 'px';
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

  private showInitialPlaceholder() {
    if (!this.downEle || !this.originalElementRect) return;

    this.dropPlaceholder = document.createElement('div');
    this.dropPlaceholder.className = 'drop-placeholder sortable';

    // Copy dimensions from the original element
    const rect = this.originalElementRect;
    this.dropPlaceholder.style.width = rect.width + 'px';
    this.dropPlaceholder.style.height = rect.height + 'px';
    this.dropPlaceholder.style.minHeight = rect.height + 'px';
    this.dropPlaceholder.style.borderRadius = 'var(--curvature)';
    this.dropPlaceholder.style.flexShrink = '0';
    this.dropPlaceholder.style.background =
      'rgba(var(--color-primary-rgb), 0.1)';
    this.dropPlaceholder.style.border =
      '2px dashed rgba(var(--color-primary-rgb), 0.3)';

    // Insert the placeholder right after the hidden original element
    this.downEle.insertAdjacentElement('afterend', this.dropPlaceholder);
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

      // Use the stored original dimensions for positioning
      const rect = this.originalElementRect;

      this.ghostElement.style.position = 'fixed';
      this.ghostElement.style.left = event.clientX - this.xOffset + 'px';
      this.ghostElement.style.top = event.clientY - this.yOffset + 'px';
      this.ghostElement.style.width = rect.width + 'px';
      this.ghostElement.style.height = rect.height + 'px';
      this.ghostElement.style.zIndex = '99999';
      this.ghostElement.style.opacity = '0.8';
      this.ghostElement.style.transform = 'scale(1.03)';

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
          // Target is before the original drag position - moving backward
          dropIdx = insertAfter ? targetIdx + 1 : targetIdx;
        } else {
          // Target was originally after the drag position - moving forward
          // When moving the dragged element forward (i.e., to a higher index), the targetIdx is based on the current DOM,
          // which no longer includes the dragged element. This means all elements after the original position have shifted left by one,
          // so we need to subtract 1 from targetIdx to get the correct insertion index. If inserting after the target, we use targetIdx as is.
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
    }
  }

  private handleMouseUp(evt: MouseEvent) {
    if (this.draggingId && this.ghostElement) {
      evt.preventDefault();
      evt.stopPropagation();

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
      if (this.pendingDropIndex >= 0 && this.pendingTargetElement) {
        // Use the original drag index we captured before hiding the element
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
      this.originalElementRect = null;
      this.originalDragIndex = -1;
      this.pendingDropIndex = -1;
      this.pendingTargetElement = null;

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
