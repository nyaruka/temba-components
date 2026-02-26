import { Node, FlowPosition, NodeUI } from '../store/flow-definition';
import { snapToGrid } from './utils';

const VERTICAL_GAP = 80;
const HORIZONTAL_GAP = 60;

interface NodeSize {
  width: number;
  height: number;
}

/**
 * Calculates a layered layout for a flow, placing the start node at the
 * upper-left and arranging the flow downward. Sibling nodes at splits
 * share the same horizontal plane.
 */
export function calculateLayeredLayout(
  nodes: Node[],
  nodeUIs: Record<string, NodeUI>,
  startNodeUuid: string,
  getNodeSize: (uuid: string) => NodeSize
): Record<string, FlowPosition> {
  if (nodes.length === 0) return {};

  const nodeSet = new Set(nodes.map((n) => n.uuid));

  // Build deduplicated adjacency lists
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();

  for (const node of nodes) {
    const seen = new Set<string>();
    const childUuids: string[] = [];
    for (const exit of node.exits) {
      if (
        exit.destination_uuid &&
        nodeSet.has(exit.destination_uuid) &&
        !seen.has(exit.destination_uuid)
      ) {
        seen.add(exit.destination_uuid);
        childUuids.push(exit.destination_uuid);
        const p = parents.get(exit.destination_uuid) || [];
        p.push(node.uuid);
        parents.set(exit.destination_uuid, p);
      }
    }
    children.set(node.uuid, childUuids);
  }

  // Find back-edges via DFS so we can ignore cycles during layering
  const backEdges = findBackEdges(startNodeUuid, children);

  // Assign layers using longest-path on the DAG (ignoring back-edges)
  const layers = assignLayers(
    startNodeUuid,
    nodes,
    children,
    parents,
    backEdges
  );

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  for (const [uuid, layer] of layers) {
    const group = layerGroups.get(layer) || [];
    group.push(uuid);
    layerGroups.set(layer, group);
  }

  // Order nodes within each layer using barycenter heuristic
  const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);
  orderNodesInLayers(sortedLayers, layerGroups, parents, layers);

  // Gather sizes
  const sizes = new Map<string, NodeSize>();
  for (const node of nodes) {
    sizes.set(node.uuid, getNodeSize(node.uuid));
  }

  // Compute positions
  return computePositions(
    sortedLayers,
    layerGroups,
    sizes,
    parents,
    layers,
    startNodeUuid
  );
}

/**
 * Finds back-edges (cycle-forming edges) via DFS from the start node.
 * Returns a set of "parentUuid->childUuid" strings representing edges to ignore.
 */
function findBackEdges(
  startNodeUuid: string,
  children: Map<string, string[]>
): Set<string> {
  const backEdges = new Set<string>();
  const visiting = new Set<string>(); // currently on the DFS stack
  const visited = new Set<string>(); // fully processed

  function dfs(node: string): void {
    visiting.add(node);
    visited.add(node);

    for (const child of children.get(node) || []) {
      if (visiting.has(child)) {
        backEdges.add(`${node}->${child}`);
      } else if (!visited.has(child)) {
        dfs(child);
      }
    }

    visiting.delete(node);
  }

  dfs(startNodeUuid);
  return backEdges;
}

/**
 * Assigns layers using topological processing order on the DAG
 * (back-edges removed). Each node's layer = max(parent layers) + 1,
 * giving the longest-path assignment so merge nodes sit below all parents.
 */
function assignLayers(
  startNodeUuid: string,
  nodes: Node[],
  children: Map<string, string[]>,
  parents: Map<string, string[]>,
  backEdges: Set<string>
): Map<string, number> {
  const layers = new Map<string, number>();
  layers.set(startNodeUuid, 0);

  // Build forward in-degree (ignoring back-edges) for topological processing
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node.uuid, 0);
  }
  for (const [parent, childList] of children) {
    for (const child of childList) {
      if (!backEdges.has(`${parent}->${child}`)) {
        inDegree.set(child, (inDegree.get(child) || 0) + 1);
      }
    }
  }

  // Process nodes in topological order (Kahn's algorithm)
  // Start with nodes that have no forward in-edges
  const queue: string[] = [];
  for (const [uuid, deg] of inDegree) {
    if (deg === 0) {
      queue.push(uuid);
      if (!layers.has(uuid)) {
        layers.set(uuid, 0);
      }
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layers.get(current)!;

    for (const child of children.get(current) || []) {
      if (backEdges.has(`${current}->${child}`)) continue;

      // Longest path: child layer = max of all parent layers + 1
      const newLayer = currentLayer + 1;
      if (!layers.has(child) || newLayer > layers.get(child)!) {
        layers.set(child, newLayer);
      }

      // Decrement in-degree; enqueue when all forward parents processed
      const remaining = inDegree.get(child)! - 1;
      inDegree.set(child, remaining);
      if (remaining === 0) {
        queue.push(child);
      }
    }
  }

  // Handle unreachable nodes (not reachable from start)
  const unreachable = nodes.filter((n) => !layers.has(n.uuid));
  if (unreachable.length > 0) {
    const maxLayer = Math.max(...Array.from(layers.values()), -1);
    let unreachableLayer = maxLayer + 2;
    for (const node of unreachable) {
      layers.set(node.uuid, unreachableLayer);
      unreachableLayer++;
    }
  }

  return layers;
}

/**
 * Orders nodes within each layer using a barycenter heuristic:
 * each node is positioned based on the average index of its parents
 * in layers above.
 */
function orderNodesInLayers(
  sortedLayers: number[],
  layerGroups: Map<number, string[]>,
  parents: Map<string, string[]>,
  layers: Map<string, number>
): void {
  const indexInLayer = new Map<string, number>();

  for (const layer of sortedLayers) {
    const group = layerGroups.get(layer)!;

    if (layer === sortedLayers[0]) {
      group.forEach((uuid, idx) => indexInLayer.set(uuid, idx));
      continue;
    }

    const barycenters: { uuid: string; value: number }[] = group.map(
      (uuid) => {
        // Only consider parents that are in layers above this one
        const nodeParents = (parents.get(uuid) || []).filter((p) => {
          const pl = layers.get(p);
          return pl !== undefined && pl < layer;
        });
        if (nodeParents.length === 0) {
          return { uuid, value: Infinity };
        }
        const sum = nodeParents.reduce((acc, p) => {
          return acc + (indexInLayer.get(p) ?? 0);
        }, 0);
        return { uuid, value: sum / nodeParents.length };
      }
    );

    barycenters.sort((a, b) => a.value - b.value);

    const sorted = barycenters.map((b) => b.uuid);
    layerGroups.set(layer, sorted);
    sorted.forEach((uuid, idx) => indexInLayer.set(uuid, idx));
  }
}

/**
 * Computes pixel positions for each node. Each node's ideal X is centered
 * under its parent(s), with overlap resolution to prevent collisions.
 */
function computePositions(
  sortedLayers: number[],
  layerGroups: Map<number, string[]>,
  sizes: Map<string, NodeSize>,
  parents: Map<string, string[]>,
  layers: Map<string, number>,
  startNodeUuid: string
): Record<string, FlowPosition> {
  const positions: Record<string, FlowPosition> = {};

  // Compute layer Y positions based on max node height per layer
  const layerTops = new Map<number, number>();
  let currentTop = 0;

  for (const layer of sortedLayers) {
    layerTops.set(layer, snapToGrid(currentTop));

    const group = layerGroups.get(layer)!;
    const maxHeight = Math.max(
      ...group.map((uuid) => sizes.get(uuid)?.height || 100)
    );
    currentTop += maxHeight + VERTICAL_GAP;
  }

  // Compute X positions layer by layer
  for (const layer of sortedLayers) {
    const group = layerGroups.get(layer)!;
    const top = layerTops.get(layer)!;

    if (layer === sortedLayers[0]) {
      // First layer: start node at top, others nudged down two grid squares
      let x = 0;
      for (const uuid of group) {
        const nodeTop = uuid === startNodeUuid ? top : top + 40;
        positions[uuid] = { left: snapToGrid(x), top: nodeTop };
        x += (sizes.get(uuid)?.width || 200) + HORIZONTAL_GAP;
      }
      continue;
    }

    // Compute total width of this row
    let totalWidth = 0;
    for (const uuid of group) {
      totalWidth += sizes.get(uuid)?.width || 200;
    }
    totalWidth += HORIZONTAL_GAP * (group.length - 1);

    // Find the center point to place this row under: midpoint of
    // the span of all parent centers for nodes in this layer
    const parentCenters: number[] = [];
    for (const uuid of group) {
      const nodeParents = (parents.get(uuid) || []).filter((p) => {
        const pl = layers.get(p);
        return pl !== undefined && pl < layer;
      });
      for (const pUuid of nodeParents) {
        const parentPos = positions[pUuid];
        if (parentPos) {
          const parentWidth = sizes.get(pUuid)?.width || 200;
          parentCenters.push(parentPos.left + parentWidth / 2);
        }
      }
    }

    // Center the row under the parent span, anchored left if not enough room
    let rowLeft: number;
    if (parentCenters.length > 0) {
      const spanCenter =
        (Math.min(...parentCenters) + Math.max(...parentCenters)) / 2;
      rowLeft = Math.max(0, spanCenter - totalWidth / 2);
    } else {
      rowLeft = 0;
    }

    // Place nodes left-to-right starting from rowLeft
    let x = rowLeft;
    for (const uuid of group) {
      const nodeWidth = sizes.get(uuid)?.width || 200;
      positions[uuid] = { left: snapToGrid(x), top };
      x = snapToGrid(x) + nodeWidth + HORIZONTAL_GAP;
    }
  }

  // Shift everything so the start node is at (0, 0)
  const startPos = positions[startNodeUuid];
  if (startPos) {
    const offsetX = startPos.left;
    const offsetY = startPos.top;

    for (const uuid of Object.keys(positions)) {
      positions[uuid] = {
        left: snapToGrid(Math.max(0, positions[uuid].left - offsetX)),
        top: snapToGrid(Math.max(0, positions[uuid].top - offsetY))
      };
    }
  }

  return positions;
}
