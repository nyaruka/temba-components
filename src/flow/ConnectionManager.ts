/**
 * ConnectionManager - Custom connection library to replace jsPlumb
 * 
 * This class manages SVG-based connections between flow nodes, replacing
 * the jsPlumb dependency with a lighter, purpose-built solution.
 */

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
  overlayGroup?: SVGGElement;
}

interface Point {
  x: number;
  y: number;
}

export class ConnectionManager {
  private container: HTMLElement;
  private svgContainer: SVGSVGElement;
  private connections: Map<string, Connection> = new Map();
  private sourceElements: Set<string> = new Set();
  private targetElements: Set<string> = new Set();
  private eventListeners: Map<string, Array<(info: ConnectionInfo) => void>> = new Map();
  public connectionDragging = false;
  
  private pendingConnections: Array<{ scope: string; fromId: string; toId: string }> = [];
  private connectionWait: number | null = null;
  
  private activityData: { segments: { [key: string]: number } } | null = null;
  private hoveredActivityKey: string | null = null;
  private recentContactsPopup: HTMLElement | null = null;
  private recentContactsCache: { [key: string]: any[] } = {};
  private pendingFetches: { [key: string]: AbortController } = {};
  private hideContactsTimeout: number | null = null;
  private showContactsTimeout: number | null = null;
  private editor: any;

  // Drag state
  private isDragging = false;
  private dragSource: HTMLElement | null = null;
  private dragStartPoint: Point | null = null;
  private tempLine: SVGPathElement | null = null;
  private currentTarget: HTMLElement | null = null;

  constructor(container: HTMLElement, editor: any) {
    this.container = container;
    this.editor = editor;
    this.createSVGContainer();
    this.setupDragHandlers();
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
    this.svgContainer.setAttribute('class', 'connections-svg');
    this.container.appendChild(this.svgContainer);
  }

  public makeSource(elementId: string): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    this.sourceElements.add(elementId);
    element.dataset.isSource = 'true';
    
    // add class for styling
    element.classList.add('plumb-source');
  }

  public makeTarget(elementId: string): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    this.targetElements.add(elementId);
    element.dataset.isTarget = 'true';
  }

  public connectIds(scope: string, fromId: string, toId: string): void {
    this.pendingConnections.push({ scope, fromId, toId });
    this.processPendingConnections();
  }

  public processPendingConnections(): void {
    // Clear existing timeout
    if (this.connectionWait) {
      clearTimeout(this.connectionWait);
      this.connectionWait = null;
    }

    // Debounce connection processing
    this.connectionWait = window.setTimeout(() => {
      this.batch(() => {
        this.pendingConnections.forEach((connection) => {
          const { scope, fromId, toId } = connection;
          this.createConnection(scope, fromId, toId);
        });
        this.pendingConnections = [];
      });
    }, 50);
  }

  private createConnection(scope: string, fromId: string, toId: string): void {
    const connectionId = `${fromId}-${toId}`;
    
    // Remove any existing connection from this source
    this.removeConnectionsFromSource(fromId);

    const fromElement = document.getElementById(fromId);
    const toElement = document.getElementById(toId);
    
    if (!fromElement || !toElement) return;

    // Create SVG elements
    const svgGroup = this.createConnectionSVG(fromId, toId, scope);
    
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
    
    // Update source to show connected state
    fromElement.classList.add('connected');

    // Calculate and render the path
    this.updateConnectionPath(connection);
  }

  private createConnectionSVG(fromId: string, toId: string, scope: string): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'connection jtk-connector plumb-connector');
    group.setAttribute('data-source', fromId);
    group.setAttribute('data-target', toId);
    group.setAttribute('data-scope', scope);

    // Create path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'plumb-connector');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '3');

    // Create arrow element  
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrow.setAttribute('class', 'plumb-arrow');
    arrow.setAttribute('fill', 'currentColor');

    group.appendChild(path);
    group.appendChild(arrow);
    
    // Make connectors hoverable for visual feedback
    group.style.pointerEvents = 'stroke';
    
    this.svgContainer.appendChild(group);

    return group;
  }

  private updateConnectionPath(connection: Connection): void {
    const sourceElement = document.getElementById(connection.sourceId);
    const targetElement = document.getElementById(connection.targetId);

    if (!sourceElement || !targetElement) return;

    // Get positions relative to container
    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    // Calculate start point (bottom center of exit)
    const startX = sourceRect.left - containerRect.left + sourceRect.width / 2;
    const startY = sourceRect.bottom - containerRect.top;

    // Calculate best target point using continuous anchor logic
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
    const arrowTransform = this.calculateArrowTransform(endPoint, startX, startY, endPoint.x, endPoint.y);
    connection.arrowElement.setAttribute('d', 'M 0,0 L -6.5,-6.5 L -6.5,6.5 Z');
    connection.arrowElement.setAttribute('transform', arrowTransform);
  }

  private calculateBestTargetPoint(
    targetRect: DOMRect,
    containerRect: DOMRect,
    sourceX: number,
    sourceY: number
  ): Point {
    const targetCenterX = targetRect.left - containerRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top - containerRect.top + targetRect.height / 2;

    // Check which face is best (top, left, or right)
    const faces = [
      { x: targetCenterX, y: targetRect.top - containerRect.top, face: 'top' },
      { x: targetRect.left - containerRect.left, y: targetCenterY, face: 'left' },
      { x: targetRect.right - containerRect.left, y: targetCenterY, face: 'right' }
    ];

    // Choose face with shortest distance
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
    start: Point,
    end: Point,
    startStub: number,
    endStub: number,
    cornerRadius: number
  ): string {
    const segments: string[] = [];

    // Start point
    segments.push(`M ${start.x},${start.y}`);

    // Start stub (straight down from exit)
    const stubStart = { x: start.x, y: start.y + startStub };
    segments.push(`L ${stubStart.x},${stubStart.y}`);

    // Determine direction to end point
    const dx = end.x - stubStart.x;
    const dy = end.y - stubStart.y;

    // Calculate stub end point (approaching target)
    const stubEnd = { x: end.x, y: end.y - endStub };

    // Simple flowchart routing
    if (Math.abs(dx) > cornerRadius * 2) {
      // Need horizontal routing
      const midY = (stubStart.y + stubEnd.y) / 2;

      if (Math.abs(stubStart.y - midY) > cornerRadius) {
        // First vertical segment
        const corner1Y = midY - cornerRadius;
        segments.push(`L ${stubStart.x},${corner1Y}`);

        // First turn (rounded corner)
        const turn1X = dx > 0 ? stubStart.x + cornerRadius : stubStart.x - cornerRadius;
        segments.push(`Q ${stubStart.x},${midY} ${turn1X},${midY}`);

        // Horizontal segment
        const corner2X = dx > 0 ? stubEnd.x - cornerRadius : stubEnd.x + cornerRadius;
        segments.push(`L ${corner2X},${midY}`);

        // Second turn (rounded corner)
        segments.push(`Q ${stubEnd.x},${midY} ${stubEnd.x},${midY + cornerRadius}`);
      }
    }

    // Final vertical segment to stub end
    segments.push(`L ${stubEnd.x},${stubEnd.y}`);

    // Final segment to target
    segments.push(`L ${end.x},${end.y}`);

    return segments.join(' ');
  }

  private calculateArrowTransform(endPoint: Point, startX: number, startY: number, endX: number, endY: number): string {
    // Calculate angle based on the direction of approach
    let angle = -90; // Default: pointing up
    
    const dx = endX - startX;
    const dy = endY - startY;
    
    // Determine direction based on final approach
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal approach
      angle = dx > 0 ? 0 : 180; // Right or left
    }
    
    return `translate(${endPoint.x}, ${endPoint.y}) rotate(${angle})`;
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
      sourceElement.classList.remove('connected');
    }

    return true;
  }

  public removeNodeConnections(nodeId: string): void {
    // Remove inbound connections (where this node is target)
    const inboundConnections = Array.from(this.connections.values()).filter(
      conn => conn.targetId === nodeId
    );
    
    inboundConnections.forEach(conn => {
      this.svgContainer.removeChild(conn.svgGroup);
      this.connections.delete(conn.id);
      
      // Update source
      const sourceElement = document.getElementById(conn.sourceId);
      if (sourceElement) {
        sourceElement.classList.remove('connected');
      }
    });

    // Remove outbound connections (where exits of this node are sources)
    const nodeElement = document.getElementById(nodeId);
    if (nodeElement) {
      const exitIds = Array.from(nodeElement.querySelectorAll('.exit')).map(exit => exit.id);
      
      exitIds.forEach(exitId => {
        const connections = this.getConnectionsFromSource(exitId);
        connections.forEach(conn => {
          this.svgContainer.removeChild(conn.svgGroup);
          this.connections.delete(conn.id);
        });
        
        const exitElement = document.getElementById(exitId);
        if (exitElement) {
          exitElement.classList.remove('connected');
        }
      });
    }
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
      if (conn.svgGroup.parentNode) {
        this.svgContainer.removeChild(conn.svgGroup);
      }
      this.connections.delete(conn.id);
    });
  }

  public revalidate(elementIds: string[]): void {
    // Use RAF to batch updates
    requestAnimationFrame(() => {
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
    });
  }

  public repaintEverything(): void {
    requestAnimationFrame(() => {
      this.connections.forEach(connection => {
        this.updateConnectionPath(connection);
      });
      
      // Update activity overlays if present
      if (this.activityData) {
        this.updateActivityOverlays();
      }
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
    fn();
  }

  // Activity overlay methods
  public setActivityData(data: { segments: { [key: string]: number } } | null): void {
    this.activityData = data;
    this.clearRecentContactsCache();
    this.updateActivityOverlays();
  }

  private updateActivityOverlays(): void {
    if (!this.activityData) {
      // Remove all overlays
      this.connections.forEach(connection => {
        if (connection.overlayGroup) {
          connection.overlayGroup.remove();
          connection.overlayGroup = undefined;
        }
      });
      return;
    }

    this.connections.forEach(connection => {
      const activityKey = `${connection.sourceId}:${connection.targetId}`;
      const count = this.activityData!.segments[activityKey];

      // Remove existing overlay
      if (connection.overlayGroup) {
        connection.overlayGroup.remove();
        connection.overlayGroup = undefined;
      }

      if (count && count > 0) {
        // Create overlay
        connection.overlayGroup = this.createActivityOverlay(connection, count, activityKey);
      }
    });
  }

  private createActivityOverlay(connection: Connection, count: number, activityKey: string): SVGGElement {
    const overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlayGroup.setAttribute('class', 'activity-overlay jtk-overlay');
    overlayGroup.setAttribute('data-activity-key', activityKey);
    overlayGroup.style.cursor = 'pointer';
    overlayGroup.style.pointerEvents = 'all';

    // Position at 20px from start
    const sourceElement = document.getElementById(connection.sourceId);
    if (sourceElement) {
      const sourceRect = sourceElement.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      const x = sourceRect.left - containerRect.left + sourceRect.width / 2;
      const y = sourceRect.bottom - containerRect.top + 20;

      // Background rect
      const labelText = count.toLocaleString();
      const textWidth = labelText.length * 7 + 8;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(x - textWidth / 2));
      rect.setAttribute('y', String(y - 8));
      rect.setAttribute('width', String(textWidth));
      rect.setAttribute('height', '16');
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', '#f3f3f3');
      rect.setAttribute('stroke', '#d9d9d9');
      rect.setAttribute('stroke-width', '1');

      // Text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(x));
      text.setAttribute('y', String(y + 4));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-weight', '600');
      text.setAttribute('fill', '#333');
      text.textContent = labelText;

      overlayGroup.appendChild(rect);
      overlayGroup.appendChild(text);

      // Add hover events
      overlayGroup.addEventListener('mouseenter', () => this.handleOverlayMouseEnter(activityKey));
      overlayGroup.addEventListener('mouseleave', () => this.handleOverlayMouseLeave());

      connection.svgGroup.appendChild(overlayGroup);
    }

    return overlayGroup;
  }

  private handleOverlayMouseEnter(activityKey: string): void {
    const store = (window as any).getStore?.();
    if (store?.getState().simulatorActive) {
      return;
    }

    const editor = document.querySelector('temba-flow-editor') as any;
    const flowUuid = editor?.definition?.uuid;
    if (flowUuid) {
      this.fetchRecentContacts(activityKey, flowUuid);
      this.showContactsTimeout = window.setTimeout(() => {
        this.showRecentContacts(activityKey, flowUuid);
      }, 500);
    }
  }

  private handleOverlayMouseLeave(): void {
    if (this.showContactsTimeout) {
      clearTimeout(this.showContactsTimeout);
      this.showContactsTimeout = null;
    }
    this.hoveredActivityKey = null;
    this.hideRecentContacts();
  }

  private async fetchRecentContacts(activityKey: string, flowUuid: string): Promise<void> {
    if (this.recentContactsCache[activityKey] || this.pendingFetches[activityKey]) {
      return;
    }

    if (this.pendingFetches[activityKey]) {
      this.pendingFetches[activityKey].abort();
    }

    const controller = new AbortController();
    this.pendingFetches[activityKey] = controller;

    try {
      const [exitUuid, destinationUuid] = activityKey.split(':');
      const endpoint = `/flow/recent_contacts/${flowUuid}/${exitUuid}/${destinationUuid}/`;
      const response = await fetch(endpoint, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const recentContacts = Array.isArray(data) ? data : data.results || [];
      this.recentContactsCache[activityKey] = recentContacts;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch recent contacts:', error);
      }
    } finally {
      delete this.pendingFetches[activityKey];
    }
  }

  private async showRecentContacts(activityKey: string, flowUuid: string): Promise<void> {
    const store = (window as any).getStore?.();
    if (store?.getState().simulatorActive) {
      return;
    }

    const overlayElement = this.svgContainer.querySelector(`[data-activity-key="${activityKey}"]`) as HTMLElement;
    if (!overlayElement) return;

    if (this.hideContactsTimeout) {
      clearTimeout(this.hideContactsTimeout);
      this.hideContactsTimeout = null;
    }

    this.hoveredActivityKey = activityKey;

    if (!this.recentContactsPopup) {
      this.recentContactsPopup = document.createElement('div');
      this.recentContactsPopup.className = 'recent-contacts-popup';
      this.recentContactsPopup.style.cssText = `
        position: absolute;
        width: 200px;
        background: #f3f3f3;
        border-radius: 10px;
        box-shadow: 0 1px 3px 1px rgba(130, 130, 130, 0.2);
        z-index: 1015;
        display: none;
      `;
      document.body.appendChild(this.recentContactsPopup);

      this.recentContactsPopup.onmouseenter = () => {
        if (this.hideContactsTimeout) {
          clearTimeout(this.hideContactsTimeout);
          this.hideContactsTimeout = null;
        }
      };
      this.recentContactsPopup.onmouseleave = () => {
        this.hoveredActivityKey = null;
        this.hideRecentContacts();
      };
      this.recentContactsPopup.onclick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('contact-name')) {
          this.hideRecentContacts(false);
          const contactUuid = target.getAttribute('data-uuid');
          if (contactUuid && this.editor) {
            this.editor.fireCustomEvent('temba-contact-clicked', { uuid: contactUuid });
          }
        }
      };
    }

    if (this.recentContactsCache[activityKey]) {
      this.renderRecentContactsPopup(this.recentContactsCache[activityKey]);
      this.positionPopup(overlayElement);
    } else {
      this.recentContactsPopup.innerHTML = '<div class="no-contacts-message">Loading...</div>';
      this.positionPopup(overlayElement);
      await this.fetchRecentContacts(activityKey, flowUuid);
      if (this.hoveredActivityKey === activityKey) {
        const contacts = this.recentContactsCache[activityKey] || [];
        this.renderRecentContactsPopup(contacts);
        this.positionPopup(overlayElement);
      }
    }
  }

  private positionPopup(overlayElement: HTMLElement): void {
    if (!this.recentContactsPopup) return;

    const rect = overlayElement.getBoundingClientRect();
    this.recentContactsPopup.style.left = `${rect.left + window.scrollX}px`;
    this.recentContactsPopup.style.top = `${rect.bottom + window.scrollY + 5}px`;
    this.recentContactsPopup.style.display = '';
    this.recentContactsPopup.classList.remove('show');
    void this.recentContactsPopup.offsetWidth;
    this.recentContactsPopup.classList.add('show');
  }

  private renderRecentContactsPopup(recentContacts: any[]): void {
    if (!this.recentContactsPopup) return;

    if (recentContacts.length === 0) {
      this.recentContactsPopup.innerHTML = '<div class="no-contacts-message">No Recent Contacts</div>';
      return;
    }

    let html = `<div class="popup-title">Recent Contacts</div>`;
    recentContacts.forEach((contact: any) => {
      html += `<div class="contact-row">`;
      html += `<div class="contact-name" data-uuid="${contact.contact.uuid}">${contact.contact.name}</div>`;
      if (contact.operand) {
        html += `<div class="contact-operand">${contact.operand}</div>`;
      }
      if (contact.time) {
        const time = new Date(contact.time);
        const now = new Date();
        const diffMs = now.getTime() - time.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        let timeStr = '';
        if (diffMins < 1) timeStr = 'just now';
        else if (diffMins < 60) timeStr = `${diffMins}m ago`;
        else if (diffHours < 24) timeStr = `${diffHours}h ago`;
        else timeStr = `${diffDays}d ago`;

        html += `<div class="contact-time">${timeStr}</div>`;
      }
      html += `</div>`;
    });

    this.recentContactsPopup.innerHTML = html;
  }

  private hideRecentContacts(wait = true): void {
    if (!wait) {
      if (this.recentContactsPopup) {
        this.recentContactsPopup.classList.remove('show');
        this.recentContactsPopup.style.display = 'none';
        this.hoveredActivityKey = null;
      }
      return;
    }

    this.hideContactsTimeout = window.setTimeout(() => {
      if (!this.hoveredActivityKey && this.recentContactsPopup) {
        this.recentContactsPopup.classList.remove('show');
        this.recentContactsPopup.style.display = 'none';
        this.hoveredActivityKey = null;
      }
    }, 200);
  }

  public clearRecentContactsCache(): void {
    this.recentContactsCache = {};
    Object.values(this.pendingFetches).forEach(controller => controller.abort());
    this.pendingFetches = {};
  }

  // Drag and Drop Implementation
  private setupDragHandlers(): void {
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Check if clicking on a source (exit element)
    const exitElement = target.closest('.exit[data-is-source="true"]') as HTMLElement;
    if (!exitElement) return;

    this.isDragging = true;
    this.dragSource = exitElement;
    this.dragStartPoint = { x: event.clientX, y: event.clientY };
    this.connectionDragging = true;

    // Create temporary drag line
    this.createTempLine();

    // Fire drag start event
    this.fireEvent(ConnectionEvent.CONNECTION_DRAG, {
      sourceId: this.dragSource.id,
      source: this.dragSource
    });

    event.preventDefault();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.dragSource) return;

    // Update temp line position
    this.updateTempLine(event.clientX, event.clientY);

    // Find target under cursor
    const elements = document.elementsFromPoint(event.clientX, event.clientY);
    const targetNode = elements.find(el => 
      el.classList.contains('node') && el.getAttribute('data-is-target') === 'true'
    ) as HTMLElement | undefined;

    // Update target highlighting
    if (targetNode && targetNode !== this.currentTarget) {
      this.clearTargetHighlight();
      this.currentTarget = targetNode;
      this.highlightTarget(this.currentTarget);
    } else if (!targetNode && this.currentTarget) {
      this.clearTargetHighlight();
      this.currentTarget = null;
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.connectionDragging = false;

    // Clean up temp line
    if (this.tempLine) {
      this.tempLine.remove();
      this.tempLine = null;
    }

    // Check if we have a valid target
    if (this.currentTarget && this.dragSource) {
      const sourceNodeId = this.dragSource.closest('.node')?.id;
      const targetNodeId = this.currentTarget.id;

      // Validate: cannot connect to self
      if (sourceNodeId === targetNodeId) {
        this.fireEvent(ConnectionEvent.CONNECTION_ABORT, {
          sourceId: this.dragSource.id,
          source: this.dragSource
        });
      } else {
        // Check if we're re-dragging an existing connection
        const hadConnection = this.dragSource.classList.contains('connected');
        
        if (hadConnection) {
          // Fire detach event for the old connection
          this.fireEvent(ConnectionEvent.CONNECTION_DETACHED, {
            sourceId: this.dragSource.id,
            source: this.dragSource
          });
        }
        
        // Fire connection event
        this.fireEvent(ConnectionEvent.CONNECTION, {
          sourceId: this.dragSource.id,
          targetId: targetNodeId,
          source: this.dragSource,
          target: this.currentTarget
        });
      }
    } else {
      // No target - fire abort event
      if (this.dragSource) {
        this.fireEvent(ConnectionEvent.CONNECTION_ABORT, {
          sourceId: this.dragSource.id,
          source: this.dragSource
        });
      }
    }

    // Clean up
    this.clearTargetHighlight();
    this.dragSource = null;
    this.dragStartPoint = null;
    this.currentTarget = null;
  }

  private createTempLine(): void {
    this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.tempLine.setAttribute('class', 'temp-drag-line jtk-connector jtk-dragging');
    this.tempLine.setAttribute('stroke', 'var(--color-connectors, #ccc)');
    this.tempLine.setAttribute('stroke-width', '3');
    this.tempLine.setAttribute('fill', 'none');
    this.tempLine.setAttribute('stroke-dasharray', '5,5');
    this.tempLine.style.pointerEvents = 'none';
    this.svgContainer.appendChild(this.tempLine);
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
    if (!this.dragSource) return;
    
    const sourceNode = this.dragSource.closest('.node');
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

// Export constants for backward compatibility
export const SOURCE_DEFAULTS = {
  endpoint: {
    type: 'dot',
    options: {
      radius: 12,
      cssClass: 'plumb-source',
      hoverClass: 'plumb-source-hover'
    }
  },
  anchors: ['Bottom', 'Continuous'],
  maxConnections: 1,
  source: true,
  dragAllowedWhenFull: false
};

export const TARGET_DEFAULTS = {
  endpoint: {
    type: 'rectangle',
    options: {
      width: 23,
      height: 23,
      cssClass: 'plumb-target',
      hoverClass: 'plumb-target-hover'
    }
  },
  anchor: {
    type: 'Continuous',
    options: {
      faces: ['top', 'left', 'right'],
      cssClass: 'continuos plumb-target-anchor'
    }
  },
  deleteOnEmpty: true,
  maxConnections: 1,
  target: true
};
