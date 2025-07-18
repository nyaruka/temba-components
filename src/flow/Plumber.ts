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
      radius: 6,
      connectedClass: 'plumb-connected',
      cssClass: 'plumb-source',
      hoverClass: 'plumb-source-hover'
    }
  },
  anchors: ['Bottom', 'Continuous'],
  dragAllowedWhenFull: false,
  deleteEndpointsOnEmpty: true,
  maxConnections: 1,
  source: true
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

  constructor(canvas: HTMLElement) {
    ready(() => {
      this.jsPlumb = newInstance({
        container: canvas,
        connectionsDetachable: true,
        endpointStyle: {
          fill: 'transparent'
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

      // don't allow jsplumb to automatically connect
      this.jsPlumb.bind(INTERCEPT_BEFORE_DROP, () => {});
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

  private connectionWait = null;

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
          const { fromId, toId } = connection;
          const fromElement = document.getElementById(fromId);
          const toElement = document.getElementById(toId);

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
            }
          });
        });
        this.pendingConnections = [];
      });
    }, 50);
  }

  public connectIds(fromId: string, toId: string) {
    this.pendingConnections.push({ fromId, toId });
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

    // Get the node element to find its exit elements
    const nodeElement = document.getElementById(nodeId);
    if (!nodeElement) return;

    const exitElements = nodeElement.querySelectorAll('.exit');
    const exitIds = Array.from(exitElements).map((exit) => exit.id);

    // Get all connections and identify ones to remove
    const connections = this.jsPlumb.getConnections();
    const connectionsToRemove = connections.filter((connection) => {
      const sourceId = connection.source.id;
      const targetId = connection.target.id;

      // Remove connections where:
      // - Target is the node itself (incoming connections)
      // - Source is one of the node's exits (outgoing connections)
      return targetId === nodeId || exitIds.includes(sourceId);
    });

    // Remove the connections
    connectionsToRemove.forEach((connection) => {
      this.jsPlumb.deleteConnection(connection);
    });

    // Remove all endpoints from the node and its exits
    this.jsPlumb.removeAllEndpoints(nodeElement);
    exitElements.forEach((exitElement) => {
      this.jsPlumb.removeAllEndpoints(exitElement);
    });
  }
}
