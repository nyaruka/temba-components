import {
  DotEndpoint,
  FlowchartConnector,
  newInstance,
  ready,
  RectangleEndpoint
} from '@jsplumb/browser-ui';

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
  maxConnections: 1,
  dragAllowedWhenFull: false,
  deleteEndpointsOnEmpty: true,
  isSource: true
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
  dragAllowedWhenFull: false,
  deleteEndpointsOnEmpty: true,
  isTarget: true
};

export class Plumber {
  private jsPlumb = null;
  private pendingConnections = [];

  constructor(canvas: HTMLElement) {
    ready(() => {
      this.jsPlumb = newInstance({
        container: canvas
      });
    });
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
              type: FlowchartConnector.type,
              options: {
                stub: 12,
                midpoint: 0.75,
                alwaysRespectStubs: false,
                gap: [0, 5],
                cornerRadius: 3,
                cssClass: 'plumb-connector'
              }
            },
            overlays: [
              {
                type: 'PlainArrow',
                options: {
                  width: 13,
                  length: 13,
                  location: 0.999,
                  cssClass: 'plumb-arrow'
                }
              }
            ]
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
}
