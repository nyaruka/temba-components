import { html, TemplateResult } from 'lit-html';
import { css, PropertyValueMap, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { FlowDefinition, FlowPosition } from '../store/flow-definition';
import { getStore } from '../store/Store';
import { AppState, fromStore, zustand } from '../store/AppState';
import { RapidElement } from '../RapidElement';

import { Plumber } from './Plumber';
import { EditorNode } from './EditorNode';

export function snapToGrid(value: number): number {
  return Math.round(value / 20) * 20;
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

const DRAG_THRESHOLD = 10;

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

  private canvasMouseDown = false;

  // Bound event handlers to maintain proper 'this' context
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);
  private boundGlobalMouseDown = this.handleGlobalMouseDown.bind(this);
  private boundKeyDown = this.handleKeyDown.bind(this);

  static get styles() {
    return css`
      #editor {
        overflow: scroll;
        flex: 1;
      }

      #grid {
        position: relative;
        background-color: #f9f9f9;
        background-position: 10px 10px;
        background-image: linear-gradient(
            0deg,
            transparent 24%,
            rgba(61, 177, 255, 0.15) 25%,
            rgba(61, 177, 255, 0.15) 26%,
            transparent 27%,
            transparent 74%,
            rgba(61, 177, 255, 0.15) 75%,
            rgba(61, 177, 255, 0.15) 76%,
            transparent 77%,
            transparent
          ),
          linear-gradient(
            90deg,
            transparent 24%,
            rgba(61, 177, 255, 0.15) 25%,
            rgba(61, 177, 255, 0.15) 26%,
            transparent 27%,
            transparent 74%,
            rgba(61, 177, 255, 0.15) 75%,
            rgba(61, 177, 255, 0.15) 76%,
            transparent 77%,
            transparent
          );
        background-size: 40px 40px;
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
        z-index: 10000 !important;
      }

      body .jtk-endpoint {
        width: initial;
        height: initial;
      }

      .jtk-endpoint {
        z-index: 600;
      }

      .plumb-source {
        z-index: 600;
        border: 0px solid var(--color-connectors);
      }

      .plumb-source.connected {
        box-shadow: 0 3px 3px 0px rgba(0, 0, 0, 0.1);
        border-radius: 50%;
      }

      .plumb-source circle {
        fill: tomato;
      }

      .plumb-source.connected circle {
        fill: #fff;
      }

      .plumb-source svg {
        fill: var(--color-connectors) !important;
        stroke: var(--color-connectors);
      }

      .plumb-target {
        margin-top: -6px;
        z-index: 600;
        opacity: 0;
        cursor: pointer;
      }

      body .plumb-connector path {
        stroke: var(--color-connectors) !important;
        stroke-width: 3px;
        z-index: 10;
      }

      body .plumb-connector {
        z-index: 10;
      }

      body .plumb-connector.elevated {
        z-index: 550;
      }

      body .plumb-connector.elevated path {
        stroke: var(--color-connectors) !important;
        stroke-width: 3px;
        z-index: 550;
      }

      body .plumb-connector.elevated .plumb-arrow {
        fill: var(--color-connectors);
        stroke: var(--color-connectors);
        stroke-width: 0px;
        margin-top: 6px;
        z-index: 550;
      }

      body .plumb-connector .plumb-arrow {
        fill: var(--color-connectors);
        stroke: var(--color-connectors);
        stroke-width: 0px;
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
  }

  private setupGlobalEventListeners(): void {
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('mousedown', this.boundGlobalMouseDown);
    document.addEventListener('keydown', this.boundKeyDown);
  }

  private getPosition(uuid: string, type: 'node' | 'sticky'): FlowPosition {
    if (type === 'node') {
      return this.definition._ui.nodes[uuid]?.position;
    } else {
      return this.definition._ui.stickies?.[uuid]?.position;
    }
  }

  private updatePosition(
    uuid: string,
    type: 'node' | 'sticky',
    position: FlowPosition
  ): void {
    if (type === 'node') {
      getStore().getState().updateNodePosition(uuid, position);
    } else {
      const currentSticky = this.definition._ui.stickies?.[uuid];
      if (currentSticky) {
        getStore()
          .getState()
          .updateStickyNote(uuid, {
            ...currentSticky,
            position
          });
      }
    }
  }

  private handleMouseDown(event: MouseEvent): void {
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
    }

    // Add this item to selection if not already selected
    if (!this.selectedItems.has(uuid)) {
      this.selectedItems.add(uuid);
    }

    // Set up potential drag state, but don't start dragging yet
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
    // Clear current selection
    this.selectedItems.clear();

    // Start selection box
    this.canvasMouseDown = true;
    this.dragStartPos = { x: event.clientX, y: event.clientY };

    const canvasRect = this.querySelector('#canvas')?.getBoundingClientRect();
    if (canvasRect) {
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
    const dialog = document.createElement('temba-dialog');
    dialog.header = 'Delete Items';
    dialog.primaryButtonName = 'Delete';
    dialog.cancelButtonName = 'Cancel';
    dialog.destructive = true;
    dialog.innerHTML = `<div style="padding: 20px;">Are you sure you want to delete ${itemCount} ${itemType}?</div>`;
    
    dialog.addEventListener('temba-button-clicked', (event: any) => {
      if (event.detail.button.name === 'Delete') {
        this.deleteSelectedItems();
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

  private deleteSelectedItems(): void {
    const store = getStore();

    // Separate nodes and stickies
    const nodeUuids: string[] = [];
    const stickyUuids: string[] = [];

    this.selectedItems.forEach((uuid) => {
      // Check if it's a node or sticky by looking at the definition
      if (this.definition.nodes.find((node) => node.uuid === uuid)) {
        nodeUuids.push(uuid);
      } else if (this.definition._ui?.stickies?.[uuid]) {
        stickyUuids.push(uuid);
      }
    });

    // Clean up jsPlumb connections for nodes before removing them
    if (nodeUuids.length > 0 && this.plumber) {
      nodeUuids.forEach((uuid) => {
        this.plumber.removeNodeConnections(uuid);
      });
      
      // Remove nodes using the existing method
      store.getState().removeNodes(nodeUuids);
    }

    // Remove sticky notes more efficiently by doing a single update
    if (stickyUuids.length > 0) {
      const newDefinition = { ...this.definition };
      if (newDefinition._ui?.stickies) {
        stickyUuids.forEach((uuid) => {
          delete newDefinition._ui.stickies[uuid];
        });
        
        store.getState().setFlowContents({
          definition: newDefinition,
          info: store.getState().flowInfo
        });
      }
    }

    // Clear selection
    this.selectedItems.clear();
    this.requestUpdate();
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
      const nodeElement = this.querySelector(`[uuid="${node.uuid}"]`);
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
        const stickyLeft = sticky.position.left;
        const stickyTop = sticky.position.top;
        const stickyRight = stickyLeft + 200; // Sticky note width
        const stickyBottom = stickyTop + 100; // Sticky note height

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

    // Handle item dragging
    if (!this.isMouseDown || !this.currentDragItem) return;

    const deltaX = event.clientX - this.dragStartPos.x;
    const deltaY = event.clientY - this.dragStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Only start dragging if we've moved beyond the threshold
    if (!this.isDragging && distance > DRAG_THRESHOLD) {
      this.isDragging = true;

      // If this is a node, elevate connections for all selected nodes
      this.selectedItems.forEach((uuid) => {
        if (
          this.definition.nodes.find((node) => node.uuid === uuid) &&
          this.plumber
        ) {
          this.plumber.elevateNodeConnections(uuid);
        }
      });
    }

    // If we're actually dragging, update positions for all selected items
    if (this.isDragging) {
      this.selectedItems.forEach((uuid) => {
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
          }
        }
      });

      // Repaint connections for all selected nodes
      this.selectedItems.forEach((uuid) => {
        if (
          this.definition.nodes.find((node) => node.uuid === uuid) &&
          this.plumber
        ) {
          this.plumber.repaintEverything();
        }
      });
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

    // If we were actually dragging, handle the drag end for all selected items
    if (this.isDragging) {
      // Restore normal z-index for node connections
      this.selectedItems.forEach((uuid) => {
        if (
          this.definition.nodes.find((node) => node.uuid === uuid) &&
          this.plumber
        ) {
          this.plumber.restoreNodeConnections(uuid);
        }
      });

      const deltaX = event.clientX - this.dragStartPos.x;
      const deltaY = event.clientY - this.dragStartPos.y;

      // Update positions for all selected items
      const newPositions: { [uuid: string]: FlowPosition } = {};

      this.selectedItems.forEach((uuid) => {
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

          // Update the store with the new snapped position
          this.updatePosition(uuid, type, newPosition);
        }
      });

      // Update canvas positions for nodes
      const nodePositions: { [uuid: string]: FlowPosition } = {};
      this.selectedItems.forEach((uuid) => {
        if (this.definition.nodes.find((node) => node.uuid === uuid)) {
          nodePositions[uuid] = newPositions[uuid];
        }
      });

      if (Object.keys(nodePositions).length > 0) {
        getStore().getState().updateCanvasPositions(nodePositions);
      }

      // Repaint connections for all selected nodes
      this.selectedItems.forEach((uuid) => {
        if (
          this.definition.nodes.find((node) => node.uuid === uuid) &&
          this.plumber
        ) {
          this.plumber.repaintEverything();
        }
      });

      // Clear selection after dragging
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
    Object.values(stickies).forEach((sticky) => {
      if (sticky.position) {
        maxWidth = Math.max(maxWidth, sticky.position.left + 200); // Sticky note width
        maxHeight = Math.max(maxHeight, sticky.position.top + 100); // Sticky note height
      }
    });

    // Update canvas size in store
    store.getState().expandCanvas(maxWidth, maxHeight);
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
              ? this.definition.nodes.map((node) => {
                  const position =
                    this.definition._ui.nodes[node.uuid].position;

                  const dragging =
                    this.isDragging && this.currentDragItem?.uuid === node.uuid;

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
                  ></temba-flow-node>`;
                })
              : html`<temba-loading></temba-loading>`}
            ${Object.entries(stickies).map(([uuid, sticky]) => {
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
            })}
            ${this.renderSelectionBox()}
          </div>
        </div>
      </div>`;
  }
}
