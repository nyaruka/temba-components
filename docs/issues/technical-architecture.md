# jsPlumb Replacement - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Flow Editor                             │
│                      (src/flow/Editor.ts)                       │
│                                                                 │
│  - Manages canvas and node positioning                         │
│  - Handles global mouse events                                 │
│  - Provides visual feedback during connection drag             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Uses
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Plumber                                │
│                    (src/flow/Plumber.ts)                        │
│                                                                 │
│  - High-level API for connection management                    │
│  - Currently wraps jsPlumb (to be replaced)                    │
│  - Manages activity overlays and recent contacts               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ To be replaced with
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ConnectionManager                            │
│              (NEW: src/flow/ConnectionManager.ts)               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            Core Connection Management                    │  │
│  │  - makeSource() / makeTarget()                          │  │
│  │  - connectIds() / removeConnection()                    │  │
│  │  - Event system (on/off)                                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            SVG Rendering Engine                          │  │
│  │  - Flowchart path calculation                           │  │
│  │  - SVG element creation and management                  │  │
│  │  - CSS class application                                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            Drag & Drop Handler                           │  │
│  │  - Mouse event handling                                 │  │
│  │  - Temporary drag line rendering                        │  │
│  │  - Target detection and validation                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            Activity Overlay Manager                      │  │
│  │  - Activity count labels                                │  │
│  │  - Recent contacts popup                                │  │
│  │  - API integration                                      │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Connection Creation Flow

```
User clicks exit
      │
      ▼
Drag handler detects mousedown on exit element
      │
      ▼
Start drag (EVENT_CONNECTION_DRAG fired)
      │
      ▼
User moves mouse ──► Update temporary SVG line
      │               Show target validation feedback
      ▼
User releases mouse over target node
      │
      ▼
Drag handler validates target (not self-connection)
      │
      ├─► Invalid target ──► Fire EVENT_CONNECTION_ABORT
      │
      └─► Valid target
            │
            ▼
      Fire EVENT_CONNECTION
            │
            ▼
      Editor.makeConnection() called
            │
            ▼
      Plumber.connectIds(scope, exitId, nodeId)
            │
            ▼
      ConnectionManager creates permanent SVG connection
            │
            ▼
      Store.updateConnection() updates flow definition
```

### Connection Removal Flow

```
User clicks connected exit
      │
      ▼
CanvasNode.handleExitRemovalIntent()
      │
      ▼
Add "removing" CSS class (red color)
      │
      ▼
Set 1.5 second timeout
      │
      ├─► User clicks again within timeout
      │   │
      │   ▼
      │   CanvasNode.handleExitRemovalConfirm()
      │   │
      │   ▼
      │   Plumber.removeExitConnection(exitId)
      │   │
      │   ▼
      │   ConnectionManager deletes SVG elements
      │   │
      │   ▼
      │   Update flow definition (destination_uuid = null)
      │
      └─► Timeout expires
          │
          ▼
          Remove "removing" class
          Connection restored
```

## Component Interaction

```
┌──────────────┐         ┌──────────────┐
│  Exit        │         │  Node        │
│  (Source)    │         │  (Target)    │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │ DOM element            │ DOM element
       │ id = exit UUID         │ id = node UUID
       │                        │
       ▼                        ▼
┌──────────────────────────────────────┐
│      ConnectionManager               │
│                                      │
│  ┌────────────┐    ┌──────────────┐ │
│  │  Source    │────│   Target     │ │
│  │  Endpoint  │    │   Endpoint   │ │
│  └────────────┘    └──────────────┘ │
│         │                  │         │
│         └─────────┬────────┘         │
│                   │                  │
│           ┌───────▼───────┐          │
│           │  Connection   │          │
│           │  (SVG Path)   │          │
│           └───────────────┘          │
└──────────────────────────────────────┘
```

## SVG Structure

```xml
<svg class="connections-container">
  <!-- Connection group -->
  <g class="connection" data-source="exit-uuid" data-target="node-uuid">
    
    <!-- Main path (flowchart connector) -->
    <path class="plumb-connector" 
          d="M10,20 L10,40 Q10,45 15,45 L85,45 Q90,45 90,50 L90,80"
          stroke-width="3" />
    
    <!-- Arrow at target end -->
    <path class="plumb-arrow"
          d="M90,80 L85,75 L95,75 Z" />
    
    <!-- Activity overlay (if activity data exists) -->
    <g class="activity-overlay-group" transform="translate(10,30)">
      <rect class="activity-overlay-bg" width="40" height="20" rx="4" />
      <text class="activity-overlay-text" x="20" y="14">123</text>
    </g>
    
  </g>
  
  <!-- More connections... -->
</svg>

<!-- Invisible source endpoint (for drag handling) -->
<div id="exit-uuid" class="exit">
  <div class="plumb-source" 
       style="opacity: 0; cursor: pointer;"></div>
</div>

<!-- Invisible target endpoint (for drop handling) -->
<div id="node-uuid" class="node">
  <div class="plumb-target"
       style="opacity: 0;"></div>
</div>
```

## Key Algorithms

### Flowchart Path Calculation

```
Input: startPoint, endPoint, startStub, endStub, cornerRadius

1. Calculate stub points:
   stubStart = startPoint + (0, startStub)
   stubEnd = endPoint - (0, endStub)

2. Determine routing:
   If horizontal distance > vertical distance:
     Route: vertical → horizontal → vertical
   Else:
     Route: vertical → horizontal (with multiple turns if needed)

3. Apply corner radius:
   For each 90° turn:
     Replace sharp corner with quadratic curve
     Curve control point offset by cornerRadius

4. Generate SVG path string:
   M startPoint.x startPoint.y
   L stubStart.x stubStart.y
   Q corner1.x corner1.y, turn1.x turn1.y
   L ...
   Q cornerN.x cornerN.y, turnN.x turnN.y
   L stubEnd.x stubEnd.y
   L endPoint.x endPoint.y
```

### Activity Overlay Positioning

```
Input: connection path, activityCount

1. Parse path data to get segments
2. Calculate total path length
3. Position label at 20px from start:
   - Get point on path at 20px
   - Calculate tangent at that point for rotation
   - Create transform matrix for label positioning

4. Render label:
   - Background rect with rounded corners
   - Text centered in rect
   - Apply transform to follow path orientation
```

## Event Lifecycle

### Normal Connection Creation

```
1. mousedown on exit
   └─► ConnectionDragHandler.startDrag()
       └─► EVENT_CONNECTION_DRAG

2. mousemove (multiple times)
   └─► ConnectionDragHandler.updateDrag()
       └─► Update temporary SVG line
       └─► Highlight/unhighlight targets

3. mouseup over valid target
   └─► ConnectionDragHandler.endDrag()
       └─► EVENT_CONNECTION
           └─► Editor.makeConnection()
               └─► Plumber.connectIds()
                   └─► ConnectionManager creates permanent connection
```

### Connection Abort

```
1. mousedown on exit
   └─► EVENT_CONNECTION_DRAG

2. mousemove

3. mouseup over invalid target (or no target)
   └─► EVENT_CONNECTION_ABORT
       └─► Editor.makeConnection() (does nothing)
       └─► Clean up temporary line
```

### Connection Re-drag

```
1. mousedown on connected exit
   └─► EVENT_CONNECTION_DRAG
       └─► Set existing connection to semi-transparent

2. mousemove

3. mouseup over different valid target
   └─► EVENT_CONNECTION_DETACHED (old connection)
       └─► EVENT_CONNECTION (new connection)
           └─► Remove old connection
           └─► Create new connection
           └─► Update flow definition
```

### Connection Revert

```
1. mousedown on connected exit
   └─► EVENT_CONNECTION_DRAG

2. mousemove

3. mouseup over invalid target
   └─► EVENT_REVERT
       └─► Restore original connection to full opacity
       └─► Clean up temporary line
```

## File Organization

```
src/flow/
├── ConnectionManager.ts      (NEW - Core connection library)
│   ├── ConnectionManager class
│   ├── ConnectionInfo interface
│   ├── SourceConfig / TargetConfig
│   └── Event constants
│
├── ConnectionDragHandler.ts  (NEW - Drag & drop handling)
│   ├── ConnectionDragHandler class
│   ├── Mouse event handlers
│   └── Visual feedback methods
│
├── SVGPathCalculator.ts      (NEW - Path calculation)
│   ├── calculateFlowchartPath()
│   ├── Point / PathSegment types
│   └── Corner rounding utilities
│
├── ActivityOverlayManager.ts (NEW - Activity overlays)
│   ├── ActivityOverlayManager class
│   ├── Overlay rendering
│   └── Recent contacts popup
│
├── Plumber.ts                (MODIFIED - Use ConnectionManager)
│   ├── Updated to delegate to ConnectionManager
│   ├── Keep same public API
│   └── Backward compatibility layer
│
├── Editor.ts                 (MINIMAL CHANGES)
│   └── Remove jsPlumb import, update event types
│
└── CanvasNode.ts             (MINIMAL CHANGES)
    └── No changes needed (uses Plumber API)
```

## Migration Path

### Phase 1: Side-by-side Implementation
```
- Create ConnectionManager (no integration yet)
- Implement core features
- Unit test in isolation
```

### Phase 2: Feature Parity
```
- Implement all jsPlumb features used
- Match visual appearance exactly
- Ensure event signatures match
```

### Phase 3: Integration
```
- Update Plumber to use ConnectionManager
- Keep jsPlumb as fallback (feature flag)
- Test both implementations
```

### Phase 4: Switchover
```
- Enable ConnectionManager by default
- Deprecate jsPlumb code path
- Monitor for issues
```

### Phase 5: Cleanup
```
- Remove jsPlumb dependency
- Remove fallback code
- Update documentation
```

## Performance Optimizations

### Connection Rendering
- Use single SVG container for all connections
- Batch DOM updates with requestAnimationFrame
- Reuse SVG elements when possible (hide/show vs create/destroy)

### Drag Operations
- Throttle mousemove events (use RAF)
- Cache DOM queries during drag
- Pre-calculate target hit boxes

### Revalidation
- Track which connections need updates
- Batch revalidation calls (50ms debounce)
- Only recalculate paths that changed

### Memory Management
- Remove event listeners when connections deleted
- Clear caches periodically
- Avoid circular references in connection objects
