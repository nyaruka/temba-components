import {
  DotEndpoint,
  FlowchartConnector,
  newInstance,
  ready,
  RectangleEndpoint,
  BeforeDropParams
} from '@jsplumb/browser-ui';
import { getStore } from '../store/Store';
import { FlowDefinition, Node, Exit } from '../store/flow-definition';

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

      // Set up beforeDrop interceptor
      this.jsPlumb.bind('beforeDrop', (params: BeforeDropParams) => this.isConnectionAllowed(params));

      // Listen for successful connections to update the flow definition
      this.jsPlumb.bind('connection', (info) => {
        this.handleNewConnection(info.sourceId, info.targetId);
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
  public elevateNodeConnections(nodeId: string) {
    if (!this.jsPlumb) return;

    // Get all connections
    const connections = this.jsPlumb.getConnections();

    // Get the node element to find its exit elements
    const nodeElement = document.getElementById(nodeId);
    const exitElements = nodeElement
      ? nodeElement.querySelectorAll('.exit')
      : [];
    const exitIds = Array.from(exitElements).map((exit) => exit.id);

    connections.forEach((connection) => {
      const sourceId = connection.source.id;
      const targetId = connection.target.id;

      // Check if this connection involves the dragged node:
      // - Incoming: target is the node itself
      // - Outgoing: source is one of the node's exits
      if (targetId === nodeId || exitIds.includes(sourceId)) {
        // Add elevated class to the connector element
        const connectorElement = connection.connector.canvas;
        if (connectorElement) {
          connectorElement.classList.add('elevated');
        }
      }
    });
  }

  public restoreNodeConnections(nodeId: string) {
    if (!this.jsPlumb) return;

    // Get all connections
    const connections = this.jsPlumb.getConnections();

    // Get the node element to find its exit elements
    const nodeElement = document.getElementById(nodeId);
    const exitElements = nodeElement
      ? nodeElement.querySelectorAll('.exit')
      : [];
    const exitIds = Array.from(exitElements).map((exit) => exit.id);

    connections.forEach((connection) => {
      const sourceId = connection.source.id;
      const targetId = connection.target.id;

      // Check if this connection involves the node:
      // - Incoming: target is the node itself
      // - Outgoing: source is one of the node's exits
      if (targetId === nodeId || exitIds.includes(sourceId)) {
        // Remove elevated class from the connector element
        const connectorElement = connection.connector.canvas;
        if (connectorElement) {
          connectorElement.classList.remove('elevated');
        }
      }
    });
  }

  /**
   * Handles a successful new connection by updating the flow definition
   */
  private handleNewConnection(sourceId: string, targetId: string): void {
    const store = getStore();
    const flowDefinition = store.getState().flowDefinition;
    
    if (!flowDefinition) {
      return;
    }

    // Find the exit that corresponds to the sourceId and update its destination
    for (const node of flowDefinition.nodes) {
      for (const exit of node.exits) {
        if (exit.uuid === sourceId) {
          // Update the exit's destination
          exit.destination_uuid = targetId;
          
          // Mark the flow as dirty to trigger saving
          store.getState().setDirtyDate(new Date());
          return;
        }
      }
    }
  }

  /**
   * Validates if a connection between source and target is allowed.
   * The main rule is: a path cannot come back to itself without first going through a "Wait for Response" node.
   */
  private isConnectionAllowed(params: BeforeDropParams): boolean {
    const { sourceId, targetId } = params;
    
    // Get the flow definition from the store
    const flowDefinition = getStore().getState().flowDefinition;
    if (!flowDefinition) {
      return true; // Allow connection if no flow definition available
    }

    // Find the source exit and determine which node it belongs to
    const sourceNodeId = this.findNodeIdForExit(sourceId, flowDefinition);
    const targetNodeId = targetId;

    if (!sourceNodeId || !targetNodeId) {
      return true; // Allow if we can't determine nodes
    }

    // Check if this would create a cycle without a "Wait for Response" node
    return !this.wouldCreateInvalidCycle(sourceNodeId, targetNodeId, flowDefinition);
  }

  /**
   * Finds the node ID that contains the given exit ID
   */
  private findNodeIdForExit(exitId: string, flowDefinition: FlowDefinition): string | null {
    for (const node of flowDefinition.nodes) {
      for (const exit of node.exits) {
        if (exit.uuid === exitId) {
          return node.uuid;
        }
      }
    }
    return null;
  }

  /**
   * Checks if connecting from sourceNodeId to targetNodeId would create a cycle
   * without passing through a "Wait for Response" node
   */
  private wouldCreateInvalidCycle(sourceNodeId: string, targetNodeId: string, flowDefinition: FlowDefinition): boolean {
    // If source and target are the same, it's a direct self-loop
    if (sourceNodeId === targetNodeId) {
      return !this.isWaitForResponseNode(sourceNodeId, flowDefinition);
    }

    // Check if there's a path from targetNodeId back to sourceNodeId
    // If such a path exists and doesn't contain a "Wait for Response" node, the connection is invalid
    const visited = new Set<string>();
    const pathFromTarget = this.findPathToNode(targetNodeId, sourceNodeId, flowDefinition, visited);
    
    if (pathFromTarget.length > 0) {
      // There's a path from target back to source - check if the path (including target) contains a "Wait for Response" node
      const allNodesInCycle = [targetNodeId, ...pathFromTarget.slice(0, -1)]; // exclude source node as it's the end
      return !allNodesInCycle.some(nodeId => this.isWaitForResponseNode(nodeId, flowDefinition));
    }

    return false; // No cycle detected, connection is allowed
  }

  /**
   * Checks if a node is a "Wait for Response" node
   */
  private isWaitForResponseNode(nodeId: string, flowDefinition: FlowDefinition): boolean {
    const node = flowDefinition.nodes.find(n => n.uuid === nodeId);
    if (!node) return false;

    // Check if any action in the node is wait_for_response
    return node.actions.some(action => action.type === 'wait_for_response');
  }

  /**
   * Finds a path from startNodeId to targetNodeId using DFS
   * Returns the path as an array of node IDs (excluding the start node)
   */
  private findPathToNode(startNodeId: string, targetNodeId: string, flowDefinition: FlowDefinition, visited: Set<string>): string[] {
    if (visited.has(startNodeId)) {
      return []; // Avoid infinite loops
    }

    visited.add(startNodeId);

    const startNode = flowDefinition.nodes.find(n => n.uuid === startNodeId);
    if (!startNode) {
      return [];
    }

    // Check all exits of the current node
    for (const exit of startNode.exits) {
      if (exit.destination_uuid) {
        if (exit.destination_uuid === targetNodeId) {
          // Found direct path to target
          return [targetNodeId];
        }

        // Recursively search from the destination
        const pathFromDestination = this.findPathToNode(exit.destination_uuid, targetNodeId, flowDefinition, new Set(visited));
        if (pathFromDestination.length > 0) {
          // Found path through this destination
          return [exit.destination_uuid, ...pathFromDestination];
        }
      }
    }

    return []; // No path found
  }
}
