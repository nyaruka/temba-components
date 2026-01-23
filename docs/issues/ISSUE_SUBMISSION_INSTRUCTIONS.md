# How to Submit the jsPlumb Replacement Issue

This directory contains a comprehensive implementation guide for replacing jsPlumb with a custom connection library in the Flow Editor component.

## File Location

The complete issue content is in: `docs/issues/replace-jsplumb-implementation-guide.md`

## To Create the GitHub Issue

1. Go to: https://github.com/nyaruka/temba-components/issues/new

2. Set the title:
   ```
   Replace jsPlumb with Custom Connection Library
   ```

3. Copy the entire contents of `replace-jsplumb-implementation-guide.md` into the issue body

4. Add labels:
   - `enhancement`
   - `flow-editor`

5. Optionally assign to Claude Sonnet 4.5 or appropriate developer

## Issue Summary

The issue provides:

### Complete Analysis
- ✅ Detailed breakdown of all jsPlumb features currently used
- ✅ Event system documentation
- ✅ Visual styling requirements  
- ✅ Data model and storage format
- ✅ Performance considerations

### Implementation Guide
- ✅ Step-by-step implementation phases
- ✅ Complete API specifications
- ✅ Code structure and file organization
- ✅ Time estimates for each phase (25-36 hours total)

### Testing Requirements
- ✅ Comprehensive testing checklist
- ✅ Edge cases to verify
- ✅ Success criteria

### Context for Claude Sonnet 4.5
The issue is specifically written with clear, actionable instructions suitable for an AI agent to implement:
- Precise type definitions
- Exact visual specifications
- Clear behavioral requirements
- Backward compatibility requirements
- All CSS class names and styling

## Key Points for Implementation

1. **Goal**: Remove the `@jsplumb/browser-ui` dependency and replace with custom implementation
2. **Approach**: Event-driven, SVG-based connection management
3. **Priority**: Maintain 100% backward compatibility with existing functionality
4. **Benefit**: Smaller bundle size, better control, easier maintenance

## Next Steps

After submitting the issue:
1. The issue will serve as the complete specification
2. Implementation can proceed in phases as documented
3. Each phase can be verified independently
4. Testing checklist ensures nothing is missed
