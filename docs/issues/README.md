# jsPlumb Replacement Project Documentation

This directory contains comprehensive documentation for replacing the jsPlumb dependency in the Flow Editor component with a custom, lightweight connection management library.

## 📁 Files in This Directory

### 1. **replace-jsplumb-implementation-guide.md** (PRIMARY DOCUMENT)
**Purpose**: Complete implementation guide for Claude Sonnet 4.5 or any developer  
**Content**:
- Background and motivation
- Current jsPlumb usage analysis (detailed breakdown)
- Visual requirements and styling specifications
- Data model documentation
- Complete API specifications
- Phase-by-phase implementation steps (9 phases)
- Time estimates (25-36 hours total)
- Comprehensive testing checklist
- Success criteria

**Use this as**: The main specification document when creating the GitHub issue

### 2. **technical-architecture.md**
**Purpose**: Visual and technical reference for the system architecture  
**Content**:
- System overview diagrams
- Component interaction flows
- Data flow diagrams (connection creation, removal, re-drag)
- SVG structure examples
- Event lifecycle documentation
- Key algorithms (flowchart path calculation, overlay positioning)
- File organization
- Migration path strategy
- Performance optimization guidelines

**Use this as**: Reference during implementation for understanding how components interact

### 3. **code-examples.md**
**Purpose**: Concrete code examples and implementation patterns  
**Content**:
- Complete ConnectionManager class implementation example
- Drag handler implementation
- Updated Plumber.ts example
- Unit test examples
- Integration examples (CanvasNode, Editor)
- Performance optimization techniques
- Caching strategies

**Use this as**: Starting point for actual code development

### 4. **ISSUE_SUBMISSION_INSTRUCTIONS.md**
**Purpose**: Instructions for creating the GitHub issue  
**Content**:
- Step-by-step guide to submit the issue
- What to include
- Labels to add
- Summary of what the issue contains

**Use this as**: Guide for submitting the issue to GitHub

## 🎯 Project Overview

### Goal
Replace the `@jsplumb/browser-ui` (v6.2.10) dependency with a custom implementation that:
- Covers only the features we actually use
- Reduces bundle size by ~100-200KB (gzipped)
- Gives us full control over connection management
- Maintains 100% backward compatibility

### Current State
The Flow Editor uses jsPlumb for:
- Drawing connections between flow nodes
- Drag & drop connection creation
- Visual feedback during interactions
- Activity count overlays on connections
- Managing connection state and events

### Target State
A custom ConnectionManager that:
- Renders connections using SVG with flowchart-style routing
- Handles drag & drop natively
- Provides event-driven architecture
- Supports all current features
- Has no external dependencies (except standard DOM/SVG APIs)

## 📊 Analysis Summary

### Files Analyzed
1. `src/flow/Plumber.ts` (667 lines) - jsPlumb wrapper
2. `src/flow/Editor.ts` - Connection event handling
3. `src/flow/CanvasNode.ts` - Node-level connection management
4. `test/temba-flow-plumber.test.ts` - Unit tests
5. `test/temba-flow-plumber-connections.test.ts` - Connection tests

### jsPlumb Features Used

| Feature | Usage | Custom Implementation |
|---------|-------|----------------------|
| Endpoints | Source (exit) and Target (node) | DOM elements with event listeners |
| Connectors | Flowchart style with arrows | SVG paths with custom routing |
| Drag & Drop | Connection creation | Mouse event handlers |
| Events | 5 event types | Custom event emitter |
| Overlays | Activity count labels | SVG text elements |
| Revalidation | Position updates | Path recalculation |
| Batch operations | Performance optimization | RequestAnimationFrame |

### Implementation Phases

```
Phase 1: Core ConnectionManager      [4-6 hours]
Phase 2: SVG Rendering               [4-6 hours]
Phase 3: Connection Management       [3-4 hours]
Phase 4: Drag and Drop              [6-8 hours]
Phase 5: Revalidation               [2-3 hours]
Phase 6: Activity Overlays          [3-4 hours]
Phase 7: Update Plumber.ts          [2-3 hours]
Phase 8: Testing                    [4-6 hours]
Phase 9: Cleanup                    [1-2 hours]
────────────────────────────────────────────────
Total:                              25-36 hours
```

## 🚀 Getting Started with Implementation

### Step 1: Review Documentation
1. Read `replace-jsplumb-implementation-guide.md` completely
2. Study `technical-architecture.md` for system design
3. Review `code-examples.md` for implementation patterns

### Step 2: Set Up Development
```bash
cd /path/to/temba-components
yarn install
yarn start  # Start development server
```

### Step 3: Create Issue
Follow instructions in `ISSUE_SUBMISSION_INSTRUCTIONS.md` to create a GitHub issue with the complete specification.

### Step 4: Begin Implementation
Start with Phase 1 (Core ConnectionManager):
```typescript
// Create new file: src/flow/ConnectionManager.ts
export class ConnectionManager {
  // Implement basic structure first
  // Then add features phase by phase
}
```

### Step 5: Test Continuously
After each phase:
```bash
yarn test test/temba-flow-connection-manager.test.ts
yarn test test/temba-flow-plumber.test.ts
```

## 📋 Testing Checklist

Before considering complete, verify:

### ✅ Basic Functionality
- [ ] Create connections by dragging exit to node
- [ ] Cannot create self-connections
- [ ] Remove connections with click
- [ ] Connection removal animation
- [ ] Multiple exits work independently

### ✅ Visual Rendering
- [ ] Flowchart (orthogonal) routing
- [ ] 5px corner radius
- [ ] Arrows at node end
- [ ] Correct stub distances (20px, 10px)
- [ ] Color changes on hover
- [ ] Color changes during removal

### ✅ Node Movement
- [ ] Real-time connection updates
- [ ] Connections stay attached
- [ ] Smooth performance

### ✅ Re-dragging
- [ ] Pick up from node side
- [ ] Semi-transparent during drag
- [ ] Can connect to new node
- [ ] Restore on cancel

### ✅ Activity Overlays
- [ ] Show count labels
- [ ] Positioned at 20px from exit
- [ ] Hover shows contacts (500ms delay)
- [ ] Click contact fires event
- [ ] Hide on mouse leave (200ms delay)

## 💡 Key Implementation Tips

### 1. Start Simple
Begin with basic connection rendering before adding drag & drop or overlays.

### 2. Match Visual Exactly
Use the same CSS classes as jsPlumb to maintain appearance without CSS changes.

### 3. Test Incrementally
Don't wait until the end - test each phase thoroughly before moving forward.

### 4. Performance Matters
- Use `requestAnimationFrame` for repaints during node drag
- Debounce rapid revalidation calls (50ms)
- Cache DOM queries
- Batch SVG updates

### 5. Keep Backward Compatibility
The Plumber.ts API must stay the same so Editor.ts and CanvasNode.ts don't need changes.

## 🎓 Technical Deep Dives

### Connection Storage
```typescript
interface Exit {
  uuid: string;
  destination_uuid?: string;  // This is the connection!
}
```
Connections are simply UUIDs stored on exits. The rendering library just visualizes these.

### Flowchart Routing Algorithm
```
1. Start at exit (bottom center)
2. Go down (startStub = 20px)
3. Route using right angles to target
4. Apply corner radius (5px) to soften turns
5. Final approach (endStub = 10px)
6. End at target (top/left/right face)
```

### Event Flow
```
User Action → Mouse Events → Drag Handler → Fire Custom Events → 
Editor/CanvasNode → Update Store → ConnectionManager → Update SVG
```

## 📚 Additional Resources

### Relevant Flow Editor Files
- `src/flow/Editor.ts` - Main editor component
- `src/flow/CanvasNode.ts` - Individual node rendering
- `src/flow/Plumber.ts` - Current connection manager
- `src/store/AppState.ts` - State management
- `src/store/flow-definition.d.ts` - Type definitions

### Current jsPlumb Usage
- Package: `@jsplumb/browser-ui` version 6.2.10
- Installation: `yarn add @jsplumb/browser-ui`
- Import: `import { newInstance, ready, ... } from '@jsplumb/browser-ui'`

### Testing
- Test runner: Web Test Runner
- Assertions: Chai (expect)
- Mocking: Sinon
- Commands:
  ```bash
  yarn test                  # Run all tests
  yarn test:watch           # Watch mode
  yarn test:coverage        # With coverage
  ```

## 🏁 Success Criteria

The implementation is complete when:

1. ✅ All existing flow editor functionality works identically
2. ✅ All unit tests pass (with updated mocks)
3. ✅ `@jsplumb/browser-ui` removed from package.json
4. ✅ Bundle size reduced by ~100-200KB
5. ✅ Visual appearance matches exactly
6. ✅ Performance is equal or better
7. ✅ Code is well-documented
8. ✅ No console errors or warnings

## 📞 Support and Questions

### During Implementation
- Refer back to this documentation
- Check code examples for patterns
- Review test files for expected behavior
- Use browser DevTools to inspect current jsPlumb behavior

### After Implementation
- Run full test suite: `yarn test`
- Check coverage: `yarn test:coverage`
- Validate in browser: `yarn start`
- Test with real flows and drag operations

## 🔄 Version History

- **v1.0** - Initial documentation created from jsPlumb usage analysis
  - Complete implementation guide
  - Technical architecture
  - Code examples
  - Testing checklist

---

## Quick Reference

| Document | Use For |
|----------|---------|
| **replace-jsplumb-implementation-guide.md** | GitHub issue, main spec |
| **technical-architecture.md** | System design, architecture |
| **code-examples.md** | Implementation patterns |
| **ISSUE_SUBMISSION_INSTRUCTIONS.md** | Creating the issue |
| **README.md** (this file) | Overview and navigation |

**Next Step**: Create a GitHub issue using the content from `replace-jsplumb-implementation-guide.md`
