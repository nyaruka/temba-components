import { html } from 'lit-html';
import { NamedObject, FlowPosition, Node, NodeUI } from '../store/flow-definition';

/**
 * Renders a single line item with optional icon
 */
export const renderLineItem = (name: string, icon?: string) => {
  return html`<div style="display:flex;items-align:center;">
    ${icon
      ? html`<temba-icon name=${icon} style="margin-right:0.5em"></temba-icon>`
      : null}
    <div
      style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;"
    >
      ${name}
    </div>
  </div>`;
};

/**
 * Renders a list of named objects with optional icon, showing up to 3 items
 * with a "+X more" indicator if there are more items
 */
export const renderNamedObjects = (assets: NamedObject[], icon?: string) => {
  return renderStringList(
    assets.map((asset) => asset.name),
    icon
  );
};

/**
 * Renders a list of strings with optional icon, showing up to 3 items
 * with a "+X more" indicator if there are more items
 */
export const renderStringList = (items: string[], icon?: string) => {
  const itemElements = [];
  const maxDisplay = 3;

  // Show up to 3 items, or all 4 if exactly 4 items
  const displayCount =
    items.length === 4 ? 4 : Math.min(maxDisplay, items.length);

  for (let i = 0; i < displayCount; i++) {
    const item = items[i];
    itemElements.push(renderLineItem(item, icon));
  }

  // Add "+X more" if there are more than 3 items (and not exactly 4)
  if (items.length > maxDisplay && items.length !== 4) {
    const remainingCount = items.length - maxDisplay;
    itemElements.push(html`<div
      style="display:flex;items-align:center;margin-top:0.2em;"
    >
      ${icon
        ? html`<div style="margin-right:0.4em; width: 1em;"></div>` // spacing placeholder
        : null}
      <div style="font-size:0.8em">+${remainingCount} more</div>
    </div>`);
  }
  return itemElements;
};

export interface Scheme {
  scheme: string;
  name: string;
  path: string;
  excludeFromSplit?: boolean;
}

export const SCHEMES: Scheme[] = [
  {
    scheme: 'tel',
    name: 'SMS',
    path: 'Phone Number'
  },
  {
    scheme: 'whatsapp',
    name: 'WhatsApp',
    path: 'WhatsApp Number'
  },
  {
    scheme: 'facebook',
    name: 'Facebook',
    path: 'Facebook ID'
  },
  {
    scheme: 'instagram',
    name: 'Instagram',
    path: 'Instagram ID'
  },
  {
    scheme: 'twitterid',
    name: 'Twitter',
    path: 'Twitter ID',
    excludeFromSplit: true
  },
  {
    scheme: 'telegram',
    name: 'Telegram',
    path: 'Telegram ID'
  },
  {
    scheme: 'viber',
    name: 'Viber',
    path: 'Viber ID'
  },
  {
    scheme: 'line',
    name: 'Line',
    path: 'Line ID'
  },
  {
    scheme: 'wechat',
    name: 'WeChat',
    path: 'WeChat ID'
  },
  {
    scheme: 'fcm',
    name: 'Firebase',
    path: 'Firebase ID'
  },
  {
    scheme: 'jiochat',
    name: 'JioChat',
    path: 'JioChat ID'
  },
  {
    scheme: 'freshchat',
    name: 'Freshchat',
    path: 'Freshchat ID'
  },
  {
    scheme: 'mailto',
    name: 'Email',
    path: 'Email Address',
    excludeFromSplit: true
  },
  {
    scheme: 'twitter',
    name: 'Twitter',
    path: 'Twitter Handle',
    excludeFromSplit: true
  },
  {
    scheme: 'vk',
    name: 'VK',
    path: 'VK ID'
  },
  {
    scheme: 'discord',
    name: 'Discord',
    path: 'Discord ID'
  },
  {
    scheme: 'webchat',
    name: 'Webchat',
    path: 'Webchat ID',
    excludeFromSplit: true
  },
  {
    scheme: 'rocketchat',
    name: 'RocketChat',
    path: 'RocketChat ID'
  },
  {
    scheme: 'ext',
    name: 'External',
    path: 'External ID'
  }
];

/**
 * Represents the bounding box of a node on the canvas
 */
export interface NodeBounds {
  uuid: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Minimum vertical spacing between nodes (in pixels)
 */
const MIN_NODE_SPACING = 20;

/**
 * Small buffer to avoid floating point precision issues in overlap detection (in pixels)
 * This prevents false positives when nodes are exactly adjacent (e.g., bottom of one node
 * at exactly the same position as top of another)
 */
const OVERLAP_BUFFER = 0.5;

/**
 * Gets the bounding box for a node from the DOM
 * 
 * @param nodeUuid - The UUID of the node
 * @param position - The current position of the node
 * @param element - Optional pre-fetched DOM element (recommended for performance when checking multiple nodes)
 * @returns NodeBounds object or null if element not found
 * 
 * Note: When element is not provided, performs a DOM query which may impact performance
 * during bulk collision detection. Consider fetching elements beforehand when possible.
 */
export const getNodeBounds = (
  nodeUuid: string,
  position: FlowPosition,
  element?: HTMLElement
): NodeBounds | null => {
  // If element is provided, use it; otherwise try to find it in DOM
  const nodeElement =
    element || document.querySelector(`[id="${nodeUuid}"]`) as HTMLElement;

  if (!nodeElement) {
    return null;
  }

  const rect = nodeElement.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  return {
    uuid: nodeUuid,
    left: position.left,
    top: position.top,
    right: position.left + width,
    bottom: position.top + height,
    width,
    height
  };
};

/**
 * Checks if two node bounding boxes overlap
 */
export const nodesOverlap = (
  bounds1: NodeBounds,
  bounds2: NodeBounds
): boolean => {
  // Use a small buffer to avoid floating point precision issues
  const buffer = OVERLAP_BUFFER;

  return !(
    bounds1.right <= bounds2.left + buffer ||
    bounds1.left >= bounds2.right - buffer ||
    bounds1.bottom <= bounds2.top + buffer ||
    bounds1.top >= bounds2.bottom - buffer
  );
};

/**
 * Detects all collisions between a node and other nodes
 */
export const detectCollisions = (
  targetBounds: NodeBounds,
  allBounds: NodeBounds[]
): NodeBounds[] => {
  return allBounds.filter(
    (bounds) =>
      bounds.uuid !== targetBounds.uuid && nodesOverlap(targetBounds, bounds)
  );
};

/**
 * Calculates the new positions needed to resolve all collisions
 * Nodes are only moved downward, never up, left, or right
 * Returns a map of node UUIDs to their new positions
 */
export const calculateReflowPositions = (
  movedNodeUuid: string,
  movedNodeBounds: NodeBounds,
  allBounds: NodeBounds[],
  droppedBelowMidpoint: boolean = false
): Map<string, FlowPosition> => {
  const newPositions = new Map<string, FlowPosition>();

  // If dropped below midpoint, the moved node should move down instead
  if (droppedBelowMidpoint) {
    // Find all nodes that collide with the moved node
    const collisions = detectCollisions(movedNodeBounds, allBounds);

    if (collisions.length > 0) {
      // Find the highest bottom position of all colliding nodes
      const maxBottom = Math.max(...collisions.map((b) => b.bottom));

      // Move the dropped node below all colliding nodes
      const newTop = maxBottom + MIN_NODE_SPACING;
      newPositions.set(movedNodeUuid, {
        left: movedNodeBounds.left,
        top: newTop
      });

      // Update the moved node bounds for further collision checks
      movedNodeBounds = {
        ...movedNodeBounds,
        top: newTop,
        bottom: newTop + movedNodeBounds.height
      };
    }
  }

  // Now check for any remaining collisions and move other nodes down
  const processedNodes = new Set<string>();
  processedNodes.add(movedNodeUuid);

  // Keep checking for collisions until none remain
  let hasCollisions = true;
  let iterations = 0;
  const maxIterations = 100; // Prevent infinite loops

  while (hasCollisions && iterations < maxIterations) {
    hasCollisions = false;
    iterations++;

    // Check all nodes for collisions
    for (const bounds of allBounds) {
      if (processedNodes.has(bounds.uuid)) {
        continue;
      }

      // Use original bounds since we skip already processed nodes
      const currentBounds = bounds;

      // Check if this node collides with the moved node or any already repositioned nodes
      let collisionFound = false;
      let maxCollisionBottom = 0;

      // Check against moved node
      if (nodesOverlap(currentBounds, movedNodeBounds)) {
        collisionFound = true;
        maxCollisionBottom = Math.max(
          maxCollisionBottom,
          movedNodeBounds.bottom
        );
      }

      // Check against other repositioned nodes
      for (const [otherUuid, otherPosition] of newPositions.entries()) {
        if (otherUuid === bounds.uuid) continue;

        const otherBounds = allBounds.find((b) => b.uuid === otherUuid);
        if (!otherBounds) continue;

        const otherUpdatedBounds = {
          ...otherBounds,
          top: otherPosition.top,
          bottom: otherPosition.top + otherBounds.height
        };

        if (nodesOverlap(currentBounds, otherUpdatedBounds)) {
          collisionFound = true;
          maxCollisionBottom = Math.max(
            maxCollisionBottom,
            otherUpdatedBounds.bottom
          );
        }
      }

      if (collisionFound) {
        // Move this node down below the collision
        const newTop = maxCollisionBottom + MIN_NODE_SPACING;
        newPositions.set(bounds.uuid, {
          left: bounds.left,
          top: newTop
        });
        hasCollisions = true;
        processedNodes.add(bounds.uuid);
      }
    }
  }

  return newPositions;
};
