import {
  DotEndpoint,
  FlowchartConnector,
  newInstance,
  ready,
  RectangleEndpoint,
  EVENT_CONNECTION_DRAG,
  EVENT_CONNECTION_ABORT,
  INTERCEPT_BEFORE_DROP,
  EVENT_CONNECTION,
  EVENT_REVERT,
  INTERCEPT_BEFORE_DETACH,
  EVENT_CONNECTION_DETACHED
} from '@jsplumb/browser-ui';

const CONNECTOR_DEFAULTS = {
  type: FlowchartConnector.type,
  options: {
    stub: [20, 10],
    midpoint: 0.5,
    alwaysRespectStubs: true,
    cornerRadius: 5,
    cssClass: 'plumb-connector'
  }
};

const OVERLAYS_DEFAULTS = [
  {
    type: 'PlainArrow',
    options: {
      width: 13,
      length: 13,
      location: 0.999,
      cssClass: 'plumb-arrow'
    }
  }
];

export const SOURCE_DEFAULTS = {
  endpoint: {
    type: DotEndpoint.type,
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
    type: RectangleEndpoint.type,
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

export class Plumber {
  private jsPlumb = null;
  private pendingConnections = [];
  private connectionListeners = new Map();
  public connectionDragging = false;
  private connectionWait = null;

  constructor(canvas: HTMLElement) {
    ready(() => {
      this.jsPlumb = newInstance({
        container: canvas,
        connectionsDetachable: true,
        endpointStyle: {
          fill: 'green'
        },
        connector: CONNECTOR_DEFAULTS,
        connectionOverlays: OVERLAYS_DEFAULTS
      });

      // Bind to connection events
      this.jsPlumb.bind(EVENT_CONNECTION, (info) => {
        this.connectionDragging = false;
        this.notifyListeners(EVENT_CONNECTION, info);
      });

      // Bind to connection drag events
      this.jsPlumb.bind(EVENT_CONNECTION_DRAG, (info) => {
        this.connectionDragging = true;
        this.notifyListeners(EVENT_CONNECTION_DRAG, info);
      });

      this.jsPlumb.bind(EVENT_CONNECTION_ABORT, (info) => {
        this.connectionDragging = false;
        this.notifyListeners(EVENT_CONNECTION_ABORT, info);
      });

      this.jsPlumb.bind(EVENT_CONNECTION_DETACHED, (info) => {
        this.connectionDragging = false;
        this.notifyListeners(EVENT_CONNECTION_DETACHED, info);
      });

      this.jsPlumb.bind(EVENT_REVERT, (info) => {
        this.notifyListeners(EVENT_REVERT, info);
      });

      this.jsPlumb.bind(INTERCEPT_BEFORE_DROP, () => {
        // we always deny automatic connections
        return false;
      });
      this.jsPlumb.bind(INTERCEPT_BEFORE_DETACH, () => {});
    });
  }

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

  public makeTarget(uuid: string) {
    const element = document.getElementById(uuid);
    this.jsPlumb.addEndpoint(element, TARGET_DEFAULTS);
  }

  public makeSource(uuid: string) {
    const element = document.getElementById(uuid);
    this.jsPlumb.addEndpoint(element, SOURCE_DEFAULTS);
  }

  // we'll process our pending connections, but we want to debounce this
  public processPendingConnections() {
    // if we have a pending connection wait, clear it
    if (this.connectionWait) {
      clearTimeout(this.connectionWait);
      this.connectionWait = null;
    }

    // debounce the connection processing
    this.connectionWait = setTimeout(() => {
      this.jsPlumb.batch(() => {
        this.pendingConnections.forEach((connection) => {
          const { scope, fromId, toId } = connection;
          const fromElement = document.getElementById(fromId);
          const toElement = document.getElementById(toId);

          // delete any existing endpoints
          this.jsPlumb.selectEndpoints({ source: fromId }).deleteAll();

          const source = this.jsPlumb.addEndpoint(fromElement, {
            ...SOURCE_DEFAULTS,
            endpoint: {
              ...SOURCE_DEFAULTS.endpoint,
              options: {
                ...SOURCE_DEFAULTS.endpoint.options,
                cssClass: 'plumb-source connected'
              }
            }
          });

          const target = this.jsPlumb.addEndpoint(toElement, TARGET_DEFAULTS);
          this.jsPlumb.connect({
            source,
            target,
            connector: {
              ...CONNECTOR_DEFAULTS,
              options: { ...CONNECTOR_DEFAULTS.options, gap: [0, 5] }
            },
            data: {
              nodeId: scope
            }
          });
        });
        this.pendingConnections = [];
      });
    }, 50);
  }

  public connectIds(scope: string, fromId: string, toId: string) {
    this.pendingConnections.push({ scope, fromId, toId });
    this.processPendingConnections();
  }

  public repaintEverything() {
    if (this.jsPlumb) {
      this.jsPlumb.repaintEverything();
    }
  }

  public revalidate(ids: string[]) {
    if (!this.jsPlumb) return;
    this.jsPlumb.batch(() => {
      ids.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          this.jsPlumb.revalidate(element);
        }
      });
    });
  }

  public removeNodeConnections(nodeId: string) {
    if (!this.jsPlumb) return;

    const inbound = this.jsPlumb.select({ target: nodeId });
    const exitIds =
      Array.from(
        document.getElementById(nodeId)?.querySelectorAll('.exit') || []
      ).map((exit) => {
        return exit.id;
      }) || [];

    inbound.deleteAll();
    this.jsPlumb.select({ source: exitIds }).deleteAll();
    this.jsPlumb.selectEndpoints({ source: exitIds }).deleteAll();
  }

  /**
   * Get all inbound connections to a node
   * @param nodeId The ID of the node to get inbound connections for
   * @returns Array of connection info with sourceId (exit uuid)
   */
  public getInboundConnections(nodeId: string): Array<{ sourceId: string }> {
    if (!this.jsPlumb) return [];

    const connections = this.jsPlumb.getConnections({ target: nodeId });
    return connections.map((connection) => ({
      sourceId: connection.source.id
    }));
  }

  public removeExitConnection(exitId: string) {
    if (!this.jsPlumb) return;

    const exitElement = document.getElementById(exitId);
    if (!exitElement) return;

    // Get all connections from this exit
    const connections = this.jsPlumb.getConnections({ source: exitElement });

    // Remove the connections
    connections.forEach((connection) => {
      this.jsPlumb.deleteConnection(connection);
    });

    // Re-create the source endpoint (now without connection)
    this.jsPlumb.removeAllEndpoints(exitElement);
    this.makeSource(exitId);

    return connections.length > 0;
  }

  /**
   * Set the removing state for an exit's connection
   * @param exitId The ID of the exit whose connections should be marked as removing
   * @returns true if connections were found and updated, false otherwise
   */
  public setConnectionRemovingState(
    exitId: string,
    isRemoving: boolean
  ): boolean {
    if (!this.jsPlumb) return false;

    const exitElement = document.getElementById(exitId);
    if (!exitElement) return false;

    // Get all connections from this exit
    const connections = this.jsPlumb.getConnections({ source: exitElement });

    if (connections.length === 0) return false;

    // Update the connections' CSS classes
    connections.forEach((connection) => {
      if (isRemoving) {
        connection.addClass('removing');
      } else {
        connection.removeClass('removing');
      }
    });

    return true;
  }
}
