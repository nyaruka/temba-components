export type TargetFace = 'top' | 'left' | 'right';

// Shared arrow/drag constants used by both Plumber and Editor
export const ARROW_LENGTH = 13;
export const ARROW_HALF_WIDTH = 6.5;
export const CURSOR_GAP = 1;
export const EXIT_STUB = 30;

interface ConnectionEndpoints {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  targetFace: TargetFace;
}

interface ConnectionInfo {
  scope: string; // nodeId
  fromId: string; // exitId
  toId: string; // target nodeId
  svgEl: SVGSVGElement;
  pathEl: SVGPathElement;
  arrowEl: SVGPolygonElement;
}

interface DragState {
  sourceId: string;
  scope: string;
  originalTargetId: string | null;
  svgEl: SVGSVGElement;
  pathEl: SVGPathElement;
  arrowEl: SVGPolygonElement;
  onMove: (e: MouseEvent) => void;
  onUp: (e: MouseEvent) => void;
}

/**
 * Calculate a flowchart-style SVG path between two points.
 * Routes with right-angle segments, stubs at each end, and rounded corners.
 * Supports entering the target from top, left, or right faces.
 */
export function calculateFlowchartPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  stubStart = 20,
  stubEnd = 10,
  cornerRadius = 5,
  targetFace: TargetFace = 'top'
): string {
  const r = cornerRadius;

  if (targetFace === 'top') {
    // Target is below (or we treat it as such): exit down, horizontal jog, enter from top
    const exitY = sourceY + stubStart;
    const entryY = targetY - stubEnd;

    let d = `M ${sourceX} ${sourceY}`;

    if (sourceX === targetX) {
      // Straight vertical — no turns needed
      d += ` L ${targetX} ${entryY}`;
    } else {
      // L-shape: exit curves horizontal, then straight down to target.
      // jogY is the horizontal level — must be above entryY so the
      // final approach into the node is always downward (no backtracking).
      const dirX = targetX > sourceX ? 1 : -1;
      const jogY = Math.max(sourceY + r, Math.min(exitY, entryY - r));

      // Corner 1: vertical→horizontal at jogY
      const r1 = Math.min(r, jogY - sourceY);
      if (r1 >= 1) {
        d += ` L ${sourceX} ${jogY - r1}`;
        d += ` Q ${sourceX} ${jogY}, ${sourceX + dirX * r1} ${jogY}`;
      } else {
        d += ` L ${sourceX} ${jogY}`;
      }

      // Corner 2: horizontal→vertical at targetX — leave minSeg of
      // straight line after the curve before reaching entryY
      const minSeg = 3;
      const r2 = Math.min(r, Math.max(0, entryY - jogY - minSeg));
      if (r2 >= 1) {
        d += ` L ${targetX - dirX * r2} ${jogY}`;
        d += ` Q ${targetX} ${jogY}, ${targetX} ${jogY + r2}`;
      } else {
        d += ` L ${targetX} ${jogY}`;
      }
      d += ` L ${targetX} ${entryY}`;
    }

    d += ` L ${targetX} ${targetY}`;
    return d;
  }

  if (targetFace === 'left' || targetFace === 'right') {
    // Route: exit down from source, horizontal jog, vertical to target Y, stub into side
    // When target is above source, skip the exit stub so the path turns horizontal
    // as quickly as possible (only the corner radius creates downward travel)
    const goingUp = targetY < sourceY;
    const exitY = sourceY + (goingUp ? 0 : stubStart);
    const sideDir = targetFace === 'left' ? -1 : 1;
    // Entry point is OUTSIDE the node boundary (stub behind arrowhead)
    const entryX = targetX + sideDir * stubEnd;

    const dirX = entryX > sourceX ? 1 : -1;

    // Minimum straight segment after each curve
    const minSeg = 3;

    // When the horizontal approach would double-back over the stub
    // (dirX matches sideDir), keep midY at the natural exit level so
    // the path jogs horizontally ABOVE the target and descends into
    // the stub — never dipping past the target and curving back up.
    // For non-backtrack, midY goes to targetY for a direct entry.
    const midY =
      dirX === sideDir ? exitY + r * 2 : Math.max(exitY + r * 2, targetY);

    let d = `M ${sourceX} ${sourceY} L ${sourceX} ${exitY}`;

    // Corner 1: vertical→horizontal at (sourceX, midY)
    if (midY - exitY > r) {
      d += ` L ${sourceX} ${midY - r}`;
      d += ` Q ${sourceX} ${midY}, ${sourceX + dirX * r} ${midY}`;
    }

    const vertGap = Math.abs(midY - targetY);

    if (vertGap < 1) {
      // midY ≈ targetY — horizontal to entryX, then stub into face
      d += ` L ${entryX} ${targetY}`;
      d += ` L ${targetX} ${targetY}`;
    } else {
      // Corners 2 and 3 — turnR is limited so that at least minSeg of
      // straight line remains between the two corners and after corner 3
      const turnDir = targetY < midY ? -1 : 1;
      const turnR = Math.min(
        r,
        Math.max(0, Math.floor((vertGap - minSeg) / 2)),
        Math.max(0, stubEnd - minSeg)
      );

      if (turnR >= 1) {
        // Corner 2: horizontal→vertical at (entryX, midY)
        d += ` L ${entryX - dirX * turnR} ${midY}`;
        d += ` Q ${entryX} ${midY}, ${entryX} ${midY + turnDir * turnR}`;
        // Vertical toward targetY
        d += ` L ${entryX} ${targetY - turnDir * turnR}`;
        // Corner 3: vertical→horizontal into side face
        d += ` Q ${entryX} ${targetY}, ${entryX - sideDir * turnR} ${targetY}`;
      } else {
        d += ` L ${entryX} ${midY}`;
        d += ` L ${entryX} ${targetY}`;
      }
      // Horizontal stub into target face
      d += ` L ${targetX} ${targetY}`;
    }

    return d;
  }

  return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
}

export class Plumber {
  private connections: Map<string, ConnectionInfo> = new Map();
  private sources: Map<string, () => void> = new Map(); // exitId → cleanup fn
  private canvas: HTMLElement;
  private pendingConnections: {
    scope: string;
    fromId: string;
    toId: string;
  }[] = [];
  private connectionWait: number | null = null;
  private connectionListeners: Map<string, ((info: any) => void)[]> = new Map();
  private dragState: DragState | null = null;
  private editor: any;
  private retryCount = 0;
  private maxRetries = 3;

  // Activity overlay state
  private activityData: { segments: { [key: string]: number } } | null = null;
  private overlays: Map<string, HTMLElement> = new Map();
  private hoveredActivityKey: string | null = null;
  private recentContactsPopup: HTMLElement | null = null;
  private recentContactsCache: { [key: string]: any[] } = {};
  private pendingFetches: { [key: string]: AbortController } = {};
  private hideContactsTimeout: number | null = null;
  private showContactsTimeout: number | null = null;

  public connectionDragging = false;

  constructor(canvas: HTMLElement, editor: any) {
    this.canvas = canvas;
    this.editor = editor;
  }

  // --- Event system ---

  private notifyListeners(eventName: string, info: any) {
    const listeners = this.connectionListeners.get(eventName) || [];
    listeners.forEach((listener) => listener(info));
  }

  public on(eventName: string, callback: (info: any) => void) {
    if (!this.connectionListeners.has(eventName)) {
      this.connectionListeners.set(eventName, []);
    }
    this.connectionListeners.get(eventName).push(callback);
  }

  public off(eventName: string, callback: (info: any) => void) {
    if (!this.connectionListeners.has(eventName)) return;
    const listeners = this.connectionListeners.get(eventName);
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  // --- Source/Target registration ---

  public makeSource(exitId: string) {
    const element = document.getElementById(exitId);
    if (!element) return;

    // Clean up any existing listener for this exit
    if (this.sources.has(exitId)) {
      this.sources.get(exitId)();
    }

    let pendingDrag: {
      startX: number;
      startY: number;
      onMove: (e: MouseEvent) => void;
      onUp: (e: MouseEvent) => void;
    } | null = null;

    const DRAG_THRESHOLD = 5;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      // Don't start drag from exit if it already has a connection —
      // existing connections are picked up from the arrowhead instead
      if (this.connections.has(exitId)) return;

      const startX = e.clientX;
      const startY = e.clientY;

      const nodeEl = element.closest('temba-flow-node');
      const scope = nodeEl?.getAttribute('uuid') || '';
      const originalTargetId: string | null = null;

      const onMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          // Exceeded threshold — start actual drag
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          pendingDrag = null;
          this.startDrag(exitId, scope, originalTargetId, me);
        }
      };

      const onUp = () => {
        // Mouse released without dragging — let click handler fire
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        pendingDrag = null;
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      pendingDrag = { startX, startY, onMove, onUp };
    };

    element.addEventListener('mousedown', onMouseDown);
    this.sources.set(exitId, () => {
      element.removeEventListener('mousedown', onMouseDown);
      if (pendingDrag) {
        document.removeEventListener('mousemove', pendingDrag.onMove);
        document.removeEventListener('mouseup', pendingDrag.onUp);
        pendingDrag = null;
      }
    });
  }

  public makeTarget(_nodeId: string) {
    // No-op: target detection happens via DOM hover during drag
  }

  // --- Connection creation ---

  public connectIds(scope: string, fromId: string, toId: string) {
    this.pendingConnections.push({ scope, fromId, toId });
    this.processPendingConnections();
  }

  public processPendingConnections() {
    if (this.connectionWait) {
      cancelAnimationFrame(this.connectionWait);
      this.connectionWait = null;
    }

    this.connectionWait = requestAnimationFrame(() => {
      const failed: { scope: string; fromId: string; toId: string }[] = [];
      const createdTargets = new Set<string>();

      this.pendingConnections.forEach((conn) => {
        const { scope, fromId, toId } = conn;
        // Remove existing connection from this exit if any
        this.removeConnectionSVG(fromId);
        if (!this.createConnectionSVG(fromId, scope, toId)) {
          failed.push(conn);
        } else {
          createdTargets.add(toId);
        }
      });
      this.pendingConnections = [];

      // Repaint all connections that share a target with newly created ones
      // so anchor distribution is correct after the full batch is processed
      if (createdTargets.size > 0) {
        this.connections.forEach((conn, exitId) => {
          if (createdTargets.has(conn.toId)) {
            this.updateConnectionSVG(exitId);
          }
        });
      }

      // Retry failed connections (elements may not be laid out yet)
      if (failed.length > 0 && this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.pendingConnections = failed;
        this.processPendingConnections();
      } else {
        this.retryCount = 0;
      }
    });
  }

  // --- Anchor point distribution ---

  private determineTargetFace(
    sourceX: number,
    sourceY: number,
    targetRect: DOMRect,
    canvasRect: DOMRect
  ): TargetFace {
    const targetCenterX =
      targetRect.left + targetRect.width / 2 - canvasRect.left;
    const targetTop = targetRect.top - canvasRect.top;
    const verticalGap = targetTop - sourceY;

    // Top face requires enough vertical room for the exit stub, entry stub,
    // arrow, and curved corners. Below this threshold the path components
    // overlap and the connection backtracks, so use a side face instead.
    if (verticalGap > 30) {
      return 'top';
    }

    // Source is level with, below, or too close to target — connect to a side face
    if (sourceX < targetCenterX) {
      return 'left';
    }
    return 'right';
  }

  private getConnectionEndpoints(
    fromId: string,
    toId: string
  ): ConnectionEndpoints | null {
    const fromEl = document.getElementById(fromId);
    const toEl = document.getElementById(toId);
    if (!fromEl || !toEl) return null;

    const canvasRect = this.canvas.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    if (fromRect.width === 0 || toRect.width === 0) return null;

    const sourceX = fromRect.left + fromRect.width / 2 - canvasRect.left;
    const sourceY = fromRect.bottom - canvasRect.top;

    const targetFace = this.determineTargetFace(
      sourceX,
      sourceY,
      toRect,
      canvasRect
    );

    // Find all connections targeting the same node, grouped by face
    // Track source position for spatial sorting
    const faceConnections: Map<
      TargetFace,
      { fromId: string; sortPos: number }[]
    > = new Map();
    this.connections.forEach((conn) => {
      if (conn.toId === toId) {
        const connFromEl = document.getElementById(conn.fromId);
        if (connFromEl) {
          const connFromRect = connFromEl.getBoundingClientRect();
          const connSourceX =
            connFromRect.left + connFromRect.width / 2 - canvasRect.left;
          const connSourceY = connFromRect.bottom - canvasRect.top;
          const face = this.determineTargetFace(
            connSourceX,
            connSourceY,
            toRect,
            canvasRect
          );
          if (!faceConnections.has(face)) {
            faceConnections.set(face, []);
          }
          // Sort position: X for top face, Y for side faces
          const sortPos = face === 'top' ? connSourceX : connSourceY;
          faceConnections.get(face).push({ fromId: conn.fromId, sortPos });
        }
      }
    });

    // Add current connection to its face group if not already tracked
    if (!faceConnections.has(targetFace)) {
      faceConnections.set(targetFace, []);
    }
    const faceGroup = faceConnections.get(targetFace);
    if (!faceGroup.find((e) => e.fromId === fromId)) {
      const sortPos = targetFace === 'top' ? sourceX : sourceY;
      faceGroup.push({ fromId, sortPos });
    }

    // Sort by spatial position so connections don't cross
    faceGroup.sort((a, b) => a.sortPos - b.sortPos);
    const index = faceGroup.findIndex((e) => e.fromId === fromId);
    const count = faceGroup.length;

    // Calculate anchor point on the chosen face
    const targetLeft = toRect.left - canvasRect.left;
    const targetTop = toRect.top - canvasRect.top;
    const targetW = toRect.width;
    const targetH = toRect.height;

    let targetX: number;
    let targetY: number;

    if (targetFace === 'top') {
      // Distribute across top face (middle 60% of width)
      const margin = targetW * 0.2;
      const span = targetW * 0.6;
      targetX =
        count === 1
          ? targetLeft + targetW / 2
          : targetLeft + margin + (span * (index + 0.5)) / count;
      targetY = targetTop;
    } else if (targetFace === 'left') {
      targetX = targetLeft;
      // Distribute along left face (middle 60% of height)
      const margin = targetH * 0.2;
      const span = targetH * 0.6;
      targetY =
        count === 1
          ? targetTop + targetH / 2
          : targetTop + margin + (span * (index + 0.5)) / count;
    } else {
      // right
      targetX = targetLeft + targetW;
      const margin = targetH * 0.2;
      const span = targetH * 0.6;
      targetY =
        count === 1
          ? targetTop + targetH / 2
          : targetTop + margin + (span * (index + 0.5)) / count;
    }

    return { sourceX, sourceY, targetX, targetY, targetFace };
  }

  // --- SVG creation and management ---

  private createSVGElement(): {
    svgEl: SVGSVGElement;
    pathEl: SVGPathElement;
    arrowEl: SVGPolygonElement;
  } {
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.classList.add('plumb-connector');
    svgEl.style.position = 'absolute';
    svgEl.style.left = '0';
    svgEl.style.top = '0';
    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    svgEl.style.pointerEvents = 'none';
    svgEl.style.overflow = 'visible';

    const pathEl = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke', 'var(--color-connectors)');
    pathEl.setAttribute('stroke-width', '3');
    pathEl.style.pointerEvents = 'stroke';

    const arrowEl = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polygon'
    );
    arrowEl.setAttribute('fill', 'var(--color-connectors)');
    arrowEl.classList.add('plumb-arrow');
    arrowEl.style.pointerEvents = 'fill';
    arrowEl.style.cursor = 'pointer';

    svgEl.appendChild(pathEl);
    svgEl.appendChild(arrowEl);

    // Hover support
    const addHover = () => svgEl.classList.add('hover');
    const removeHover = () => svgEl.classList.remove('hover');
    pathEl.addEventListener('mouseenter', addHover);
    pathEl.addEventListener('mouseleave', removeHover);
    arrowEl.addEventListener('mouseenter', addHover);
    arrowEl.addEventListener('mouseleave', removeHover);

    return { svgEl, pathEl, arrowEl };
  }

  private updateSVGPath(
    pathEl: SVGPathElement,
    arrowEl: SVGPolygonElement,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    targetFace: TargetFace = 'top'
  ) {
    const aw = ARROW_HALF_WIDTH;
    const al = ARROW_LENGTH;
    const stubBehindArrow = 8;

    // Path ends at arrow BASE (not tip) so the line never pokes through the front.
    // The arrow polygon covers from base to the node edge (tip).
    let pathTargetX = targetX;
    let pathTargetY = targetY;
    if (targetFace === 'top') {
      pathTargetY = targetY - al;
    } else if (targetFace === 'left') {
      pathTargetX = targetX - al;
    } else if (targetFace === 'right') {
      pathTargetX = targetX + al;
    }

    const effectiveStub = stubBehindArrow;
    const d = calculateFlowchartPath(
      sourceX,
      sourceY,
      pathTargetX,
      pathTargetY,
      EXIT_STUB,
      effectiveStub,
      5,
      targetFace
    );
    pathEl.setAttribute('d', d);

    // Arrow tip at node edge, base extends outward
    if (targetFace === 'top') {
      arrowEl.setAttribute(
        'points',
        `${targetX},${targetY} ${targetX - aw},${targetY - al} ${
          targetX + aw
        },${targetY - al}`
      );
    } else if (targetFace === 'left') {
      arrowEl.setAttribute(
        'points',
        `${targetX},${targetY} ${targetX - al},${targetY - aw} ${
          targetX - al
        },${targetY + aw}`
      );
    } else {
      arrowEl.setAttribute(
        'points',
        `${targetX},${targetY} ${targetX + al},${targetY - aw} ${
          targetX + al
        },${targetY + aw}`
      );
    }
  }

  private createConnectionSVG(
    exitId: string,
    scope: string,
    toId: string
  ): boolean {
    const endpoints = this.getConnectionEndpoints(exitId, toId);
    if (!endpoints) return false;

    const { svgEl, pathEl, arrowEl } = this.createSVGElement();
    this.updateSVGPath(
      pathEl,
      arrowEl,
      endpoints.sourceX,
      endpoints.sourceY,
      endpoints.targetX,
      endpoints.targetY,
      endpoints.targetFace
    );
    this.canvas.appendChild(svgEl);

    this.connections.set(exitId, {
      scope,
      fromId: exitId,
      toId,
      svgEl,
      pathEl,
      arrowEl
    });

    // Make arrowhead draggable for picking up existing connections
    const DRAG_THRESHOLD = 5;
    const onArrowMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const startX = e.clientX;
      const startY = e.clientY;

      const onMove = (me: MouseEvent) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          this.startDrag(exitId, scope, toId, me);
        }
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    arrowEl.addEventListener('mousedown', onArrowMouseDown);

    // Mark the exit element as connected
    const exitEl = document.getElementById(exitId);
    if (exitEl) {
      exitEl.classList.add('connected');
    }

    // Create activity overlay if activity data exists for this segment
    if (this.activityData) {
      const activityKey = `${exitId}:${toId}`;
      const count = this.activityData.segments[activityKey];
      if (count && count > 0) {
        const overlayEl = this.createOverlayElement(count, activityKey);
        this.canvas.appendChild(overlayEl);
        this.overlays.set(exitId, overlayEl);
        this.updateOverlayPosition(exitId);
      }
    }

    return true;
  }

  private updateConnectionSVG(exitId: string) {
    const conn = this.connections.get(exitId);
    if (!conn) return;

    const endpoints = this.getConnectionEndpoints(conn.fromId, conn.toId);
    if (!endpoints) return;

    this.updateSVGPath(
      conn.pathEl,
      conn.arrowEl,
      endpoints.sourceX,
      endpoints.sourceY,
      endpoints.targetX,
      endpoints.targetY,
      endpoints.targetFace
    );
    this.updateOverlayPosition(exitId);
  }

  private removeConnectionSVG(exitId: string) {
    const conn = this.connections.get(exitId);
    if (!conn) return;

    const overlay = this.overlays.get(exitId);
    if (overlay) {
      overlay.remove();
      this.overlays.delete(exitId);
    }

    conn.svgEl.remove();
    this.connections.delete(exitId);
  }

  // --- Repaint ---

  public repaintEverything() {
    this.connections.forEach((_conn, exitId) => {
      this.updateConnectionSVG(exitId);
    });
  }

  public revalidate(ids: string[]) {
    // Find all connections directly involving the given IDs
    const directExits: string[] = [];
    const affectedTargets = new Set<string>();

    this.connections.forEach((conn, exitId) => {
      if (
        ids.includes(conn.fromId) ||
        ids.includes(conn.toId) ||
        ids.includes(conn.scope)
      ) {
        directExits.push(exitId);
        affectedTargets.add(conn.toId);
      }
    });

    // Also repaint sibling connections that share a target
    // (so anchor distribution stays correct during drag)
    const allExitsToRepaint = new Set(directExits);
    this.connections.forEach((conn, exitId) => {
      if (affectedTargets.has(conn.toId)) {
        allExitsToRepaint.add(exitId);
      }
    });

    allExitsToRepaint.forEach((exitId) => {
      this.updateConnectionSVG(exitId);
    });
  }

  // --- Connection removal ---

  public forgetNode(nodeId: string) {
    // Remove all connections where this node is source or target
    const toRemove: string[] = [];
    this.connections.forEach((conn, exitId) => {
      if (conn.scope === nodeId || conn.toId === nodeId) {
        toRemove.push(exitId);
      }
    });
    toRemove.forEach((exitId) => this.removeConnectionSVG(exitId));

    // Remove source listeners for exits of this node
    const exitEls = document.getElementById(nodeId)?.querySelectorAll('.exit');
    if (exitEls) {
      exitEls.forEach((el) => {
        const id = el.id;
        if (this.sources.has(id)) {
          this.sources.get(id)();
          this.sources.delete(id);
        }
      });
    }
  }

  public removeNodeConnections(nodeId: string, exitIds?: string[]) {
    // Only remove outbound connections from this node's exits.
    // Inbound connections are managed by their source nodes and
    // will repaint correctly on the next revalidate.
    const exits =
      exitIds ||
      Array.from(
        document.getElementById(nodeId)?.querySelectorAll('.exit') || []
      ).map((el) => el.id);

    exits.forEach((exitId) => this.removeConnectionSVG(exitId));
  }

  public removeExitConnection(exitId: string): boolean {
    if (!this.connections.has(exitId)) return false;
    this.removeConnectionSVG(exitId);
    return true;
  }

  public removeAllEndpoints(nodeId: string) {
    // Remove source listeners for this node's exits
    const exitEls = document.getElementById(nodeId)?.querySelectorAll('.exit');
    if (exitEls) {
      exitEls.forEach((el) => {
        const id = el.id;
        if (this.sources.has(id)) {
          this.sources.get(id)();
          this.sources.delete(id);
        }
      });
    }
  }

  // --- Connection state ---

  public setConnectionRemovingState(
    exitId: string,
    isRemoving: boolean
  ): boolean {
    const conn = this.connections.get(exitId);
    if (!conn) return false;

    if (isRemoving) {
      conn.svgEl.classList.add('removing');
    } else {
      conn.svgEl.classList.remove('removing');
    }
    return true;
  }

  // --- Activity overlays ---

  public setActivityData(
    activityData: { segments: { [key: string]: number } } | null
  ) {
    this.activityData = activityData;
    this.clearRecentContactsCache();
    this.updateActivityOverlays();
  }

  private updateActivityOverlays() {
    if (!this.activityData) {
      this.overlays.forEach((el) => el.remove());
      this.overlays.clear();
      return;
    }

    const activeExitIds = new Set<string>();

    this.connections.forEach((conn, exitId) => {
      const activityKey = `${conn.fromId}:${conn.toId}`;
      const count = this.activityData.segments[activityKey];

      if (count && count > 0) {
        activeExitIds.add(exitId);
        let overlayEl = this.overlays.get(exitId);

        if (!overlayEl) {
          overlayEl = this.createOverlayElement(count, activityKey);
          this.canvas.appendChild(overlayEl);
          this.overlays.set(exitId, overlayEl);
        } else {
          overlayEl.textContent = count.toLocaleString();
          overlayEl.setAttribute('data-activity-key', activityKey);
        }

        this.updateOverlayPosition(exitId);
      }
    });

    // Remove overlays for connections that no longer have activity
    this.overlays.forEach((el, exitId) => {
      if (!activeExitIds.has(exitId)) {
        el.remove();
        this.overlays.delete(exitId);
      }
    });
  }

  private createOverlayElement(
    count: number,
    activityKey: string
  ): HTMLElement {
    const el = document.createElement('div');
    el.className = 'activity-overlay';
    el.textContent = count.toLocaleString();
    el.setAttribute('data-activity-key', activityKey);

    el.addEventListener('mouseenter', () => {
      const flowUuid = this.getFlowUuid();
      if (flowUuid) {
        this.fetchRecentContacts(activityKey, flowUuid);
        this.showContactsTimeout = window.setTimeout(() => {
          this.showRecentContacts(activityKey, flowUuid);
        }, 500);
      }
    });

    el.addEventListener('mouseleave', () => {
      if (this.showContactsTimeout) {
        clearTimeout(this.showContactsTimeout);
        this.showContactsTimeout = null;
      }
      this.hoveredActivityKey = null;
      this.hideRecentContacts();
    });

    return el;
  }

  private updateOverlayPosition(exitId: string) {
    const overlayEl = this.overlays.get(exitId);
    const conn = this.connections.get(exitId);
    if (!overlayEl || !conn) return;

    const endpoints = this.getConnectionEndpoints(conn.fromId, conn.toId);
    if (!endpoints) return;

    overlayEl.style.position = 'absolute';
    overlayEl.style.left = `${endpoints.sourceX}px`;
    overlayEl.style.top = `${endpoints.sourceY + EXIT_STUB / 2}px`;
    overlayEl.style.transform = 'translate(-50%, -50%)';
  }

  private getFlowUuid(): string | null {
    return this.editor?.definition?.uuid || null;
  }

  // --- Recent contacts ---

  private async fetchRecentContacts(activityKey: string, flowUuid: string) {
    if (
      this.recentContactsCache[activityKey] ||
      this.pendingFetches[activityKey]
    ) {
      return;
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
      this.recentContactsCache[activityKey] = Array.isArray(data)
        ? data
        : data.results || [];
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch recent contacts:', error);
      }
    } finally {
      delete this.pendingFetches[activityKey];
    }
  }

  private async showRecentContacts(activityKey: string, flowUuid: string) {
    const overlayElement = this.findOverlayForActivityKey(activityKey);
    if (!overlayElement) return;

    if (this.hideContactsTimeout) {
      clearTimeout(this.hideContactsTimeout);
      this.hideContactsTimeout = null;
    }

    this.hoveredActivityKey = activityKey;

    if (!this.recentContactsPopup) {
      this.recentContactsPopup = document.createElement('div');
      this.recentContactsPopup.className = 'recent-contacts-popup';
      this.recentContactsPopup.style.position = 'absolute';
      this.recentContactsPopup.style.zIndex = '1015';
      this.recentContactsPopup.style.display = 'none';
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
          if (contactUuid) {
            this.editor.fireCustomEvent('temba-contact-clicked', {
              uuid: contactUuid
            });
          }
        }
      };
    }

    if (this.recentContactsCache[activityKey]) {
      this.renderRecentContactsPopup(this.recentContactsCache[activityKey]);
      this.positionPopup(overlayElement);
    } else {
      this.recentContactsPopup.innerHTML =
        '<div class="no-contacts-message">Loading...</div>';
      this.positionPopup(overlayElement);
      await this.fetchRecentContacts(activityKey, flowUuid);
      if (this.hoveredActivityKey === activityKey) {
        this.renderRecentContactsPopup(
          this.recentContactsCache[activityKey] || []
        );
        this.positionPopup(overlayElement);
      }
    }
  }

  private findOverlayForActivityKey(activityKey: string): HTMLElement | null {
    for (const [, el] of this.overlays) {
      if (el.getAttribute('data-activity-key') === activityKey) {
        return el;
      }
    }
    return null;
  }

  private positionPopup(overlayElement: HTMLElement) {
    if (!this.recentContactsPopup) return;
    const rect = overlayElement.getBoundingClientRect();
    this.recentContactsPopup.style.left = `${rect.left + window.scrollX}px`;
    this.recentContactsPopup.style.top = `${
      rect.bottom + window.scrollY + 5
    }px`;
    this.recentContactsPopup.style.display = '';
    this.recentContactsPopup.classList.remove('show');
    void this.recentContactsPopup.offsetWidth;
    this.recentContactsPopup.classList.add('show');
  }

  private renderRecentContactsPopup(recentContacts: any[]) {
    if (!this.recentContactsPopup) return;

    if (recentContacts.length === 0) {
      this.recentContactsPopup.innerHTML =
        '<div class="no-contacts-message">No Recent Contacts</div>';
      return;
    }

    let html = '<div class="popup-title">Recent Contacts</div>';
    recentContacts.forEach((contact: any) => {
      html += '<div class="contact-row">';
      html += `<div class="contact-name" data-uuid="${contact.contact.uuid}">${contact.contact.name}</div>`;
      if (contact.operand) {
        html += `<div class="contact-operand">${contact.operand}</div>`;
      }
      if (contact.time) {
        const time = new Date(contact.time);
        const diffMs = Date.now() - time.getTime();
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
      html += '</div>';
    });
    this.recentContactsPopup.innerHTML = html;
  }

  private hideRecentContacts(wait = true) {
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

  public clearRecentContactsCache() {
    this.recentContactsCache = {};
    Object.values(this.pendingFetches).forEach((controller) =>
      controller.abort()
    );
    this.pendingFetches = {};
  }

  // --- Drag-and-drop ---

  private startDrag(
    exitId: string,
    scope: string,
    originalTargetId: string | null,
    e: MouseEvent
  ) {
    // Remove existing connection SVG for this exit (the connection is being dragged away)
    this.removeConnectionSVG(exitId);

    const { svgEl, pathEl, arrowEl } = this.createSVGElement();
    svgEl.classList.add('dragging');
    // Ensure the drag SVG never intercepts mouse events (e.g. hover detection on nodes)
    pathEl.style.pointerEvents = 'none';
    arrowEl.style.pointerEvents = 'none';
    this.canvas.appendChild(svgEl);

    // Calculate source point
    const exitEl = document.getElementById(exitId);
    if (!exitEl) {
      svgEl.remove();
      return;
    }

    const canvasRect = this.canvas.getBoundingClientRect();
    const exitRect = exitEl.getBoundingClientRect();
    const sourceX = exitRect.left + exitRect.width / 2 - canvasRect.left;
    const sourceY = exitRect.bottom - canvasRect.top;

    const aw = ARROW_HALF_WIDTH;
    const al = ARROW_LENGTH;
    const stubBehindArrow = 8;

    // Update the drag path and arrow based on cursor position.
    // Arrow trails just before the cursor (between source and cursor).
    const cursorGap = CURSOR_GAP;
    const updateDragPath = (cx: number, cy: number) => {
      const goingUp = cy < sourceY;

      let routeFace: TargetFace = 'top';
      if (goingUp) {
        routeFace = cx < sourceX ? 'left' : 'right';
      }

      // Position the arrow so its top edge sits just before the cursor.
      // "Top" = smallest Y on screen, which is the base for a downward
      // arrow and the tip for an upward arrow.
      let arrowBaseY: number;
      if (goingUp) {
        // Arrow points up: tip just below cursor, base below that
        arrowBaseY = cy + cursorGap + al;
      } else {
        // Arrow points down: base just above cursor, tip below
        arrowBaseY = cy - cursorGap;
      }

      const d = calculateFlowchartPath(
        sourceX,
        sourceY,
        cx,
        arrowBaseY,
        EXIT_STUB,
        goingUp ? 0 : stubBehindArrow,
        5,
        routeFace
      );
      pathEl.setAttribute('d', d);

      if (goingUp) {
        const tipY = cy + cursorGap;
        arrowEl.setAttribute(
          'points',
          `${cx},${tipY} ${cx - aw},${arrowBaseY} ${cx + aw},${arrowBaseY}`
        );
      } else {
        const tipY = arrowBaseY + al;
        arrowEl.setAttribute(
          'points',
          `${cx},${tipY} ${cx - aw},${arrowBaseY} ${cx + aw},${arrowBaseY}`
        );
      }
    };

    // Initial path to cursor
    const cursorX = e.clientX - canvasRect.left;
    const cursorY = e.clientY - canvasRect.top;
    updateDragPath(cursorX, cursorY);

    this.connectionDragging = true;

    const onMove = (me: MouseEvent) => {
      const cx = me.clientX - canvasRect.left;
      const cy = me.clientY - canvasRect.top;
      updateDragPath(cx, cy);
    };

    const onUp = (_me: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);

      // Remove the drag SVG
      svgEl.remove();
      this.connectionDragging = false;
      this.dragState = null;

      // Fire abort event so Editor can handle connection logic
      this.notifyListeners('connection:abort', {
        source: exitEl,
        sourceId: exitId,
        target: { id: originalTargetId },
        data: { nodeId: scope }
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    this.dragState = {
      sourceId: exitId,
      scope,
      originalTargetId,
      svgEl,
      pathEl,
      arrowEl,
      onMove,
      onUp
    };

    // Fire drag event so Editor knows a drag has started
    this.notifyListeners('connection:drag', {
      sourceId: exitId,
      sourceX,
      sourceY,
      data: { nodeId: scope },
      target: { id: originalTargetId }
    });
  }

  // --- Reset ---

  public reset() {
    if (this.connectionWait) {
      cancelAnimationFrame(this.connectionWait);
      this.connectionWait = null;
    }
    this.pendingConnections = [];

    // Remove all connection SVGs
    this.connections.forEach((conn) => conn.svgEl.remove());
    this.connections.clear();

    // Remove all activity overlays
    this.overlays.forEach((el) => el.remove());
    this.overlays.clear();

    // Clean up recent contacts popup
    this.hideRecentContacts(false);
    if (this.recentContactsPopup) {
      this.recentContactsPopup.remove();
      this.recentContactsPopup = null;
    }
    this.recentContactsCache = {};
    Object.values(this.pendingFetches).forEach((c) => c.abort());
    this.pendingFetches = {};

    // Remove all source listeners
    this.sources.forEach((cleanup) => cleanup());
    this.sources.clear();

    // Clean up any active drag
    if (this.dragState) {
      document.removeEventListener('mousemove', this.dragState.onMove);
      document.removeEventListener('mouseup', this.dragState.onUp);
      this.dragState.svgEl.remove();
      this.dragState = null;
      this.connectionDragging = false;
    }
  }
}
