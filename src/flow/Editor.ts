import { html, TemplateResult } from 'lit-html';
import { css, PropertyValueMap, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { FlowDefinition, FlowPosition, Action } from '../store/flow-definition';
import { getStore } from '../store/Store';
import { AppState, fromStore, zustand } from '../store/AppState';
import { RapidElement } from '../RapidElement';
import { repeat } from 'lit-html/directives/repeat.js';
import { CustomEventType } from '../interfaces';

import { Plumber } from './Plumber';
import { EditorNode } from './EditorNode';
import { Dialog } from '../layout/Dialog';
import { Connection } from '@jsplumb/browser-ui';

export function snapToGrid(value: number): number {
  const snapped = Math.round(value / 20) * 20;
  return Math.max(snapped, 0);
}

export function findNodeForExit(
  definition: FlowDefinition,
  exitUuid: string
): string | null {
  for (const node of definition.nodes) {
    const exit = node.exits.find((e) => e.uuid === exitUuid);
    if (exit) {
      return node.uuid;
    }
  }
  return null;
}

const SAVE_QUIET_TIME = 500;

export interface DraggableItem {
  uuid: string;
  position: FlowPosition;
  element: HTMLElement;
  type: 'node' | 'sticky';
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const DRAG_THRESHOLD = 5;

export class Editor extends RapidElement {
  // unfortunately, jsplumb requires that we be in light DOM
  createRenderRoot() {
    return this;
  }

  // this is the master plumber
  private plumber: Plumber;

  // timer for debounced saving
  private saveTimer: number | null = null;

  @property({ type: String })
  public flow: string;

  @property({ type: String })
  public version: string;

  @fromStore(zustand, (state: AppState) => state.flowDefinition)
  private definition!: FlowDefinition;

  @fromStore(zustand, (state: AppState) => state.canvasSize)
  private canvasSize!: { width: number; height: number };

  @fromStore(zustand, (state: AppState) => state.dirtyDate)
  private dirtyDate!: Date;

  // Drag state
  @state()
  private isDragging = false;
  private isMouseDown = false;
  private dragStartPos = { x: 0, y: 0 };

  // Public getter for drag state
  public get dragging(): boolean {
    return this.isDragging;
  }

  @state()
  private currentDragItem: DraggableItem | null = null;
  private startPos = { left: 0, top: 0 };

  // Selection state
  @state()
  private selectedItems: Set<string> = new Set();

  @state()
  private isSelecting = false;

  @state()
  private selectionBox: SelectionBox | null = null;

  @state()
  private targetId: string | null = null;

  @state()
  private sourceId: string | null = null;

  @state()
  private dragFromNodeId: string | null = null;

  @state()
  private isValidTarget = true;

  // Action editor state
  @state()
  private editingAction: Action | null = null;

  @state()
  private editingNodeUuid: string | null = null;

  private canvasMouseDown = false;

  // Bound event handlers to maintain proper 'this' context
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);
  private boundGlobalMouseDown = this.handleGlobalMouseDown.bind(this);
  private boundKeyDown = this.handleKeyDown.bind(this);
  private boundCanvasDoubleClick = this.handleCanvasDoubleClick.bind(this);

  static get styles() {
    return css`
      #editor {
        overflow: scroll;
        flex: 1;
      }

      #grid {
        position: relative;
        background-color: #f9f9f9;
        background-image: radial-gradient(
          circle,
          rgba(61, 177, 255, 0.3) 1px,
          transparent 1px
        );
        background-size: 20px 20px;
        background-position: 10px 10px;
        box-shadow: inset -5px 0 10px rgba(0, 0, 0, 0.05);
        border-top: 1px solid #e0e0e0;
        width: 100%;
        display: flex;
      }

      #canvas {
        position: relative;
        padding: 0px;
        flex-grow: 1;
        margin: 20px;
      }

      #canvas > .draggable {
        position: absolute;
        z-index: 100;
      }

      #canvas > .dragging {
        z-index: 99999 !important;
      }

      body .jtk-endpoint {
        width: initial;
        height: initial;
      }

      .jtk-endpoint {
        z-index: 600;
        opacity: 0;
      }

      .plumb-source {
        z-index: 600;
        cursor: pointer;
        opacity: 0;
      }

      .plumb-source.connected {
        border-radius: 50%;
        pointer-events: none;
      }

      .plumb-source circle {
        fill: purple;
      }

      .plumb-target {
        z-index: 600;
        opacity: 0;
        cursor: pointer;
        fill: transparent;
      }

      body svg.jtk-connector.plumb-connector path {
        stroke: var(--color-connectors) !important;
        stroke-width: 3px;
      }

      body .plumb-connector {
        z-index: 10 !important;
      }

      body .plumb-connector .plumb-arrow {
        fill: var(--color-connectors);
        stroke: var(--color-connectors);
        stroke-width: 0px !important;
        margin-top: 6px;
        z-index: 10;
      }

      body svg.jtk-connector.jtk-hover path {
        stroke: var(--color-success) !important;
        stroke-width: 3px;
      }

      body .plumb-connector.jtk-hover .plumb-arrow {
        fill: var(--color-success) !important;
        stroke-width: 0px;
        z-index: 10;
      }

      /* Connection dragging feedback */
      body svg.jtk-connector.jtk-dragging {
        z-index: 99999 !important;
      }

      .katavorio-drag-no-select svg.jtk-connector path,
      .katavorio-drag-no-select svg.jtk-endpoint path {
        pointer-events: none !important;
        border: 1px solid purple;
      }

      /* Connection target feedback */
      temba-flow-node.connection-target-valid {
        outline: 3px solid var(--color-success, #22c55e) !important;
        outline-offset: 2px;
        border-radius: var(--curvature);
      }

      temba-flow-node.connection-target-invalid {
        outline: 3px solid var(--color-error, #ef4444) !important;
        outline-offset: 2px;
        border-radius: var(--curvature);
      }

      /* Selection box styles */
      .selection-box {
        position: absolute;
        border: 2px dashed #6298f0ff;
        background-color: rgba(59, 130, 246, 0.1);
        z-index: 9999;
        pointer-events: none;
      }

      /* Selected item styles */
      .draggable.selected {
        outline: 3px solid #6298f0ff;
        outline-offset: 0px;
        border-radius: var(--curvature);
      }

      .jtk-floating-endpoint {
        pointer-events: none;
      }
    `;
  }

  constructor() {
    super();
  }

  protected firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
    this.plumber = new Plumber(this.querySelector('#canvas'));
    this.setupGlobalEventListeners();
    if (changes.has('flow')) {
      getStore().getState().fetchRevision(`/flow/revisions/${this.flow}`);
    }

    this.plumber.on('connection:drag', (info: Connection) => {
      this.dragFromNodeId = document
        .getElementById(info.sourceId)
        .closest('.node').id;
      this.sourceId = info.sourceId;
    });

    this.plumber.on('connection:abort', () => {
      this.makeConnection();
    });

    this.plumber.on('connection:detach', () => {
      this.makeConnection();
    });
  }

  private makeConnection() {
    if (this.sourceId && this.targetId && this.isValidTarget) {
      this.plumber.connectIds(
        this.dragFromNodeId,
        this.sourceId,
        this.targetId
      );
      getStore()
        .getState()
        .updateConnection(this.dragFromNodeId, this.sourceId, this.targetId);

      setTimeout(() => {
        this.plumber.repaintEverything();
      }, 100);
    }

    // Clean up visual feedback
    document.querySelectorAll('temba-flow-node').forEach((node) => {
      node.classList.remove(
        'connection-target-valid',
        'connection-target-invalid'
      );
    });

    this.sourceId = null;
    this.targetId = null;
    this.dragFromNodeId = null;
    this.isValidTarget = true;
  }

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);
    if (changes.has('canvasSize')) {
      // console.log('Setting canvas size', this.canvasSize);
    }

    if (changes.has('definition')) {
      this.updateCanvasSize();
    }

    if (changes.has('dirtyDate')) {
      if (this.dirtyDate) {
        this.debouncedSave();
      }
    }
  }

  private debouncedSave(): void {
    // Clear any existing timer
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = window.setTimeout(() => {
      const now = new Date();
      const timeSinceLastChange = now.getTime() - this.dirtyDate.getTime();

      if (timeSinceLastChange >= SAVE_QUIET_TIME) {
        this.saveChanges();
        this.saveTimer = null;
      } else {
        this.debouncedSave();
      }
    }, SAVE_QUIET_TIME);
  }

  private saveChanges(): void {
    // post the flow definition to the server
    getStore().postJSON(`/flow/revisions/${this.flow}`, this.definition);
    getStore().getState().setDirtyDate(null);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    document.removeEventListener('mousedown', this.boundGlobalMouseDown);
    document.removeEventListener('keydown', this.boundKeyDown);

    const canvas = this.querySelector('#canvas');
    if (canvas) {
      canvas.removeEventListener('dblclick', this.boundCanvasDoubleClick);
    }
  }

  private setupGlobalEventListeners(): void {
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('mousedown', this.boundGlobalMouseDown);
    document.addEventListener('keydown', this.boundKeyDown);

    const canvas = this.querySelector('#canvas');
    if (canvas) {
      canvas.addEventListener('dblclick', this.boundCanvasDoubleClick);
    }

    // Listen for action edit requests from flow nodes
    this.addEventListener(
      CustomEventType.ActionEditRequested,
      this.handleActionEditRequested.bind(this)
    );
  }

  private getPosition(uuid: string, type: 'node' | 'sticky'): FlowPosition {
    if (type === 'node') {
      return this.definition._ui.nodes[uuid]?.position;
    } else {
      return this.definition._ui.stickies?.[uuid]?.position;
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    // ignore right clicks
    if (event.button !== 0) return;

    const element = event.currentTarget as HTMLElement;
    // Only start dragging if clicking on the element itself, not on exits or other interactive elements
    const target = event.target as HTMLElement;
    if (target.classList.contains('exit') || target.closest('.exit')) {
      return;
    }

    const uuid = element.getAttribute('uuid');
    const type = element.tagName === 'TEMBA-FLOW-NODE' ? 'node' : 'sticky';

    const position = this.getPosition(uuid, type);
    if (!position) return;

    // If clicking on a non-selected item, clear selection unless Ctrl/Cmd is held
    if (!this.selectedItems.has(uuid) && !event.ctrlKey && !event.metaKey) {
      this.selectedItems.clear();
      // Don't add single items to selection - single clicks just clear existing selection
    } else if (!this.selectedItems.has(uuid)) {
      // Add this item to selection only if Ctrl/Cmd is held
      this.selectedItems.add(uuid);
    }

    // Always set up drag state regardless of selection status
    // This allows single nodes to be dragged without being selected
    this.isMouseDown = true;
    this.dragStartPos = { x: event.clientX, y: event.clientY };
    this.startPos = { left: position.left, top: position.top };
    this.currentDragItem = {
      uuid,
      position,
      element,
      type
    };

    event.preventDefault();
    event.stopPropagation();
  }

  private handleGlobalMouseDown(event: MouseEvent): void {
    // ignore right clicks
    if (event.button !== 0) return;

    // Check if the click is within our canvas
    const canvasRect = this.querySelector('#grid')?.getBoundingClientRect();

    if (!canvasRect) return;

    const isWithinCanvas =
      event.clientX >= canvasRect.left &&
      event.clientX <= canvasRect.right &&
      event.clientY >= canvasRect.top &&
      event.clientY <= canvasRect.bottom;

    if (!isWithinCanvas) return;

    // Check if we clicked on a draggable item (node or sticky)
    const target = event.target as HTMLElement;
    const clickedOnDraggable = target.closest('.draggable');

    if (clickedOnDraggable) {
      // This is handled by the individual item mousedown handlers
      return;
    }

    // We clicked on empty canvas space, start selection
    this.handleCanvasMouseDown(event);
  }

  private handleCanvasMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.id === 'canvas' || target.id === 'grid') {
      // Ignore clicks on exits

      // Start selection box
      this.canvasMouseDown = true;
      this.dragStartPos = { x: event.clientX, y: event.clientY };

      const canvasRect = this.querySelector('#canvas')?.getBoundingClientRect();
      if (canvasRect) {
        // Clear current selection
        this.selectedItems.clear();

        const relativeX = event.clientX - canvasRect.left;
        const relativeY = event.clientY - canvasRect.top;

        this.selectionBox = {
          startX: relativeX,
          startY: relativeY,
          endX: relativeX,
          endY: relativeY
        };
      }

      event.preventDefault();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedItems.size > 0) {
        this.showDeleteConfirmation();
      }
    }
    if (event.key === 'Escape') {
      this.selectedItems.clear();
      this.requestUpdate();
    }
  }

  private showDeleteConfirmation(): void {
    const itemCount = this.selectedItems.size;
    const itemType = itemCount === 1 ? 'item' : 'items';

    // Create and show confirmation dialog
    const dialog = document.createElement('temba-dialog') as Dialog;
    dialog.header = 'Delete Items';
    dialog.primaryButtonName = 'Delete';
    dialog.cancelButtonName = 'Cancel';
    dialog.destructive = true;
    dialog.innerHTML = `<div style="padding: 20px;">Are you sure you want to delete ${itemCount} ${itemType}?</div>`;

    dialog.addEventListener('temba-button-clicked', (event: any) => {
      if (event.detail.button.name === 'Delete') {
        this.deleteSelectedItems();
        dialog.open = false;
      }
    });

    // Add to document and show
    document.body.appendChild(dialog);
    dialog.open = true;

    // Clean up dialog when closed
    dialog.addEventListener('temba-dialog-hidden', () => {
      document.body.removeChild(dialog);
    });
  }

  private deleteNodes(uuids: string[]): void {
    // Clean up jsPlumb connections for nodes before removing them
    uuids.forEach((uuid) => {
      this.plumber.removeNodeConnections(uuid);
    });

    // Now remove them from the definition
    if (uuids.length > 0 && this.plumber) {
      getStore().getState().removeNodes(uuids);
    }
  }

  private deleteSelectedItems(): void {
    const nodes = Array.from(this.selectedItems).filter((uuid) =>
      this.definition.nodes.some((node) => node.uuid === uuid)
    );
    this.deleteNodes(Array.from(nodes));

    const stickies = Array.from(this.selectedItems).filter(
      (uuid) => this.definition._ui?.stickies?.[uuid]
    );

    getStore().getState().removeStickyNotes(stickies);

    // Clear selection
    this.selectedItems.clear();
  }

  private updateSelectionBox(event: MouseEvent): void {
    if (!this.selectionBox || !this.canvasMouseDown) return;

    const canvasRect = this.querySelector('#canvas')?.getBoundingClientRect();
    if (!canvasRect) return;

    const relativeX = event.clientX - canvasRect.left;
    const relativeY = event.clientY - canvasRect.top;

    this.selectionBox = {
      ...this.selectionBox,
      endX: relativeX,
      endY: relativeY
    };

    // Update selected items based on selection box
    this.updateSelectedItemsFromBox();
  }

  private updateSelectedItemsFromBox(): void {
    if (!this.selectionBox) return;

    const newSelection = new Set<string>();

    const boxLeft = Math.min(this.selectionBox.startX, this.selectionBox.endX);
    const boxTop = Math.min(this.selectionBox.startY, this.selectionBox.endY);
    const boxRight = Math.max(this.selectionBox.startX, this.selectionBox.endX);
    const boxBottom = Math.max(
      this.selectionBox.startY,
      this.selectionBox.endY
    );

    // Check nodes
    this.definition?.nodes.forEach((node) => {
      const nodeElement = this.querySelector(`[id="${node.uuid}"]`);
      if (nodeElement) {
        const position = this.definition._ui.nodes[node.uuid]?.position;
        if (position) {
          const rect = nodeElement.getBoundingClientRect();
          const canvasRect =
            this.querySelector('#canvas')?.getBoundingClientRect();

          if (canvasRect) {
            const nodeLeft = position.left;
            const nodeTop = position.top;
            const nodeRight = nodeLeft + rect.width;
            const nodeBottom = nodeTop + rect.height;

            // Check if selection box intersects with node
            if (
              boxLeft < nodeRight &&
              boxRight > nodeLeft &&
              boxTop < nodeBottom &&
              boxBottom > nodeTop
            ) {
              newSelection.add(node.uuid);
            }
          }
        }
      }
    });

    // Check sticky notes
    const stickies = this.definition?._ui?.stickies || {};
    Object.entries(stickies).forEach(([uuid, sticky]) => {
      if (sticky.position) {
        const stickyElement = this.querySelector(
          `temba-sticky-note[uuid="${uuid}"]`
        ) as HTMLElement;

        if (stickyElement) {
          // Use clientWidth/clientHeight instead of getBoundingClientRect() to get element dimensions
          // This avoids the coordinate system mismatch between viewport and canvas coordinates
          const width = stickyElement.clientWidth;
          const height = stickyElement.clientHeight;

          // Use the canvas coordinates from the sticky's position
          const stickyLeft = sticky.position.left;
          const stickyTop = sticky.position.top;
          const stickyRight = stickyLeft + width;
          const stickyBottom = stickyTop + height;

          // Check if selection box intersects with sticky
          if (
            boxLeft < stickyRight &&
            boxRight > stickyLeft &&
            boxTop < stickyBottom &&
            boxBottom > stickyTop
          ) {
            newSelection.add(uuid);
          }
        }
      }
    });

    this.selectedItems = newSelection;
  }

  private renderSelectionBox(): TemplateResult | string {
    if (!this.selectionBox || !this.isSelecting) return '';

    const left = Math.min(this.selectionBox.startX, this.selectionBox.endX);
    const top = Math.min(this.selectionBox.startY, this.selectionBox.endY);
    const width = Math.abs(this.selectionBox.endX - this.selectionBox.startX);
    const height = Math.abs(this.selectionBox.endY - this.selectionBox.startY);

    return html`<div
      class="selection-box"
      style="left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px;"
    ></div>`;
  }

  private handleMouseMove(event: MouseEvent): void {
    // Handle selection box drawing
    if (this.canvasMouseDown && !this.isMouseDown) {
      this.isSelecting = true;
      this.updateSelectionBox(event);
      this.requestUpdate(); // Force re-render
      return;
    }

    if (this.plumber.connectionDragging) {
      const targetNode = document.querySelector('temba-flow-node:hover');

      // Clear previous target styles
      document.querySelectorAll('temba-flow-node').forEach((node) => {
        node.classList.remove(
          'connection-target-valid',
          'connection-target-invalid'
        );
      });

      if (targetNode) {
        this.targetId = targetNode.getAttribute('uuid');
        // Check if target is different from source node (prevent self-targeting)
        this.isValidTarget = this.targetId !== this.dragFromNodeId;

        // Apply visual feedback based on validity
        if (this.isValidTarget) {
          targetNode.classList.add('connection-target-valid');
        } else {
          targetNode.classList.add('connection-target-invalid');
        }
      } else {
        this.targetId = null;
        this.isValidTarget = true;
      }
    }

    // Handle item dragging
    if (!this.isMouseDown || !this.currentDragItem) return;

    const deltaX = event.clientX - this.dragStartPos.x;
    const deltaY = event.clientY - this.dragStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Only start dragging if we've moved beyond the threshold
    if (!this.isDragging && distance > DRAG_THRESHOLD) {
      this.isDragging = true;
    }

    // If we're actually dragging, update positions
    if (this.isDragging) {
      // Determine what items to move
      const itemsToMove =
        this.selectedItems.has(this.currentDragItem.uuid) &&
        this.selectedItems.size > 1
          ? Array.from(this.selectedItems)
          : [this.currentDragItem.uuid];

      itemsToMove.forEach((uuid) => {
        const element = this.querySelector(`[uuid="${uuid}"]`) as HTMLElement;
        if (element) {
          const type =
            element.tagName === 'TEMBA-FLOW-NODE' ? 'node' : 'sticky';
          const position = this.getPosition(uuid, type);

          if (position) {
            const newLeft = position.left + deltaX;
            const newTop = position.top + deltaY;

            // Update the visual position during drag
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;

            // Add dragging class to ensure highest z-index
            element.classList.add('dragging');
          }
        }
      });

      this.plumber.revalidate(itemsToMove);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    // Handle selection box completion
    if (this.canvasMouseDown && this.isSelecting) {
      this.isSelecting = false;
      this.selectionBox = null;
      this.canvasMouseDown = false;
      this.requestUpdate();
      return;
    }

    // Handle canvas click (clear selection)
    if (this.canvasMouseDown && !this.isSelecting) {
      this.canvasMouseDown = false;
      return;
    }

    // Handle item drag completion
    if (!this.isMouseDown || !this.currentDragItem) return;

    // If we were actually dragging, handle the drag end
    if (this.isDragging) {
      const deltaX = event.clientX - this.dragStartPos.x;
      const deltaY = event.clientY - this.dragStartPos.y;

      // Determine what items were moved
      const itemsToMove =
        this.selectedItems.has(this.currentDragItem.uuid) &&
        this.selectedItems.size > 1
          ? Array.from(this.selectedItems)
          : [this.currentDragItem.uuid];

      // Update positions for all moved items
      const newPositions: { [uuid: string]: FlowPosition } = {};

      itemsToMove.forEach((uuid) => {
        const type = this.definition.nodes.find((node) => node.uuid === uuid)
          ? 'node'
          : 'sticky';
        const position = this.getPosition(uuid, type);

        if (position) {
          const newLeft = position.left + deltaX;
          const newTop = position.top + deltaY;

          // Snap to 20px grid for final position
          const snappedLeft = snapToGrid(newLeft);
          const snappedTop = snapToGrid(newTop);

          const newPosition = { left: snappedLeft, top: snappedTop };
          newPositions[uuid] = newPosition;

          // Remove dragging class
          const element = this.querySelector(`[uuid="${uuid}"]`) as HTMLElement;
          if (element) {
            element.classList.remove('dragging');
            element.style.left = `${snappedLeft}px`;
            element.style.top = `${snappedTop}px`;
          }
        }
      });

      if (Object.keys(newPositions).length > 0) {
        getStore().getState().updateCanvasPositions(newPositions);

        setTimeout(() => {
          this.plumber.repaintEverything();
        }, 0);
      }

      this.selectedItems.clear();
    }

    // Reset all drag state
    this.isDragging = false;
    this.isMouseDown = false;
    this.currentDragItem = null;
    this.canvasMouseDown = false;
  }

  private updateCanvasSize(): void {
    if (!this.definition) return;

    const store = getStore();
    if (!store) return;

    // Calculate required canvas size based on all elements
    let maxWidth = 0;
    let maxHeight = 0;

    // Check node positions
    this.definition.nodes.forEach((node) => {
      const ui = this.definition._ui.nodes[node.uuid];
      if (ui && ui.position) {
        const nodeElement = this.querySelector(`[id="${node.uuid}"]`);
        if (nodeElement) {
          const rect = nodeElement.getBoundingClientRect();
          maxWidth = Math.max(maxWidth, ui.position.left + rect.width);
          maxHeight = Math.max(maxHeight, ui.position.top + rect.height);
        }
      }
    });

    // Check sticky note positions
    const stickies = this.definition._ui?.stickies || {};
    Object.entries(stickies).forEach(([uuid, sticky]) => {
      if (sticky.position) {
        const stickyElement = this.querySelector(
          `temba-sticky-note[uuid="${uuid}"]`
        ) as HTMLElement;
        if (stickyElement) {
          // Use clientWidth/clientHeight instead of getBoundingClientRect() to get element dimensions
          // This avoids the coordinate system mismatch between viewport and canvas coordinates
          const width = stickyElement.clientWidth;
          const height = stickyElement.clientHeight;

          // Both sticky.position and width/height are now in the same coordinate system
          maxWidth = Math.max(maxWidth, sticky.position.left + width);
          maxHeight = Math.max(maxHeight, sticky.position.top + height);
        } else {
          // Fallback to default sizes if element not found
          maxWidth = Math.max(maxWidth, sticky.position.left + 200);
          maxHeight = Math.max(maxHeight, sticky.position.top + 100);
        }
      }
    });

    // Update canvas size in store
    store.getState().expandCanvas(maxWidth, maxHeight);
  }

  private handleCanvasDoubleClick(event: MouseEvent): void {
    // Check if we double-clicked on empty canvas space
    const target = event.target as HTMLElement;
    if (target.id !== 'canvas') {
      return;
    }

    // Get canvas position
    const canvas = this.querySelector('#canvas');
    if (!canvas) {
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const relativeX = event.clientX - canvasRect.left - 10;
    const relativeY = event.clientY - canvasRect.top - 10;

    // Snap position to grid
    const snappedLeft = snapToGrid(relativeX);
    const snappedTop = snapToGrid(relativeY);

    // Create new sticky note
    const store = getStore();
    store.getState().createStickyNote({
      left: snappedLeft,
      top: snappedTop
    });

    event.preventDefault();
    event.stopPropagation();
  }

  private handleActionEditRequested(event: CustomEvent): void {
    this.editingAction = event.detail.action;
    this.editingNodeUuid = event.detail.nodeUuid;
  }

  private handleActionSaved(updatedAction: Action): void {
    if (this.editingNodeUuid && this.editingAction) {
      // Find the node and update the specific action
      const node = this.definition.nodes.find(
        (n) => n.uuid === this.editingNodeUuid
      );
      if (node) {
        const updatedActions = node.actions.map((action) =>
          action.uuid === this.editingAction.uuid ? updatedAction : action
        );
        const updatedNode = { ...node, actions: updatedActions };

        // Update the node in the store
        getStore()?.getState().updateNode(this.editingNodeUuid, updatedNode);

        // Repaint jsplumb connections in case node size changed
        if (this.plumber) {
          // Use requestAnimationFrame to ensure DOM has been updated first
          requestAnimationFrame(() => {
            this.plumber.repaintEverything();
          });
        }
      }
    }
    this.closeActionEditor();
  }

  private closeActionEditor(): void {
    this.editingAction = null;
    this.editingNodeUuid = null;
  }

  private handleActionEditCanceled(): void {
    this.closeActionEditor();
  }

  public render(): TemplateResult {
    // we have to embed our own style since we are in light DOM
    const style = html`<style>
      ${unsafeCSS(Editor.styles.cssText)}
      ${unsafeCSS(EditorNode.styles.cssText)}
    </style>`;

    const stickies = this.definition?._ui?.stickies || {};

    return html`${style}
      <div id="editor">
        <div
          id="grid"
          style="min-width:100%;width:${this.canvasSize.width}px; height:${this
            .canvasSize.height}px"
        >
          <div id="canvas">
            ${this.definition
              ? repeat(
                  this.definition.nodes,
                  (node) => node.uuid,
                  (node) => {
                    const position =
                      this.definition._ui.nodes[node.uuid].position;

                    const dragging =
                      this.isDragging &&
                      this.currentDragItem?.uuid === node.uuid;

                    const selected = this.selectedItems.has(node.uuid);

                    return html`<temba-flow-node
                      class="draggable ${dragging ? 'dragging' : ''} ${selected
                        ? 'selected'
                        : ''}"
                      @mousedown=${this.handleMouseDown.bind(this)}
                      uuid=${node.uuid}
                      style="left:${position.left}px; top:${position.top}px"
                      .plumber=${this.plumber}
                      .node=${node}
                      .ui=${this.definition._ui.nodes[node.uuid]}
                      @temba-node-deleted=${(event) => {
                        this.deleteNodes([event.detail.uuid]);
                      }}
                    ></temba-flow-node>`;
                  }
                )
              : html`<temba-loading></temba-loading>`}
            ${repeat(
              Object.entries(stickies),
              ([uuid]) => uuid,
              ([uuid, sticky]) => {
                const position = sticky.position || { left: 0, top: 0 };
                const dragging =
                  this.isDragging && this.currentDragItem?.uuid === uuid;
                const selected = this.selectedItems.has(uuid);
                return html`<temba-sticky-note
                  class="draggable ${dragging ? 'dragging' : ''} ${selected
                    ? 'selected'
                    : ''}"
                  @mousedown=${this.handleMouseDown.bind(this)}
                  style="left:${position.left}px; top:${position.top}px; z-index: ${1000 +
                  position.top}"
                  uuid=${uuid}
                  .data=${sticky}
                  .dragging=${dragging}
                  .selected=${selected}
                ></temba-sticky-note>`;
              }
            )}
            ${this.renderSelectionBox()}
          </div>
        </div>
      </div>

      ${this.editingAction
        ? html`<temba-action-editor
            .action=${this.editingAction}
            @temba-action-saved=${(e: CustomEvent) =>
              this.handleActionSaved(e.detail.action)}
            @temba-action-edit-canceled=${this.handleActionEditCanceled}
          ></temba-action-editor>`
        : ''} `;
  }
}
