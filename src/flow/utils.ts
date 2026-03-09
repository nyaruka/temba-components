import { html, TemplateResult } from 'lit-html';
import { NamedObject, FlowPosition } from '../store/flow-definition';
import { FlowIssue } from '../store/AppState';
import { CustomEventType } from '../interfaces';
import { tokenize, TokenType } from '../excellent/tokenizer';
import { messageParser, sessionParser } from '../excellent/helpers';

const IS_MAC =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/**
 * Returns true if the mouse event is a right-click or equivalent:
 * - button !== 0 (actual right-click or middle-click on any platform)
 * - ctrl+click on macOS (emulates right-click / context menu)
 */
export function isRightClick(event: MouseEvent): boolean {
  if (event.button !== 0) return true;
  if (IS_MAC && event.ctrlKey) return true;
  return false;
}

export function formatIssueMessage(issue: FlowIssue): string {
  if (issue.dependency) {
    const name = issue.dependency.name || issue.dependency.key;
    return `Cannot find a ${issue.dependency.type} for ${name}`;
  }
  return issue.description;
}

const GRID_SIZE = 20;

export function snapToGrid(value: number): number {
  const snapped = Math.round(value / GRID_SIZE) * GRID_SIZE;
  return Math.max(snapped, 0);
}

const MONO =
  "font-family:SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;font-size:0.95em";

const TOKEN_STYLES: Record<string, string> = {
  [TokenType.ExpressionPrefix]: `color:#0086e0;font-weight:600;${MONO}`,
  [TokenType.Identifier]: `color:#0086e0;${MONO}`,
  [TokenType.FunctionName]: `color:#0086e0;font-weight:900;${MONO}`,
  [TokenType.StringLiteral]: `color:#00cf0d;${MONO}`,
  [TokenType.NumberLiteral]: `color:#c25ceb;${MONO}`,
  [TokenType.Keyword]: `color:#1750eb;${MONO}`,
  [TokenType.Operator]: `color:#666;${MONO}`,
  [TokenType.ContextRef]: `color:#0086e0;${MONO}`,
  [TokenType.Separator]: `color:#666;${MONO}`,
  [TokenType.Arrow]: `color:#666;${MONO}`,
  [TokenType.Bracket]: `color:#666;${MONO}`,
  [TokenType.Paren]: `color:#999;${MONO}`,
  [TokenType.Whitespace]: MONO
};

const LLM_ICON_MAP: [RegExp, string][] = [
  [/claude|anthropic/i, 'anthropic'],
  [/gpt|openai|o1|o3|o4/i, 'openai'],
  [/gemini|google/i, 'gemini'],
  [/azure|microsoft/i, 'azure'],
  [/deepseek/i, 'deepseek']
];

export const getLlmIcon = (name: string): string | null => {
  if (!name) return null;
  for (const [pattern, icon] of LLM_ICON_MAP) {
    if (pattern.test(name)) return icon;
  }
  return null;
};

/**
 * Tokenizes text containing Excellent expressions and returns highlighted
 * lit-html templates with inline styles, suitable for rendering on the canvas.
 */
export const renderHighlightedText = (
  text: string,
  session = false
): TemplateResult => {
  const parser = session ? sessionParser : messageParser;
  const tokens = tokenize(text || '', parser);

  // Group consecutive expression tokens so we can wrap them in a single
  // span with hyphens:none (plain text keeps hyphens:auto from container).
  const groups: { isExpr: boolean; tokens: typeof tokens }[] = [];
  for (const token of tokens) {
    const isExpr = !!TOKEN_STYLES[token.type];
    const last = groups[groups.length - 1];
    if (last && last.isExpr === isExpr) {
      last.tokens.push(token);
    } else {
      groups.push({ isExpr, tokens: [token] });
    }
  }

  const renderToken = (token: (typeof tokens)[0]) => {
    const style = TOKEN_STYLES[token.type];
    if (!style) {
      const parts = token.text.split('\n');
      return html`${parts.map(
        (part, i) => html`${i > 0 ? html`<br />` : null}${part}`
      )}`;
    }
    const parts = token.text.split('\n');
    return html`${parts.map(
      (part, i) =>
        html`${i > 0 ? html`<br />` : null}${part
          ? html`<span style="${style}">${part}</span>`
          : null}`
    )}`;
  };

  return html`${groups.map((group) => {
    const content = html`${group.tokens.map(renderToken)}`;
    return group.isExpr
      ? html`<span style="hyphens:none">${content}</span>`
      : content;
  })}`;
};

/**
 * Renders content clamped to a maximum number of lines with ellipsis.
 * Hovering shows the full text in a tooltip.
 */
export const renderClamped = (
  content: TemplateResult | string,
  titleText: string,
  maxLines: number = 3
) => {
  return html`<div
    style="display: -webkit-box; -webkit-line-clamp: ${maxLines}; -webkit-box-orient: vertical; overflow: hidden; word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"
    title="${titleText}"
  >
    ${content}
  </div>`;
};

/**
 * Renders a single line item with optional icon.
 * Content can be plain text or a TemplateResult (e.g. highlighted text).
 */
export const renderLineItem = (
  name: string,
  icon?: string,
  content?: TemplateResult
) => {
  return html`<div style="display:flex;align-items:center;">
    ${icon
      ? html`<temba-icon name=${icon} style="margin-right:0.5em"></temba-icon>`
      : null}
    <div
      style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;"
      title="${name}"
    >
      ${content || name}
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
 * with a "+X more" indicator if there are more items.
 * When session is provided, expression strings (starting with @) are highlighted.
 */
export const renderStringList = (
  items: string[],
  icon?: string,
  session?: boolean
) => {
  const itemElements = [];
  const maxDisplay = 3;

  // Show up to 3 items, or all 4 if exactly 4 items
  const displayCount =
    items.length === 4 ? 4 : Math.min(maxDisplay, items.length);

  for (let i = 0; i < displayCount; i++) {
    const item = items[i];
    const highlighted =
      session !== undefined && item.startsWith('@')
        ? renderHighlightedText(item, session)
        : undefined;
    itemElements.push(renderLineItem(item, icon, highlighted));
  }

  // Add "+X more" if there are more than 3 items (and not exactly 4)
  if (items.length > maxDisplay && items.length !== 4) {
    const remainingCount = items.length - maxDisplay;
    itemElements.push(
      html`<div style="display:flex;align-items:center;margin-top:0.2em;">
        ${icon
          ? html`<div style="margin-right:0.4em; width: 1em;"></div>` // spacing placeholder
          : null}
        <div style="font-size:0.8em">+${remainingCount} more</div>
      </div>`
    );
  }
  return itemElements;
};

/**
 * Renders a mixed list of items, each with its own icon, showing up to 3 items
 * with a "+X more" indicator if there are more items
 */
export const renderMixedList = (
  items: { name: string; icon: string; content?: TemplateResult }[]
) => {
  const itemElements = [];
  const maxDisplay = 3;

  const displayCount =
    items.length === 4 ? 4 : Math.min(maxDisplay, items.length);

  for (let i = 0; i < displayCount; i++) {
    itemElements.push(
      renderLineItem(items[i].name, items[i].icon, items[i].content)
    );
  }

  if (items.length > maxDisplay && items.length !== 4) {
    const remainingCount = items.length - maxDisplay;
    itemElements.push(
      html`<div style="display:flex;align-items:center;margin-top:0.2em;">
        <div style="margin-right:0.4em; width: 1em;"></div>
        <div style="font-size:0.8em">+${remainingCount} more</div>
      </div>`
    );
  }
  return itemElements;
};

/**
 * Renders a single flow as a clickable link that fires a temba-flow-clicked event
 */
const renderFlowLink = (flow: NamedObject, icon?: string) => {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const editor = target.closest('temba-flow-editor') as any;
    if (editor) {
      editor.fireCustomEvent(CustomEventType.FlowClicked, {
        uuid: flow.uuid,
        name: flow.name,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey
      });
    }
  };

  return html`<div
    class="linked-name"
    style="display:inline-flex;align-items:center;max-width:100%;"
  >
    ${icon
      ? html`<temba-icon name=${icon} style="margin-right:0.5em"></temba-icon>`
      : null}
    <div
      @click=${handleClick}
      style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; text-decoration: underline; cursor: pointer;"
    >
      ${flow.name}
    </div>
  </div>`;
};

/**
 * Renders a list of flows as clickable links, showing up to 3 items
 * with a "+X more" indicator if there are more items
 */
export const renderFlowLinks = (flows: NamedObject[], icon?: string) => {
  const itemElements = [];
  const maxDisplay = 3;

  const displayCount =
    flows.length === 4 ? 4 : Math.min(maxDisplay, flows.length);

  for (let i = 0; i < displayCount; i++) {
    itemElements.push(renderFlowLink(flows[i], icon));
  }

  if (flows.length > maxDisplay && flows.length !== 4) {
    const remainingCount = flows.length - maxDisplay;
    itemElements.push(
      html`<div style="display:flex;align-items:center;margin-top:0.2em;">
        ${icon
          ? html`<div style="margin-right:0.4em; width: 1em;"></div>`
          : null}
        <div style="font-size:0.8em">+${remainingCount} more</div>
      </div>`
    );
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
const MIN_NODE_SPACING = 30;

/**
 * Small buffer to avoid floating point precision issues in overlap detection (in pixels)
 * This prevents false positives when nodes are exactly adjacent (e.g., bottom of one node
 * at exactly the same position as top of another)
 */
const OVERLAP_BUFFER = 10;

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
    element || (document.querySelector(`[id="${nodeUuid}"]`) as HTMLElement);

  if (!nodeElement) {
    return null;
  }

  // Use offsetWidth/offsetHeight instead of getBoundingClientRect() so
  // dimensions are in CSS-layout space and unaffected by ancestor transforms (zoom).
  const width = nodeElement.offsetWidth;
  const height = nodeElement.offsetHeight;

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
    bounds1.right <= bounds2.left - buffer ||
    bounds1.left >= bounds2.right + buffer ||
    bounds1.bottom <= bounds2.top - buffer ||
    bounds1.top >= bounds2.bottom + buffer
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

type Direction = 'down' | 'up' | 'right' | 'left';

const DIRECTIONS: Direction[] = ['down', 'up', 'right', 'left'];

/**
 * Creates a new NodeBounds at a different position
 */
const makeBoundsAt = (
  original: NodeBounds,
  left: number,
  top: number
): NodeBounds => ({
  ...original,
  left,
  top,
  right: left + original.width,
  bottom: top + original.height
});

/**
 * Computes the minimum position needed to clear all fixed nodes in a given direction.
 * Returns null if the direction is not viable (e.g., would require negative coordinates
 * and still overlap).
 */
const computeDirectionalClearance = (
  collider: NodeBounds,
  fixedNodes: NodeBounds[],
  direction: Direction
): { left: number; top: number } | null => {
  switch (direction) {
    case 'down': {
      const maxBottom = Math.max(...fixedNodes.map((f) => f.bottom));
      const newTop = snapToGrid(maxBottom + MIN_NODE_SPACING);
      return { left: collider.left, top: newTop };
    }
    case 'up': {
      const minTop = Math.min(...fixedNodes.map((f) => f.top));
      const newTop = snapToGrid(minTop - collider.height - MIN_NODE_SPACING);
      if (newTop < 0) return { left: collider.left, top: 0 };
      return { left: collider.left, top: newTop };
    }
    case 'right': {
      const maxRight = Math.max(...fixedNodes.map((f) => f.right));
      const newLeft = snapToGrid(maxRight + MIN_NODE_SPACING);
      return { left: newLeft, top: collider.top };
    }
    case 'left': {
      const minLeft = Math.min(...fixedNodes.map((f) => f.left));
      const newLeft = snapToGrid(minLeft - collider.width - MIN_NODE_SPACING);
      if (newLeft < 0) return { left: 0, top: collider.top };
      return { left: newLeft, top: collider.top };
    }
  }
};

/**
 * Calculates new positions to resolve all collisions using multi-directional reflow.
 *
 * Sacred nodes (the ones just dropped/created) keep their positions. All other
 * colliding nodes are moved in whichever direction requires the least displacement
 * and causes the fewest cascading collisions.
 */
export const calculateReflowPositions = (
  sacredNodeUuids: string[],
  allBounds: NodeBounds[]
): Map<string, FlowPosition> => {
  const newPositions = new Map<string, FlowPosition>();
  const sacredSet = new Set(sacredNodeUuids);

  // Mutable map of current bounds, updated as collisions are resolved
  const currentBounds = new Map<string, NodeBounds>();
  for (const b of allBounds) {
    currentBounds.set(b.uuid, { ...b });
  }

  // A sacred node yields to an existing node at the top of the canvas when
  // the sacred wasn't dropped above it. The existing node keeps its top
  // position and the sacred node moves below instead.
  for (const sacredUuid of [...sacredSet]) {
    const sacred = currentBounds.get(sacredUuid);
    if (!sacred) continue;

    for (const [uuid, bounds] of currentBounds) {
      if (uuid === sacredUuid || sacredSet.has(uuid)) continue;
      if (!nodesOverlap(sacred, bounds)) continue;

      if (sacred.top > bounds.top && bounds.top < MIN_NODE_SPACING) {
        sacredSet.delete(sacredUuid);
        sacredSet.add(uuid);
        break;
      }
    }
  }

  // Seed the queue with non-sacred nodes that overlap any sacred node
  const queue: string[] = [];
  const inQueue = new Set<string>();

  for (const sacredUuid of sacredSet) {
    const sacred = currentBounds.get(sacredUuid);
    if (!sacred) continue;
    for (const [uuid, bounds] of currentBounds) {
      if (sacredSet.has(uuid) || inQueue.has(uuid)) continue;
      if (nodesOverlap(sacred, bounds)) {
        queue.push(uuid);
        inQueue.add(uuid);
      }
    }
  }

  const resolved = new Set<string>();
  let iterations = 0;
  const maxIterations = 200;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const uuid = queue.shift()!;

    if (resolved.has(uuid)) continue;

    const collider = currentBounds.get(uuid)!;

    // Find all fixed nodes (sacred + already-resolved) that overlap this node
    const fixedOverlaps: NodeBounds[] = [];
    for (const [otherUuid, otherBounds] of currentBounds) {
      if (otherUuid === uuid) continue;
      if (sacredSet.has(otherUuid) || resolved.has(otherUuid)) {
        if (nodesOverlap(collider, otherBounds)) {
          fixedOverlaps.push(otherBounds);
        }
      }
    }

    if (fixedOverlaps.length === 0) continue;

    // Determine direction constraints and axis bias from sacred node overlaps
    const sacredOverlaps = fixedOverlaps.filter((f) => sacredSet.has(f.uuid));
    const allowedDirections: Direction[] = [...DIRECTIONS];
    let axisBias: 'vertical' | 'horizontal' | null = null;

    if (sacredOverlaps.length > 0) {
      // Rule 1: don't move a lower node above the sacred node
      // Rule 2: don't move a right-of node to the left of the sacred node
      for (const sacred of sacredOverlaps) {
        if (collider.top > sacred.top) {
          const idx = allowedDirections.indexOf('up');
          if (idx !== -1) allowedDirections.splice(idx, 1);
        }
        if (collider.left > sacred.left) {
          const idx = allowedDirections.indexOf('left');
          if (idx !== -1) allowedDirections.splice(idx, 1);
        }
      }

      // Rule 3: bias direction based on overlap shape
      let totalOverlapWidth = 0;
      let totalOverlapHeight = 0;
      for (const sacred of sacredOverlaps) {
        totalOverlapWidth +=
          Math.min(collider.right, sacred.right) -
          Math.max(collider.left, sacred.left);
        totalOverlapHeight +=
          Math.min(collider.bottom, sacred.bottom) -
          Math.max(collider.top, sacred.top);
      }
      if (totalOverlapWidth > totalOverlapHeight) {
        axisBias = 'vertical'; // wide overlap = nodes stacked = prefer up/down
      } else if (totalOverlapHeight > totalOverlapWidth) {
        axisBias = 'horizontal'; // tall overlap = nodes side-by-side = prefer left/right
      }
    }

    // Try each allowed direction, pick the one with least disruption
    let bestPos: { left: number; top: number } | null = null;
    let bestScore = Infinity;

    for (const dir of allowedDirections) {
      const candidate = computeDirectionalClearance(
        collider,
        fixedOverlaps,
        dir
      );
      if (!candidate) continue;

      const candidateBounds = makeBoundsAt(
        collider,
        candidate.left,
        candidate.top
      );

      // Verify no overlap with any sacred or resolved node
      let stillOverlaps = false;
      let cascadeCount = 0;
      for (const [otherUuid, otherBounds] of currentBounds) {
        if (otherUuid === uuid) continue;
        if (!nodesOverlap(candidateBounds, otherBounds)) continue;

        if (sacredSet.has(otherUuid) || resolved.has(otherUuid)) {
          stillOverlaps = true;
          break;
        }
        cascadeCount++;
      }
      if (stillOverlaps) continue;

      const distance =
        Math.abs(candidate.left - collider.left) +
        Math.abs(candidate.top - collider.top);

      // When colliding with sacred nodes, use axis bias scoring;
      // for cascading collisions (no sacred overlap), use original scoring
      let score: number;
      if (sacredOverlaps.length > 0) {
        const isVerticalDir = dir === 'up' || dir === 'down';
        const axisMatch =
          axisBias === null ||
          (axisBias === 'vertical' && isVerticalDir) ||
          (axisBias === 'horizontal' && !isVerticalDir);
        const axisPenalty = axisMatch ? 0 : 5000;
        score = cascadeCount * 2000 + axisPenalty + distance;
      } else {
        score = cascadeCount * 10000 + distance;
      }

      if (score < bestScore) {
        bestScore = score;
        bestPos = candidate;
      }
    }

    if (bestPos) {
      newPositions.set(uuid, { left: bestPos.left, top: bestPos.top });
      const newBounds = makeBoundsAt(collider, bestPos.left, bestPos.top);
      currentBounds.set(uuid, newBounds);
      resolved.add(uuid);

      // Enqueue any new cascading collisions
      for (const [otherUuid, otherBounds] of currentBounds) {
        if (otherUuid === uuid) continue;
        if (sacredSet.has(otherUuid) || resolved.has(otherUuid)) continue;
        if (inQueue.has(otherUuid)) continue;
        if (nodesOverlap(newBounds, otherBounds)) {
          queue.push(otherUuid);
          inQueue.add(otherUuid);
        }
      }
    }
  }

  return newPositions;
};
