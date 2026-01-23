# Replace jsPlumb with Custom Connection Library

## Background

The Flow Editor component currently depends on `@jsplumb/browser-ui` (v6.2.10) for rendering and managing connections between flow nodes. We want to replace this with a custom, lightweight implementation that covers only the features we actually use, reducing bundle size and giving us more control over the connection management logic.

## Current jsPlumb Usage Analysis

### Core jsPlumb Features Used

Based on analysis of the codebase, we use the following jsPlumb features:

#### 1. **Connection Creation and Management**
- **File**: `src/flow/Plumber.ts`
- **Usage**: 
  - Creating connections between exit elements (source) and node elements (target)
  - Batch processing of pending connections with debouncing (50ms delay)
  - Deleting connections when exits are removed or changed
  - Connection state management (adding/removing CSS classes)

#### 2. **Endpoints**
- **Source Endpoints** (Exits):
  - Type: `DotEndpoint` with 12px radius
  - Anchor: `['Bottom', 'Continuous']`
  - Max connections: 1
  - CSS classes: `plumb-source`, `plumb-source-hover`, `plumb-source connected`
  - Opacity: 0 (invisible but functional)
  
- **Target Endpoints** (Nodes):
  - Type: `RectangleEndpoint` (23x23px)
  - Anchor: `Continuous` with faces `['top', 'left', 'right']`
  - Max connections: 1
  - CSS classes: `plumb-target`, `plumb-target-hover`
  - Opacity: 0 (invisible but functional)

#### 3. **Connectors**
- **Type**: `FlowchartConnector`
- **Configuration**:
  - Stub: [20, 10] (distance from endpoint before turning)
  - Midpoint: 0.5
  - Corner radius: 5px
  - Always respect stubs: true
  - CSS class: `plumb-connector`
  - Gap: [0, 5] for connections
  - Stroke: 3px width
  - Color: CSS variable `--color-connectors`

#### 4. **Overlays**
- **Arrow Overlay**:
  - Type: `PlainArrow`
  - Width: 13px, Length: 13px
  - Location: 0.999 (at the end near target)
  - CSS class: `plumb-arrow`
  - Color: Same as connector

- **Activity Count Labels**:
  - Dynamic overlays showing activity counts
  - Location: 20px from start (exit point)
  - CSS class: `activity-overlay`
  - Hover interactions for showing recent contacts popup
  - Activity key format: `{exitUuid}:{destinationUuid}`

#### 5. **Event System**
The following events are used:

- `EVENT_CONNECTION_DRAG`: Fired when dragging a connection from an exit
- `EVENT_CONNECTION_ABORT`: Fired when connection drag is cancelled
- `EVENT_CONNECTION_DETACHED`: Fired when an existing connection is detached
- `EVENT_CONNECTION`: Fired when a connection is created
- `EVENT_REVERT`: Fired when a connection attempt is reverted
- `INTERCEPT_BEFORE_DROP`: Interceptor that always returns `false` (we handle connections manually)
- `INTERCEPT_BEFORE_DETACH`: Empty interceptor

#### 6. **Connection Dragging**
- **Behavior**:
  - Drag from exit elements to node elements
  - Visual feedback during drag (green outline for valid target, red for invalid)
  - Prevention of self-connections (exit cannot connect to its own node)
  - Automatic deny of jsPlumb's automatic connection creation
  - Manual connection creation after drag completion
  - Support for re-dragging existing connections to new targets

#### 7. **Node Movement and Repainting**
- **Methods used**:
  - `revalidate(ids: string[])`: Updates connection positions for moved nodes
  - `repaintEverything()`: Redraws all connections (used after layout changes)
  - Support for real-time updates as nodes are dragged around the canvas

#### 8. **Batch Operations**
- `batch(fn)`: Wraps multiple operations to improve performance
- Used when processing multiple pending connections at once

#### 9. **Connection State Management**
- Adding/removing CSS classes on connections (e.g., `removing` class)
- Setting visual states for connection removal animations
- Getting all connections from specific sources or targets

## Data Model

### Connection Storage
Connections are stored in the flow definition as part of Exit objects:

```typescript
interface Exit {
  uuid: string;
  destination_uuid?: string;  // UUID of the destination node, or null if no connection
}
```

Each node has multiple exits, and each exit can have at most one destination.

### Node Structure
```typescript
interface Node {
  uuid: string;
  actions: Action[];
  exits: Exit[];
  router?: Router;
}
```

### UI Positioning
```typescript
interface NodeUI {
  position: FlowPosition;  // { left: number, top: number }
  type?: ActionType;
  config?: Record<string, any>;
}
```

## Visual Requirements

### SVG Rendering
All connections should be rendered as SVG elements with:
- **Flowchart-style connectors**: Orthogonal (right-angle) routing
- **Corner radius**: 5px for smooth corners
- **Stubs**: 20px at source, 10px at target before first turn
- **Arrow indicators**: At the target end (13x13px)
- **Stroke**: 3px width
- **Colors**: 
  - Default: CSS variable `--color-connectors`
  - Hover: CSS variable `--color-success` (green)
  - Removing: CSS variable `--color-connector-removing` (tomato)

### CSS Classes Applied
The implementation should apply these CSS classes to enable styling:

**Connectors (path elements)**:
- `plumb-connector` (base class)
- `jtk-hover` (when hovering over connector)
- `removing` (during removal animation)

**Endpoints**:
- Source: `plumb-source`, `plumb-source-hover`, `connected` (when has destination)
- Target: `plumb-target`, `plumb-target-hover`

**Overlays**:
- Activity labels: `activity-overlay`, `jtk-overlay`

### Existing CSS Styles
The Editor component already has CSS styles defined for all connector elements. The new implementation should use the same CSS class names so these styles continue to work:

```css
.plumb-source { z-index: 600; cursor: pointer; opacity: 0; }
.plumb-source.connected { border-radius: 50%; pointer-events: none; }
.plumb-target { z-index: 600; opacity: 0; cursor: pointer; fill: transparent; }
body svg.jtk-connector.plumb-connector path { stroke: var(--color-connectors) !important; stroke-width: 3px; }
body .plumb-connector { z-index: 10 !important; }
body .plumb-connector .plumb-arrow { fill: var(--color-connectors); stroke: var(--color-connectors); }
body svg.jtk-connector.jtk-hover path { stroke: var(--color-success) !important; }
body .plumb-connector.jtk-hover .plumb-arrow { fill: var(--color-success) !important; }
body svg.plumb-connector.removing path { stroke: var(--color-connector-removing, tomato) !important; }
body .plumb-connector.removing .plumb-arrow { fill: var(--color-connector-removing, tomato) !important; }
```

## Implementation Requirements

### Phase 1: Core Connection Library

Create a new file `src/flow/ConnectionManager.ts` with the following API:

```typescript
// Event types that the ConnectionManager will emit
export enum ConnectionEvent {
  CONNECTION_DRAG = 'connection:drag',
  CONNECTION_ABORT = 'connection:abort',
  CONNECTION_DETACHED = 'connection:detach',
  CONNECTION = 'connection',
  REVERT = 'revert'
}

// Connection info passed to event listeners
export interface ConnectionInfo {
  sourceId: string;      // Exit UUID
  targetId?: string;     // Node UUID (optional for drag events)
  source: HTMLElement;   // Source DOM element
  target?: HTMLElement;  // Target DOM element (optional for drag events)
}

// Configuration for source endpoints (exits)
export interface SourceConfig {
  endpoint: {
    type: 'dot';
    radius: number;
    cssClass: string;
    hoverClass: string;
  };
  anchor: string | string[];
  maxConnections: number;
}

// Configuration for target endpoints (nodes)
export interface TargetConfig {
  endpoint: {
    type: 'rectangle';
    width: number;
    height: number;
    cssClass: string;
    hoverClass: string;
  };
  anchor: {
    type: string;
    faces: string[];
    cssClass: string;
  };
  maxConnections: number;
}

// Configuration for connectors (lines)
export interface ConnectorConfig {
  type: 'flowchart';
  stub: [number, number];
  midpoint: number;
  cornerRadius: number;
  alwaysRespectStubs: boolean;
  cssClass: string;
  gap?: [number, number];
}

// Configuration for arrow overlays
export interface ArrowConfig {
  type: 'arrow';
  width: number;
  length: number;
  location: number;  // 0-1, position along the path
  cssClass: string;
}

// Main ConnectionManager class
export class ConnectionManager {
  constructor(container: HTMLElement, editor: any);
  
  // Endpoint management
  makeSource(elementId: string): void;
  makeTarget(elementId: string): void;
  
  // Connection management
  connectIds(scope: string, fromId: string, toId: string): void;
  removeExitConnection(exitId: string): boolean;
  removeNodeConnections(nodeId: string): void;
  setConnectionRemovingState(exitId: string, isRemoving: boolean): boolean;
  
  // Event handling
  on(eventName: string, callback: (info: ConnectionInfo) => void): void;
  off(eventName: string, callback: (info: ConnectionInfo) => void): void;
  
  // Rendering and updates
  revalidate(elementIds: string[]): void;
  repaintEverything(): void;
  
  // Activity overlays
  setActivityData(data: { segments: { [key: string]: number } } | null): void;
  clearRecentContactsCache(): void;
  
  // State
  connectionDragging: boolean;
  
  // Batch operations
  batch(fn: () => void): void;
}
```

### Phase 2: SVG Path Calculation

Implement flowchart-style path calculation:

```typescript
// Path calculation utility
export interface Point {
  x: number;
  y: number;
}

export interface PathSegment {
  type: 'M' | 'L' | 'Q' | 'C';  // MoveTo, LineTo, QuadraticCurve, CubicCurve
  points: number[];
}

export function calculateFlowchartPath(
  start: Point,
  end: Point,
  startStub: number,
  endStub: number,
  cornerRadius: number
): PathSegment[];
```

**Flowchart Path Logic**:
1. Start with a stub (straight line) from the exit point
2. Route using right-angle turns (orthogonal routing)
3. Apply corner radius to smooth turns
4. End with a stub before reaching the target
5. Choose routing that avoids overlapping the source and target nodes when possible

**Example**: For a connection going from bottom of exit to top of node:
```
Exit (bottom)
    |  <- stub (20px)
    |
    +--...--+  <- horizontal segment with rounded corners
            |
            |  <- stub (10px)
         Node (top)
```

### Phase 3: Drag and Drop Implementation

Implement connection dragging:

```typescript
export class ConnectionDragHandler {
  constructor(
    connectionManager: ConnectionManager,
    container: HTMLElement
  );
  
  // Start dragging from a source endpoint
  startDrag(sourceElement: HTMLElement, event: MouseEvent): void;
  
  // Handle drag movement
  updateDrag(event: MouseEvent): void;
  
  // Complete the drag (connect to target or abort)
  endDrag(event: MouseEvent): void;
  
  // Visual feedback during drag
  private showDragLine(start: Point, current: Point): void;
  private highlightValidTarget(element: HTMLElement): void;
  private clearTargetHighlights(): void;
}
```

**Drag Behavior**:
1. Click and hold on an exit element (source endpoint)
2. Render a temporary SVG line from source to cursor position
3. Detect hover over target nodes
4. Provide visual feedback (green outline for valid, red for invalid self-connection)
5. On release:
   - If over valid target: trigger connection event
   - If over invalid target: trigger abort event
   - If not over any target: trigger abort event

**Re-dragging Existing Connections**:
1. Click and hold on a connected exit
2. Remove the existing connection visually (keep in DOM as semi-transparent)
3. Follow same drag behavior as new connection
4. On release:
   - If over valid target: trigger detach event for old connection, create new connection
   - If over invalid target or no target: trigger revert event, restore old connection

### Phase 4: Replace Plumber.ts

Update `src/flow/Plumber.ts` to use the new `ConnectionManager`:

1. Replace jsPlumb imports with ConnectionManager
2. Update constructor to instantiate ConnectionManager
3. Map all existing Plumber methods to ConnectionManager equivalents
4. Ensure backward compatibility with existing callers

**Migration Strategy**:
- Keep the same public API for Plumber class
- Internal implementation delegates to ConnectionManager
- Maintain all event names and signatures
- Preserve all CSS class names

### Phase 5: Integration Points

Update the following files to work with the new implementation:

#### `src/flow/Editor.ts`
- Remove jsPlumb type imports
- Update event handling (connection:drag, connection:abort, etc.)
- Keep all visual feedback logic unchanged

#### `src/flow/CanvasNode.ts`
- Update calls to plumber methods
- Keep all connection removal logic unchanged

#### CSS Styles
- No changes needed - new implementation uses same CSS classes

### Phase 6: Testing

Update test files to work with the new implementation:

#### `test/temba-flow-plumber.test.ts`
- Update to mock ConnectionManager instead of jsPlumb
- Verify all existing tests still pass
- Keep same test assertions

#### `test/temba-flow-plumber-connections.test.ts`
- Update connection management tests
- Verify removal state, CSS classes, etc.

#### `test/temba-flow-editor-node.test.ts`
- Verify node connection behavior still works
- Check exit connection creation and removal

### Phase 7: Activity Overlays and Advanced Features

Implement the activity overlay system:

```typescript
export class ActivityOverlayManager {
  constructor(connectionManager: ConnectionManager);
  
  // Update activity data and render overlays
  updateActivityData(data: { segments: { [key: string]: number } }): void;
  
  // Fetch recent contacts for an activity segment
  private fetchRecentContacts(activityKey: string, flowUuid: string): Promise<any[]>;
  
  // Show/hide recent contacts popup
  private showRecentContactsPopup(activityKey: string, overlayElement: HTMLElement): void;
  private hideRecentContactsPopup(): void;
}
```

**Features**:
- Add text labels showing activity counts on connections
- Position labels 20px from the exit (start of connection)
- Make labels clickable to show recent contacts popup
- Fetch data from `/flow/recent_contacts/{flowUuid}/{exitUuid}/{destinationUuid}/`
- Cache results to avoid redundant fetches
- Show popup on hover with 500ms delay
- Hide popup when mouse leaves with 200ms delay

## Implementation Steps

### Step 1: Create Core ConnectionManager (Estimated: 4-6 hours)
- [ ] Create `src/flow/ConnectionManager.ts` with basic structure
- [ ] Implement constructor and initialization
- [ ] Implement `makeSource()` and `makeTarget()` endpoint methods
- [ ] Implement basic event system (on/off methods)
- [ ] Add `connectionDragging` state flag

### Step 2: Implement SVG Rendering (Estimated: 4-6 hours)
- [ ] Create SVG container in the canvas
- [ ] Implement path calculation for flowchart connectors
- [ ] Render connector paths with proper styling
- [ ] Render arrow overlays at path endpoints
- [ ] Apply CSS classes for styling

### Step 3: Implement Connection Management (Estimated: 3-4 hours)
- [ ] Implement `connectIds()` with batching and debouncing
- [ ] Implement `removeExitConnection()`
- [ ] Implement `removeNodeConnections()`
- [ ] Implement `setConnectionRemovingState()`
- [ ] Track connections in internal data structure

### Step 4: Implement Drag and Drop (Estimated: 6-8 hours)
- [ ] Create `ConnectionDragHandler` class
- [ ] Implement drag start from source endpoints
- [ ] Implement drag movement with temporary line rendering
- [ ] Implement target detection and highlighting
- [ ] Implement drag end with connection creation
- [ ] Implement re-dragging of existing connections
- [ ] Fire appropriate events (drag, abort, detach, revert)

### Step 5: Implement Revalidation and Repainting (Estimated: 2-3 hours)
- [ ] Implement `revalidate()` to update specific connections
- [ ] Implement `repaintEverything()` to redraw all connections
- [ ] Handle node movement (update connection positions)
- [ ] Optimize for performance (RAF, debouncing)

### Step 6: Implement Activity Overlays (Estimated: 3-4 hours)
- [ ] Create `ActivityOverlayManager` class
- [ ] Render activity count labels on connections
- [ ] Implement hover interactions
- [ ] Integrate with recent contacts API
- [ ] Create and style popup for recent contacts
- [ ] Handle caching and fetch cancellation

### Step 7: Update Plumber.ts (Estimated: 2-3 hours)
- [ ] Replace jsPlumb with ConnectionManager
- [ ] Update all method implementations
- [ ] Ensure backward compatibility
- [ ] Remove jsPlumb dependency from package.json

### Step 8: Testing and Bug Fixes (Estimated: 4-6 hours)
- [ ] Update unit tests for Plumber
- [ ] Update unit tests for connection management
- [ ] Test in actual flow editor
- [ ] Test node movement and connection updates
- [ ] Test connection dragging and re-dragging
- [ ] Test activity overlays and recent contacts
- [ ] Fix any visual or functional bugs

### Step 9: Clean Up (Estimated: 1-2 hours)
- [ ] Remove all jsPlumb imports
- [ ] Remove `@jsplumb/browser-ui` from package.json
- [ ] Update any documentation
- [ ] Verify bundle size reduction

## Testing Checklist

Before considering the implementation complete, verify:

### Basic Functionality
- [ ] Can create connections by dragging from exit to node
- [ ] Cannot create self-connections (exit to its own node)
- [ ] Can remove connections by clicking on connected exits
- [ ] Removed connections show animation before disappearing
- [ ] Multiple exits on same node can each have separate connections

### Visual Rendering
- [ ] Connectors use flowchart (orthogonal) routing
- [ ] Connectors have smooth corners (5px radius)
- [ ] Arrows appear at the node end of connections
- [ ] Connectors respect stub distances (20px at source, 10px at target)
- [ ] Hover over connection shows green color
- [ ] Removing state shows red/tomato color
- [ ] Endpoints are invisible (opacity: 0) but functional

### Node Movement
- [ ] Dragging nodes updates connected lines in real-time
- [ ] Connections stay attached to correct exit/node positions
- [ ] Performance is smooth even with many nodes and connections
- [ ] Batch revalidation works correctly

### Re-dragging Connections
- [ ] Can pick up an existing connection from the node side
- [ ] Original connection shows as semi-transparent during drag
- [ ] Can drag to a new node to change the connection
- [ ] Releasing without a valid target restores original connection
- [ ] Events fire correctly (detach, revert)

### Activity Overlays
- [ ] Activity counts appear on connections when data is available
- [ ] Labels are positioned 20px from exit point
- [ ] Hovering over label shows recent contacts popup (with 500ms delay)
- [ ] Popup displays contact names, operands, and relative times
- [ ] Clicking contact name fires appropriate event
- [ ] Moving mouse away hides popup (with 200ms delay)
- [ ] Fetching is cached and doesn't repeat unnecessarily

### Edge Cases
- [ ] Works correctly when nodes overlap
- [ ] Works correctly with nodes at canvas edges
- [ ] Works correctly when changing language (node size changes)
- [ ] Works correctly when editing nodes (exits added/removed)
- [ ] Works correctly when deleting nodes
- [ ] Works correctly with flowcharts of various sizes
- [ ] No memory leaks when connections are added/removed repeatedly

## Success Criteria

The implementation is complete when:

1. ✅ All existing flow editor functionality works identically
2. ✅ All unit tests pass (with updated mocks)
3. ✅ `@jsplumb/browser-ui` dependency is removed from package.json
4. ✅ Bundle size is reduced
5. ✅ Visual appearance is identical to current implementation
6. ✅ Performance is equal to or better than jsPlumb
7. ✅ Code is well-documented with clear comments
8. ✅ No console errors or warnings

## Notes for Implementation

### Performance Considerations
- Use `requestAnimationFrame` for repainting during animations
- Debounce rapid revalidation calls (50ms)
- Batch DOM updates when processing multiple connections
- Use CSS transforms for smooth visual transitions
- Consider using a quadtree or spatial index for large flowcharts

### Browser Compatibility
- Target modern browsers (Chrome, Firefox, Safari, Edge)
- Use standard DOM and SVG APIs
- Avoid browser-specific features

### Code Style
- Follow existing TypeScript patterns in the codebase
- Use descriptive variable and method names
- Add JSDoc comments for public API methods
- Keep methods focused and single-purpose
- Extract complex logic into helper functions

### SVG Best Practices
- Create a single SVG container for all connections
- Use SVG `<g>` groups to organize connection elements
- Apply CSS classes rather than inline styles where possible
- Use `pathLength` for consistent stroke dash patterns if needed
- Consider using `<defs>` for reusable arrow markers

## References

### Current Implementation Files
- `src/flow/Plumber.ts` - jsPlumb wrapper (667 lines)
- `src/flow/Editor.ts` - Main editor component with connection event handling
- `src/flow/CanvasNode.ts` - Node component with connection management
- `test/temba-flow-plumber.test.ts` - Plumber unit tests
- `test/temba-flow-plumber-connections.test.ts` - Connection management tests

### jsPlumb Documentation
- Current version: 6.2.10
- Package: `@jsplumb/browser-ui`
- Main features used: Endpoints, Connectors, Overlays, Events, Drag and Drop

### Related Flow Editor Features
- Node dragging and positioning
- Exit-based routing (each exit can have one destination)
- Activity data visualization
- Recent contacts display
- Connection removal with animation
- Visual feedback during connection creation

## Expected Outcomes

After implementing this custom connection library:

1. **Smaller Bundle Size**: Removing jsPlumb should reduce bundle size by approximately 100-200KB (gzipped)
2. **Better Control**: We'll have full control over connection rendering and behavior
3. **Simpler Codebase**: Less abstraction layers, more direct implementation
4. **Easier Debugging**: No external library internals to navigate
5. **Maintenance**: Easier to add new features or modify behavior
6. **Performance**: Potential performance improvements from having a purpose-built solution

---

## Implementation Timeline

**Total Estimated Time**: 25-36 hours

**Recommended Approach**: Implement in phases, testing thoroughly after each phase before moving to the next. The core connection management should be rock-solid before adding advanced features like activity overlays.

**Priority Order**:
1. Phase 1-2: Core library and SVG rendering (CRITICAL)
2. Phase 3: Connection management (CRITICAL)
3. Phase 4: Drag and drop (CRITICAL)
4. Phase 5: Revalidation (CRITICAL)
5. Phase 6: Update Plumber.ts (CRITICAL)
6. Phase 7: Activity overlays (IMPORTANT but can be done later)
7. Phase 8-9: Testing and cleanup (CRITICAL)
