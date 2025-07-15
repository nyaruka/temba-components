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

// Collision detection and resolution utilities
interface ItemBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface LayoutItem {
  uuid: string;
  type: 'node' | 'sticky';
  position: FlowPosition;
  bounds: ItemBounds;
}

function getItemBounds(item: DraggableItem): ItemBounds {
  const rect = item.element.getBoundingClientRect();
  const position = item.position;

  return {
    left: position.left,
    top: position.top,
    right: position.left + rect.width,
    bottom: position.top + rect.height,
    width: rect.width,
    height: rect.height
  };
}

function getBoundsFromPosition(
  position: FlowPosition,
  width: number,
  height: number
): ItemBounds {
  return {
    left: position.left,
    top: position.top,
    right: position.left + width,
    bottom: position.top + height,
    width,
    height
  };
}

function doRectsOverlap(rect1: ItemBounds, rect2: ItemBounds): boolean {
  return !(
    rect1.right <= rect2.left ||
    rect2.right <= rect1.left ||
    rect1.bottom <= rect2.top ||
    rect2.bottom <= rect1.top
  );
}

function getOverlapAmount(
  rect1: ItemBounds,
  rect2: ItemBounds
): { x: number; y: number } {
  const overlapX = Math.max(
    0,
    Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left)
  );
  const overlapY = Math.max(
    0,
    Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top)
  );
  return { x: overlapX, y: overlapY };
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
        z-index: 50;
      }

      body .plumb-connector.elevated path {
        stroke: var(--color-connectors) !important;
        stroke-width: 3px;
        z-index: 50;
      }

      body .plumb-connector.elevated .plumb-arrow {
        fill: var(--color-connectors);
        stroke: var(--color-connectors);
        stroke-width: 0px;
        margin-top: 6px;
        z-index: 50;
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

      // Resolve any collisions and get the final position
      const collisionResult = this.resolveCollisions(
        this.currentDragItem,
        newPosition
      );

      if (collisionResult.success) {
        // Update the store with the final position
        this.updatePosition(
          this.currentDragItem.uuid,
          this.currentDragItem.type,
          collisionResult.position
        );

        // Update canvas positions for nodes
        if (this.currentDragItem.type === 'node') {
          getStore()
            .getState()
            .updateCanvasPositions({
              [this.currentDragItem.uuid]: collisionResult.position
            });
        }
      } else {
        // Collision resolution failed, revert to original position
        this.currentDragItem.element.style.left = `${this.currentDragItem.position.left}px`;
        this.currentDragItem.element.style.top = `${this.currentDragItem.position.top}px`;
      }

      // Repaint connections if this is a node
      if (this.currentDragItem.type === 'node' && this.plumber) {
        this.plumber.repaintEverything();
      }
    }

    // Reset all drag state
    this.isDragging = false;
    this.isMouseDown = false;
    this.currentDragItem = null;
  }

  private getAllLayoutItems(): LayoutItem[] {
    const items: LayoutItem[] = [];

    if (!this.definition) return items;

    // Add all nodes
    this.definition.nodes.forEach((node) => {
      const ui = this.definition._ui.nodes[node.uuid];
      if (ui && ui.position) {
        const nodeElement = this.querySelector(`[id="${node.uuid}"]`);
        if (nodeElement) {
          const rect = nodeElement.getBoundingClientRect();
          items.push({
            uuid: node.uuid,
            type: 'node',
            position: ui.position,
            bounds: getBoundsFromPosition(ui.position, rect.width, rect.height)
          });
        }
      }
    });

    // Add all sticky notes
    const stickies = this.definition._ui?.stickies || {};
    Object.entries(stickies).forEach(([uuid, sticky]) => {
      if (sticky.position) {
        items.push({
          uuid,
          type: 'sticky',
          position: sticky.position,
          bounds: getBoundsFromPosition(sticky.position, 200, 100) // Sticky note dimensions
        });
      }
    });

    return items;
  }

  private resolveCollisions(
    droppedItem: DraggableItem,
    newPosition: FlowPosition
  ): { position: FlowPosition; success: boolean } {
    const allItems = this.getAllLayoutItems();
    const droppedBounds = getItemBounds(droppedItem);

    // Update dropped item bounds with new position
    const newDroppedBounds = getBoundsFromPosition(
      newPosition,
      droppedBounds.width,
      droppedBounds.height
    );

    // Find all items that collide with the dropped item at its new position
    const collidingItems = allItems.filter(
      (item) =>
        item.uuid !== droppedItem.uuid &&
        doRectsOverlap(newDroppedBounds, item.bounds)
    );

    if (collidingItems.length === 0) {
      return { position: newPosition, success: true }; // No collisions, return original position
    }

    // Create a map to track item movements to prevent infinite recursion
    const itemsToMove = new Map<string, LayoutItem>();
    const finalPositions = new Map<string, FlowPosition>();

    // Add all colliding items to the movement queue
    collidingItems.forEach((item) => {
      itemsToMove.set(item.uuid, item);
    });

    // Process each colliding item
    while (itemsToMove.size > 0) {
      const [currentUuid, currentItem] = itemsToMove.entries().next().value;
      itemsToMove.delete(currentUuid);

      // Calculate the best movement direction for this item
      const bestMovement = this.calculateBestMovement(
        currentItem,
        newDroppedBounds,
        allItems,
        finalPositions
      );

      if (!bestMovement) {
        // If we can't find a valid movement for any item, collision resolution failed
        return { position: droppedItem.position, success: false };
      }

      finalPositions.set(currentUuid, bestMovement);

      // Check if this movement creates new collisions
      const newItemBounds = getBoundsFromPosition(
        bestMovement,
        currentItem.bounds.width,
        currentItem.bounds.height
      );

      // Find any items that would now collide with this moved item
      allItems.forEach((otherItem) => {
        if (
          otherItem.uuid !== currentUuid &&
          otherItem.uuid !== droppedItem.uuid &&
          !finalPositions.has(otherItem.uuid) &&
          !itemsToMove.has(otherItem.uuid) &&
          doRectsOverlap(newItemBounds, otherItem.bounds)
        ) {
          // Add this newly colliding item to the movement queue
          itemsToMove.set(otherItem.uuid, otherItem);
        }
      });
    }

    // Apply all the calculated position updates
    finalPositions.forEach((position, uuid) => {
      const item = allItems.find((item) => item.uuid === uuid);
      if (item) {
        this.updatePosition(uuid, item.type, position);
      }
    });

    return { position: newPosition, success: true };
  }

  private calculateBestMovement(
    item: LayoutItem,
    droppedBounds: ItemBounds,
    allItems: LayoutItem[],
    plannedMoves: Map<string, FlowPosition>
  ): FlowPosition | null {
    const overlap = getOverlapAmount(droppedBounds, item.bounds);

    // Calculate possible movements in order of preference (smallest movement first)
    const movements = [
      { dir: 'right', dx: overlap.x + 20, dy: 0 },
      { dir: 'left', dx: -(overlap.x + 20), dy: 0 },
      { dir: 'down', dx: 0, dy: overlap.y + 20 },
      { dir: 'up', dx: 0, dy: -(overlap.y + 20) }
    ];

    // Sort movements by distance (prefer smaller movements)
    movements.sort((a, b) => {
      const distA = Math.sqrt(a.dx * a.dx + a.dy * a.dy);
      const distB = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
      return distA - distB;
    });

    // Try each movement direction
    for (const movement of movements) {
      const newItemPosition = {
        left: snapToGrid(item.position.left + movement.dx),
        top: snapToGrid(item.position.top + movement.dy)
      };

      // Check if this position is valid (not negative)
      if (newItemPosition.left < 0 || newItemPosition.top < 0) {
        continue;
      }

      // Check if this position would create new collisions
      const newItemBounds = getBoundsFromPosition(
        newItemPosition,
        item.bounds.width,
        item.bounds.height
      );

      let wouldCreateCollision = false;

      // Check against all existing items
      for (const otherItem of allItems) {
        if (otherItem.uuid === item.uuid) continue;

        // Check against current positions or planned moves
        const otherPosition =
          plannedMoves.get(otherItem.uuid) || otherItem.position;
        const otherBounds = getBoundsFromPosition(
          otherPosition,
          otherItem.bounds.width,
          otherItem.bounds.height
        );

        if (doRectsOverlap(newItemBounds, otherBounds)) {
          wouldCreateCollision = true;
          break;
        }
      }

      // Also check collision with the dropped item
      if (
        !wouldCreateCollision &&
        doRectsOverlap(newItemBounds, droppedBounds)
      ) {
        wouldCreateCollision = true;
      }

      if (!wouldCreateCollision) {
        return newItemPosition;
      }
    }

    // If no simple movement works, try moving further away
    for (const movement of movements) {
      const newItemPosition = {
        left: snapToGrid(item.position.left + movement.dx * 2),
        top: snapToGrid(item.position.top + movement.dy * 2)
      };

      if (newItemPosition.left < 0 || newItemPosition.top < 0) {
        continue;
      }

      const newItemBounds = getBoundsFromPosition(
        newItemPosition,
        item.bounds.width,
        item.bounds.height
      );

      let wouldCreateCollision = false;
      for (const otherItem of allItems) {
        if (otherItem.uuid === item.uuid) continue;

        const otherPosition =
          plannedMoves.get(otherItem.uuid) || otherItem.position;
        const otherBounds = getBoundsFromPosition(
          otherPosition,
          otherItem.bounds.width,
          otherItem.bounds.height
        );

        if (
          doRectsOverlap(newItemBounds, otherBounds) ||
          doRectsOverlap(newItemBounds, droppedBounds)
        ) {
          wouldCreateCollision = true;
          break;
        }
      }

      if (!wouldCreateCollision) {
        return newItemPosition;
      }
    }

    // If no movement works, return null to indicate failure
    return null;
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
                    this.definition._ui.nodes[node.uuid]?.position;
                  
                  if (!position) return '';

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
