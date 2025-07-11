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

interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface ItemLayout {
  uuid: string;
  type: 'node' | 'sticky';
  position: FlowPosition;
  boundingBox: BoundingBox;
}

const SAVE_QUIET_TIME = 500;

export interface DraggableItem {
  uuid: string;
  position: FlowPosition;
  element: HTMLElement;
  type: 'node' | 'sticky';
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

  // Bound event handlers to maintain proper 'this' context
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);

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
        display: inline-block;
        width: 100%;
      }

      #canvas {
        position: relative;
        padding: 20px;
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
  }

  private setupGlobalEventListeners(): void {
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
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

  private getBoundingBox(uuid: string, type: 'node' | 'sticky', position?: FlowPosition): BoundingBox {
    const pos = position || this.getPosition(uuid, type);
    if (!pos) {
      return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }

    let width = 200; // Default width for both nodes and stickies
    let height = 100; // Default height

    // Try to get actual dimensions from DOM element
    const element = this.querySelector(`[uuid="${uuid}"]`) as HTMLElement;
    if (element) {
      const rect = element.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    } else {
      // Use estimated dimensions if element not found
      if (type === 'sticky') {
        width = 200;
        height = 100; // Estimated minimum height for sticky notes
      } else {
        width = 200;
        height = 80; // Estimated minimum height for nodes
      }
    }

    return {
      left: pos.left,
      top: pos.top,
      right: pos.left + width,
      bottom: pos.top + height,
      width,
      height
    };
  }

  private hasCollision(box1: BoundingBox, box2: BoundingBox): boolean {
    return !(
      box1.right <= box2.left ||
      box1.left >= box2.right ||
      box1.bottom <= box2.top ||
      box1.top >= box2.bottom
    );
  }

  private getAllItems(): ItemLayout[] {
    const items: ItemLayout[] = [];

    // Add all nodes
    if (this.definition?.nodes) {
      this.definition.nodes.forEach((node) => {
        const position = this.definition._ui.nodes[node.uuid]?.position;
        if (position) {
          items.push({
            uuid: node.uuid,
            type: 'node',
            position,
            boundingBox: this.getBoundingBox(node.uuid, 'node', position)
          });
        }
      });
    }

    // Add all sticky notes
    const stickies = this.definition?._ui?.stickies || {};
    Object.entries(stickies).forEach(([uuid, sticky]) => {
      if (sticky.position) {
        items.push({
          uuid,
          type: 'sticky',
          position: sticky.position,
          boundingBox: this.getBoundingBox(uuid, 'sticky', sticky.position)
        });
      }
    });

    return items;
  }

  private findCollisions(targetItem: ItemLayout, allItems: ItemLayout[]): ItemLayout[] {
    return allItems.filter(
      (item) =>
        item.uuid !== targetItem.uuid &&
        this.hasCollision(targetItem.boundingBox, item.boundingBox)
    );
  }

  private autoLayoutResolveCollisions(droppedItem: ItemLayout): Map<string, FlowPosition> {
    const allItems = this.getAllItems();
    const moves = new Map<string, FlowPosition>();
    
    // Update the dropped item in the items list
    const droppedIndex = allItems.findIndex(item => item.uuid === droppedItem.uuid);
    if (droppedIndex >= 0) {
      allItems[droppedIndex] = droppedItem;
    } else {
      allItems.push(droppedItem);
    }

    // Find initial collisions
    const collisions = this.findCollisions(droppedItem, allItems);
    if (collisions.length === 0) {
      return moves; // No collisions, nothing to do
    }

    // Process collisions in order (left to right, top to bottom)
    const sortedCollisions = collisions.sort((a, b) => {
      if (Math.abs(a.position.top - b.position.top) < 20) {
        return a.position.left - b.position.left;
      }
      return a.position.top - b.position.top;
    });

    // Resolve each collision
    for (const collidingItem of sortedCollisions) {
      const resolvedPosition = this.findBestPosition(collidingItem, droppedItem, allItems);
      if (resolvedPosition) {
        moves.set(collidingItem.uuid, resolvedPosition);
        
        // Update the item's position in our tracking
        const itemIndex = allItems.findIndex(item => item.uuid === collidingItem.uuid);
        if (itemIndex >= 0) {
          allItems[itemIndex].position = resolvedPosition;
          allItems[itemIndex].boundingBox = this.getBoundingBox(
            collidingItem.uuid,
            collidingItem.type,
            resolvedPosition
          );
        }

        // Check for new collisions created by this move
        const newCollisions = this.findCollisions(allItems[itemIndex], allItems);
        for (const newCollision of newCollisions) {
          if (!moves.has(newCollision.uuid) && newCollision.uuid !== droppedItem.uuid) {
            const cascadePosition = this.findBestPosition(newCollision, allItems[itemIndex], allItems);
            if (cascadePosition) {
              moves.set(newCollision.uuid, cascadePosition);
              
              // Update position in tracking
              const cascadeIndex = allItems.findIndex(item => item.uuid === newCollision.uuid);
              if (cascadeIndex >= 0) {
                allItems[cascadeIndex].position = cascadePosition;
                allItems[cascadeIndex].boundingBox = this.getBoundingBox(
                  newCollision.uuid,
                  newCollision.type,
                  cascadePosition
                );
              }
            }
          }
        }
      }
    }

    return moves;
  }

  private findBestPosition(
    itemToMove: ItemLayout,
    blockingItem: ItemLayout,
    allItems: ItemLayout[]
  ): FlowPosition | null {
    const itemBox = itemToMove.boundingBox;
    const blockingBox = blockingItem.boundingBox;

    // Calculate potential positions (right and down only)
    const candidatePositions: FlowPosition[] = [];

    // Position to the right of blocking item
    const rightPosition = {
      left: snapToGrid(blockingBox.right + 20), // 20px spacing
      top: snapToGrid(itemToMove.position.top)
    };
    candidatePositions.push(rightPosition);

    // Position below blocking item
    const belowPosition = {
      left: snapToGrid(itemToMove.position.left),
      top: snapToGrid(blockingBox.bottom + 20) // 20px spacing
    };
    candidatePositions.push(belowPosition);

    // Position diagonally (right and down)
    const diagonalPosition = {
      left: snapToGrid(blockingBox.right + 20),
      top: snapToGrid(blockingBox.bottom + 20)
    };
    candidatePositions.push(diagonalPosition);

    // Test each candidate position
    for (const candidate of candidatePositions) {
      const candidateBox = this.getBoundingBox(itemToMove.uuid, itemToMove.type, candidate);
      
      // Check if this position creates any new collisions (excluding the item being moved)
      const hasNewCollision = allItems.some(item => 
        item.uuid !== itemToMove.uuid && 
        this.hasCollision(candidateBox, item.boundingBox)
      );

      if (!hasNewCollision) {
        return candidate;
      }
    }

    // If no clean position found, use the one that moves the least distance
    // Calculate distances and prefer right over down to preserve layout flow
    const rightDistance = Math.abs(rightPosition.left - itemToMove.position.left);
    const belowDistance = Math.abs(belowPosition.top - itemToMove.position.top);
    
    if (rightDistance <= belowDistance) {
      return rightPosition;
    } else {
      return belowPosition;
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

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isMouseDown || !this.currentDragItem) return;

    const deltaX = event.clientX - this.dragStartPos.x;
    const deltaY = event.clientY - this.dragStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Only start dragging if we've moved beyond the threshold
    if (!this.isDragging && distance > DRAG_THRESHOLD) {
      this.isDragging = true;

      // If this is a node, elevate connections
      if (this.currentDragItem.type === 'node' && this.plumber) {
        this.plumber.elevateNodeConnections(this.currentDragItem.uuid);
      }
    }

    // If we're actually dragging, update positions
    if (this.isDragging) {
      const newLeft = this.startPos.left + deltaX;
      const newTop = this.startPos.top + deltaY;

      // Update the visual position during drag
      this.currentDragItem.element.style.left = `${newLeft}px`;
      this.currentDragItem.element.style.top = `${newTop}px`;

      // Repaint connections if this is a node
      if (this.currentDragItem.type === 'node' && this.plumber) {
        this.plumber.repaintEverything();
      }
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isMouseDown || !this.currentDragItem) return;

    // If we were actually dragging, handle the drag end
    if (this.isDragging) {
      // Restore normal z-index for node connections
      if (this.currentDragItem.type === 'node' && this.plumber) {
        this.plumber.restoreNodeConnections(this.currentDragItem.uuid);
      }

      const deltaX = event.clientX - this.dragStartPos.x;
      const deltaY = event.clientY - this.dragStartPos.y;

      const newLeft = this.startPos.left + deltaX;
      const newTop = this.startPos.top + deltaY;

      // Snap to 20px grid for final position
      const snappedLeft = snapToGrid(newLeft);
      const snappedTop = snapToGrid(newTop);

      const newPosition = { left: snappedLeft, top: snappedTop };

      // Create the dropped item layout for collision detection
      const droppedItem: ItemLayout = {
        uuid: this.currentDragItem.uuid,
        type: this.currentDragItem.type,
        position: newPosition,
        boundingBox: this.getBoundingBox(
          this.currentDragItem.uuid,
          this.currentDragItem.type,
          newPosition
        )
      };

      // Check for collisions and auto-layout if needed
      const autoLayoutMoves = this.autoLayoutResolveCollisions(droppedItem);

      // Apply the dropped item's new position
      this.updatePosition(
        this.currentDragItem.uuid,
        this.currentDragItem.type,
        newPosition
      );

      // Apply auto-layout moves for colliding items
      autoLayoutMoves.forEach((position, uuid) => {
        // Determine the type of the item being moved
        let itemType: 'node' | 'sticky' = 'node';
        
        // Check if it's a sticky note
        const stickies = this.definition?._ui?.stickies || {};
        if (stickies[uuid]) {
          itemType = 'sticky';
        }
        
        this.updatePosition(uuid, itemType, position);
      });

      // Update canvas positions for all moved items
      const allMovedPositions: { [uuid: string]: FlowPosition } = {
        [this.currentDragItem.uuid]: newPosition
      };
      
      autoLayoutMoves.forEach((position, uuid) => {
        allMovedPositions[uuid] = position;
      });

      // Update canvas positions for nodes only
      const nodePositions: { [uuid: string]: FlowPosition } = {};
      Object.entries(allMovedPositions).forEach(([uuid, position]) => {
        // Check if this is a node (not a sticky)
        const isNode = this.definition?.nodes?.some(node => node.uuid === uuid);
        if (isNode) {
          nodePositions[uuid] = position;
        }
      });

      if (Object.keys(nodePositions).length > 0) {
        getStore().getState().updateCanvasPositions(nodePositions);
      }

      // Repaint connections if any nodes were moved
      if (this.currentDragItem.type === 'node' && this.plumber) {
        this.plumber.repaintEverything();
      }
    }

    // Reset all drag state
    this.isDragging = false;
    this.isMouseDown = false;
    this.currentDragItem = null;
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

                  return html`<temba-flow-node
                    class="draggable ${dragging ? 'dragging' : ''}"
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
              return html`<temba-sticky-note
                class="draggable ${dragging ? 'dragging' : ''}"
                @mousedown=${this.handleMouseDown.bind(this)}
                style="left:${position.left}px; top:${position.top}px; z-index: ${1000 +
                position.top}"
                uuid=${uuid}
                .data=${sticky}
                .dragging=${dragging}
              ></temba-sticky-note>`;
            })}
          </div>
        </div>
      </div>`;
  }
}
