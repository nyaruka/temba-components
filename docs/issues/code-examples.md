# jsPlumb Replacement - Code Examples

## ConnectionManager Implementation Example

### Basic Structure

```typescript
// src/flow/ConnectionManager.ts

export enum ConnectionEvent {
  CONNECTION_DRAG = 'connection:drag',
  CONNECTION_ABORT = 'connection:abort',
  CONNECTION_DETACHED = 'connection:detach',
  CONNECTION = 'connection',
  REVERT = 'revert'
}

export interface ConnectionInfo {
  sourceId: string;
  targetId?: string;
  source: HTMLElement;
  target?: HTMLElement;
}

interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  scope: string;
  svgGroup: SVGGElement;
  pathElement: SVGPathElement;
  arrowElement: SVGPathElement;
}

export class ConnectionManager {
  private container: HTMLElement;
  private svgContainer: SVGSVGElement;
  private connections: Map<string, Connection> = new Map();
  private sourceElements: Map<string, HTMLElement> = new Map();
  private targetElements: Map<string, HTMLElement> = new Map();
  private eventListeners: Map<string, Array<(info: ConnectionInfo) => void>> = new Map();
  public connectionDragging = false;

  constructor(container: HTMLElement, editor: any) {
    this.container = container;
    this.createSVGContainer();
    this.initializeDragHandler();
  }

  private createSVGContainer(): void {
    this.svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgContainer.style.position = 'absolute';
    this.svgContainer.style.top = '0';
    this.svgContainer.style.left = '0';
    this.svgContainer.style.width = '100%';
    this.svgContainer.style.height = '100%';
    this.svgContainer.style.pointerEvents = 'none';
    this.svgContainer.style.zIndex = '1';
    this.container.appendChild(this.svgContainer);
  }

  public makeSource(elementId: string): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    this.sourceElements.set(elementId, element);
    
    // Add visual endpoint (invisible but functional)
    const endpoint = document.createElement('div');
    endpoint.className = 'plumb-source';
    endpoint.style.cssText = `
      position: absolute;
      bottom: -12px;
      left: 50%;
      transform: translateX(-50%);
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      opacity: 0;
      z-index: 600;
    `;
    
    element.appendChild(endpoint);
    element.dataset.isSource = 'true';
  }

  public makeTarget(elementId: string): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    this.targetElements.set(elementId, element);
    element.dataset.isTarget = 'true';
  }

  public connectIds(scope: string, fromId: string, toId: string): void {
    const connectionId = `${fromId}-${toId}`;
    
    // Remove any existing connection from this source
    this.removeConnectionsFromSource(fromId);

    // Create SVG elements for the connection
    const svgGroup = this.createConnectionSVG(fromId, toId);
    
    const connection: Connection = {
      id: connectionId,
      sourceId: fromId,
      targetId: toId,
      scope,
      svgGroup,
      pathElement: svgGroup.querySelector('path.plumb-connector') as SVGPathElement,
      arrowElement: svgGroup.querySelector('path.plumb-arrow') as SVGPathElement
    };

    this.connections.set(connectionId, connection);
    
    // Update source endpoint to show connected state
    const sourceElement = document.getElementById(fromId);
    if (sourceElement) {
      const endpoint = sourceElement.querySelector('.plumb-source');
      if (endpoint) {
        endpoint.classList.add('connected');
      }
    }

    // Calculate and render the path
    this.updateConnectionPath(connection);
  }

  private createConnectionSVG(fromId: string, toId: string): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'connection');
    group.setAttribute('data-source', fromId);
    group.setAttribute('data-target', toId);

    // Create path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'plumb-connector');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '3');

    // Create arrow element
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrow.setAttribute('class', 'plumb-arrow');

    group.appendChild(path);
    group.appendChild(arrow);
    this.svgContainer.appendChild(group);

    return group;
  }

  private updateConnectionPath(connection: Connection): void {
    const sourceElement = document.getElementById(connection.sourceId);
    const targetElement = document.getElementById(connection.targetId);

    if (!sourceElement || !targetElement) return;

    // Get positions
    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    // Calculate start point (bottom center of exit)
    const startX = sourceRect.left - containerRect.left + sourceRect.width / 2;
    const startY = sourceRect.bottom - containerRect.top;

    // Calculate end point (use continuous anchor logic for target)
    const endPoint = this.calculateBestTargetPoint(targetRect, containerRect, startX, startY);

    // Calculate flowchart path
    const pathData = this.calculateFlowchartPath(
      { x: startX, y: startY },
      endPoint,
      20, // start stub
      10, // end stub
      5   // corner radius
    );

    connection.pathElement.setAttribute('d', pathData);

    // Calculate arrow position and rotation
    const arrowTransform = this.calculateArrowTransform(endPoint, pathData);
    connection.arrowElement.setAttribute('d', 'M 0,0 L -6,-5 L -6,5 Z');
    connection.arrowElement.setAttribute('transform', arrowTransform);
  }

  private calculateBestTargetPoint(
    targetRect: DOMRect,
    containerRect: DOMRect,
    sourceX: number,
    sourceY: number
  ): { x: number; y: number } {
    // Calculate relative position
    const targetCenterX = targetRect.left - containerRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top - containerRect.top + targetRect.height / 2;

    // Check which face is best (top, left, or right)
    const faces = [
      { x: targetCenterX, y: targetRect.top - containerRect.top, face: 'top' },
      { x: targetRect.left - containerRect.left, y: targetCenterY, face: 'left' },
      { x: targetRect.right - containerRect.left, y: targetCenterY, face: 'right' }
    ];

    // Choose face with shortest distance to source
    let bestFace = faces[0];
    let minDist = this.distance(sourceX, sourceY, bestFace.x, bestFace.y);

    for (const face of faces.slice(1)) {
      const dist = this.distance(sourceX, sourceY, face.x, face.y);
      if (dist < minDist) {
        minDist = dist;
        bestFace = face;
      }
    }

    return { x: bestFace.x, y: bestFace.y };
  }

  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  private calculateFlowchartPath(
    start: { x: number; y: number },
    end: { x: number; y: number },
    startStub: number,
    endStub: number,
    cornerRadius: number
  ): string {
    const segments: string[] = [];

    // Start point
    segments.push(`M ${start.x},${start.y}`);

    // Start stub (straight down)
    const stubStart = { x: start.x, y: start.y + startStub };
    segments.push(`L ${stubStart.x},${stubStart.y}`);

    // End stub point (straight line into target)
    const stubEnd = { x: end.x, y: end.y - endStub };

    // Calculate intermediate points for flowchart routing
    const midY = (stubStart.y + stubEnd.y) / 2;

    // Route: down from start → horizontal to target X → down to end
    if (Math.abs(stubStart.x - stubEnd.x) > cornerRadius * 2) {
      // First vertical segment
      const corner1 = { x: stubStart.x, y: midY - cornerRadius };
      segments.push(`L ${corner1.x},${corner1.y}`);

      // First turn (rounded corner)
      const turn1X = stubEnd.x > stubStart.x ? stubStart.x + cornerRadius : stubStart.x - cornerRadius;
      segments.push(`Q ${stubStart.x},${midY} ${turn1X},${midY}`);

      // Horizontal segment
      const corner2X = stubEnd.x > stubStart.x ? stubEnd.x - cornerRadius : stubEnd.x + cornerRadius;
      segments.push(`L ${corner2X},${midY}`);

      // Second turn (rounded corner)
      segments.push(`Q ${stubEnd.x},${midY} ${stubEnd.x},${midY + cornerRadius}`);
    }

    // Final vertical segment to stub end
    segments.push(`L ${stubEnd.x},${stubEnd.y}`);

    // Final segment to target
    segments.push(`L ${end.x},${end.y}`);

    return segments.join(' ');
  }

  private calculateArrowTransform(
    endPoint: { x: number; y: number },
    pathData: string
  ): string {
    // Parse the last segment of the path to determine arrow direction
    // For simplicity, we know connections end pointing up, left, or right
    
    // For now, assume arrows always point to the target center
    // In production, calculate actual tangent at endpoint
    
    return `translate(${endPoint.x}, ${endPoint.y}) rotate(-90)`;
  }

  public removeExitConnection(exitId: string): boolean {
    const connections = this.getConnectionsFromSource(exitId);
    
    if (connections.length === 0) return false;

    connections.forEach(connection => {
      this.svgContainer.removeChild(connection.svgGroup);
      this.connections.delete(connection.id);
    });

    // Update source endpoint
    const sourceElement = document.getElementById(exitId);
    if (sourceElement) {
      const endpoint = sourceElement.querySelector('.plumb-source');
      if (endpoint) {
        endpoint.classList.remove('connected');
      }
    }

    return true;
  }

  public setConnectionRemovingState(exitId: string, isRemoving: boolean): boolean {
    const connections = this.getConnectionsFromSource(exitId);
    
    if (connections.length === 0) return false;

    connections.forEach(connection => {
      if (isRemoving) {
        connection.svgGroup.classList.add('removing');
      } else {
        connection.svgGroup.classList.remove('removing');
      }
    });

    return true;
  }

  private getConnectionsFromSource(sourceId: string): Connection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.sourceId === sourceId
    );
  }

  private removeConnectionsFromSource(sourceId: string): void {
    const connections = this.getConnectionsFromSource(sourceId);
    connections.forEach(conn => {
      this.svgContainer.removeChild(conn.svgGroup);
      this.connections.delete(conn.id);
    });
  }

  public revalidate(elementIds: string[]): void {
    // Update connections for specific elements
    elementIds.forEach(id => {
      // Update connections where this element is source
      const sourceConnections = this.getConnectionsFromSource(id);
      sourceConnections.forEach(conn => this.updateConnectionPath(conn));

      // Update connections where this element is target
      const targetConnections = Array.from(this.connections.values()).filter(
        conn => conn.targetId === id
      );
      targetConnections.forEach(conn => this.updateConnectionPath(conn));
    });
  }

  public repaintEverything(): void {
    this.connections.forEach(connection => {
      this.updateConnectionPath(connection);
    });
  }

  public on(eventName: string, callback: (info: ConnectionInfo) => void): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName)!.push(callback);
  }

  public off(eventName: string, callback: (info: ConnectionInfo) => void): void {
    const listeners = this.eventListeners.get(eventName);
    if (!listeners) return;

    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  private fireEvent(eventName: string, info: ConnectionInfo): void {
    const listeners = this.eventListeners.get(eventName) || [];
    listeners.forEach(listener => listener(info));
  }

  public batch(fn: () => void): void {
    // Batch operations for better performance
    fn();
    // Could add debouncing or RAF here if needed
  }

  private initializeDragHandler(): void {
    // TODO: Initialize ConnectionDragHandler
    // Will be implemented in Phase 4
  }
}
```

## Drag Handler Implementation Example

```typescript
// src/flow/ConnectionDragHandler.ts

export class ConnectionDragHandler {
  private connectionManager: ConnectionManager;
  private container: HTMLElement;
  private isDragging = false;
  private dragSource: HTMLElement | null = null;
  private dragStartPoint: { x: number; y: number } | null = null;
  private tempLine: SVGPathElement | null = null;
  private currentTarget: HTMLElement | null = null;

  constructor(connectionManager: ConnectionManager, container: HTMLElement) {
    this.connectionManager = connectionManager;
    this.container = container;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Use event delegation for efficiency
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Check if clicking on a source endpoint
    const exitElement = target.closest('.exit');
    if (!exitElement || !exitElement.classList.contains('plumb-source')) {
      return;
    }

    this.isDragging = true;
    this.dragSource = exitElement as HTMLElement;
    this.dragStartPoint = { x: event.clientX, y: event.clientY };
    
    this.connectionManager.connectionDragging = true;
    
    // Create temporary drag line
    this.createTempLine();

    // Fire drag start event
    this.connectionManager['fireEvent'](ConnectionEvent.CONNECTION_DRAG, {
      sourceId: this.dragSource.id,
      source: this.dragSource
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.dragSource) return;

    // Update temp line position
    this.updateTempLine(event.clientX, event.clientY);

    // Find target under cursor
    const elements = document.elementsFromPoint(event.clientX, event.clientY);
    const targetNode = elements.find(el => 
      el.classList.contains('node') && el.getAttribute('data-is-target') === 'true'
    );

    // Update target highlighting
    if (targetNode && targetNode !== this.currentTarget) {
      this.clearTargetHighlight();
      this.currentTarget = targetNode as HTMLElement;
      this.highlightTarget(this.currentTarget);
    } else if (!targetNode && this.currentTarget) {
      this.clearTargetHighlight();
      this.currentTarget = null;
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.connectionManager.connectionDragging = false;

    // Clean up temp line
    if (this.tempLine) {
      this.tempLine.remove();
      this.tempLine = null;
    }

    // Check if we have a valid target
    if (this.currentTarget) {
      const sourceNodeId = this.dragSource!.closest('.node')?.id;
      const targetNodeId = this.currentTarget.id;

      // Validate: cannot connect to self
      if (sourceNodeId === targetNodeId) {
        // Fire abort event
        this.connectionManager['fireEvent'](ConnectionEvent.CONNECTION_ABORT, {
          sourceId: this.dragSource!.id,
          source: this.dragSource!
        });
      } else {
        // Fire connection event
        this.connectionManager['fireEvent'](ConnectionEvent.CONNECTION, {
          sourceId: this.dragSource!.id,
          targetId: targetNodeId,
          source: this.dragSource!,
          target: this.currentTarget
        });
      }
    } else {
      // No target - fire abort event
      this.connectionManager['fireEvent'](ConnectionEvent.CONNECTION_ABORT, {
        sourceId: this.dragSource!.id,
        source: this.dragSource!
      });
    }

    // Clean up
    this.clearTargetHighlight();
    this.dragSource = null;
    this.dragStartPoint = null;
    this.currentTarget = null;
  }

  private createTempLine(): void {
    const svg = this.container.querySelector('svg');
    if (!svg) return;

    this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.tempLine.setAttribute('class', 'temp-drag-line');
    this.tempLine.setAttribute('stroke', 'var(--color-connectors)');
    this.tempLine.setAttribute('stroke-width', '3');
    this.tempLine.setAttribute('fill', 'none');
    this.tempLine.setAttribute('stroke-dasharray', '5,5');
    svg.appendChild(this.tempLine);
  }

  private updateTempLine(clientX: number, clientY: number): void {
    if (!this.tempLine || !this.dragSource) return;

    const sourceRect = this.dragSource.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    const startX = sourceRect.left - containerRect.left + sourceRect.width / 2;
    const startY = sourceRect.bottom - containerRect.top;
    const endX = clientX - containerRect.left;
    const endY = clientY - containerRect.top;

    const path = `M ${startX},${startY} L ${endX},${endY}`;
    this.tempLine.setAttribute('d', path);
  }

  private highlightTarget(target: HTMLElement): void {
    const sourceNode = this.dragSource!.closest('.node');
    const isValid = sourceNode?.id !== target.id;
    
    if (isValid) {
      target.classList.add('connection-target-valid');
    } else {
      target.classList.add('connection-target-invalid');
    }
  }

  private clearTargetHighlight(): void {
    document.querySelectorAll('.connection-target-valid, .connection-target-invalid')
      .forEach(el => {
        el.classList.remove('connection-target-valid', 'connection-target-invalid');
      });
  }
}
```

## Updated Plumber.ts

```typescript
// src/flow/Plumber.ts - Updated to use ConnectionManager

import { ConnectionManager, ConnectionEvent } from './ConnectionManager';

export class Plumber {
  private connectionManager: ConnectionManager;
  public connectionDragging = false;
  private editor: any;

  constructor(canvas: HTMLElement, editor: any) {
    this.editor = editor;
    this.connectionManager = new ConnectionManager(canvas, editor);
    
    // Sync connection dragging state
    setInterval(() => {
      this.connectionDragging = this.connectionManager.connectionDragging;
    }, 16);
  }

  public on(eventName: string, callback: (info: any) => void) {
    this.connectionManager.on(eventName, callback);
  }

  public off(eventName: string, callback: (info: any) => void) {
    this.connectionManager.off(eventName, callback);
  }

  public makeTarget(uuid: string) {
    this.connectionManager.makeTarget(uuid);
  }

  public makeSource(uuid: string) {
    this.connectionManager.makeSource(uuid);
  }

  public connectIds(scope: string, fromId: string, toId: string) {
    this.connectionManager.connectIds(scope, fromId, toId);
  }

  public removeExitConnection(exitId: string): boolean {
    return this.connectionManager.removeExitConnection(exitId);
  }

  public removeNodeConnections(nodeId: string) {
    this.connectionManager.removeNodeConnections(nodeId);
  }

  public setConnectionRemovingState(exitId: string, isRemoving: boolean): boolean {
    return this.connectionManager.setConnectionRemovingState(exitId, isRemoving);
  }

  public repaintEverything() {
    this.connectionManager.repaintEverything();
  }

  public revalidate(ids: string[]) {
    this.connectionManager.revalidate(ids);
  }

  public setActivityData(data: any) {
    this.connectionManager.setActivityData(data);
  }

  public clearRecentContactsCache() {
    this.connectionManager.clearRecentContactsCache();
  }

  public batch(fn: () => void) {
    this.connectionManager.batch(fn);
  }
}

// Keep exports for backward compatibility
export { SOURCE_DEFAULTS, TARGET_DEFAULTS } from './ConnectionManager';
```

## Testing Example

```typescript
// test/temba-flow-connection-manager.test.ts

import { expect } from '@open-wc/testing';
import { ConnectionManager } from '../src/flow/ConnectionManager';

describe('ConnectionManager', () => {
  let container: HTMLElement;
  let manager: ConnectionManager;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '1000px';
    container.style.height = '1000px';
    document.body.appendChild(container);

    manager = new ConnectionManager(container, {});
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('makeSource', () => {
    it('creates a source endpoint', () => {
      const exit = document.createElement('div');
      exit.id = 'exit-1';
      exit.className = 'exit';
      container.appendChild(exit);

      manager.makeSource('exit-1');

      expect(exit.dataset.isSource).to.equal('true');
      expect(exit.querySelector('.plumb-source')).to.exist;
    });
  });

  describe('connectIds', () => {
    it('creates a connection between source and target', () => {
      const exit = document.createElement('div');
      exit.id = 'exit-1';
      exit.className = 'exit';
      exit.style.cssText = 'position: absolute; left: 100px; top: 100px; width: 50px; height: 30px;';
      container.appendChild(exit);

      const node = document.createElement('div');
      node.id = 'node-1';
      node.className = 'node';
      node.style.cssText = 'position: absolute; left: 300px; top: 200px; width: 200px; height: 100px;';
      container.appendChild(node);

      manager.makeSource('exit-1');
      manager.makeTarget('node-1');
      manager.connectIds('test-scope', 'exit-1', 'node-1');

      const svg = container.querySelector('svg');
      expect(svg).to.exist;

      const connection = svg!.querySelector('.connection');
      expect(connection).to.exist;
      expect(connection!.getAttribute('data-source')).to.equal('exit-1');
      expect(connection!.getAttribute('data-target')).to.equal('node-1');
    });
  });

  describe('removeExitConnection', () => {
    it('removes connection and updates endpoint state', () => {
      // Setup connection first
      const exit = document.createElement('div');
      exit.id = 'exit-1';
      container.appendChild(exit);

      const node = document.createElement('div');
      node.id = 'node-1';
      container.appendChild(node);

      manager.makeSource('exit-1');
      manager.makeTarget('node-1');
      manager.connectIds('test', 'exit-1', 'node-1');

      // Verify connection exists
      let connection = container.querySelector('.connection');
      expect(connection).to.exist;

      // Remove connection
      const removed = manager.removeExitConnection('exit-1');
      expect(removed).to.be.true;

      // Verify connection is gone
      connection = container.querySelector('.connection');
      expect(connection).to.not.exist;
    });
  });
});
```

## Usage Examples

### Creating Connections in CanvasNode

```typescript
// In CanvasNode.ts updated() method

protected updated(changes: PropertyValueMap<any>): void {
  super.updated(changes);

  if (changes.has('node')) {
    if (this.plumber) {
      this.plumber.removeNodeConnections(this.node.uuid);
      
      // Create connections based on exits
      for (const exit of this.node.exits) {
        if (!exit.destination_uuid) {
          // No destination - make it a source
          this.plumber.makeSource(exit.uuid);
        } else {
          // Has destination - create connection
          this.plumber.connectIds(
            this.node.uuid,
            exit.uuid,
            exit.destination_uuid
          );
        }
      }

      // Revalidate to update positions
      this.plumber.revalidate([this.node.uuid]);
    }
  }
}
```

### Handling Connection Drag in Editor

```typescript
// In Editor.ts connectedCallback()

this.plumber.on(ConnectionEvent.CONNECTION_DRAG, (info) => {
  this.dragFromNodeId = document
    .getElementById(info.sourceId)
    .closest('.node').id;
  this.sourceId = info.sourceId;
});

this.plumber.on(ConnectionEvent.CONNECTION_ABORT, () => {
  this.makeConnection();
});

this.plumber.on(ConnectionEvent.CONNECTION_DETACHED, () => {
  this.makeConnection();
});

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
```

## Performance Tips

### Use RAF for Repainting During Drags

```typescript
private handleNodeDrag(): void {
  if (!this.rafScheduled) {
    this.rafScheduled = true;
    requestAnimationFrame(() => {
      this.plumber.revalidate(this.draggedNodeIds);
      this.rafScheduled = false;
    });
  }
}
```

### Debounce Batch Revalidations

```typescript
private revalidateTimeout: number | null = null;

public revalidate(ids: string[]): void {
  if (this.revalidateTimeout) {
    clearTimeout(this.revalidateTimeout);
  }

  this.revalidateTimeout = window.setTimeout(() => {
    this.actuallyRevalidate(ids);
    this.revalidateTimeout = null;
  }, 50);
}
```

### Cache DOM Queries

```typescript
private elementCache: Map<string, HTMLElement> = new Map();

private getElement(id: string): HTMLElement | null {
  if (this.elementCache.has(id)) {
    return this.elementCache.get(id)!;
  }
  
  const element = document.getElementById(id);
  if (element) {
    this.elementCache.set(id, element);
  }
  
  return element;
}

public clearCache(): void {
  this.elementCache.clear();
}
```
