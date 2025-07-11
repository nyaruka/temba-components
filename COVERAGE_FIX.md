# Coverage Fix for CSS-in-JS Template Literals

This fix addresses the issue where Istanbul coverage was incorrectly treating CSS template literal lines as executable statements.

## Problem

The v8-to-istanbul conversion process was treating every line within CSS template literals (marked with `css\``) as an executable statement that needed to be "covered" by tests. This resulted in:

1. Inflated line counts (e.g., RangePicker showing 614 lines instead of 521 actual executable lines)
2. CSS styles incorrectly marked as "uncovered" statements
3. Misleading coverage percentages
4. Confusion about what code actually needs test coverage

## Solution

The `fix-coverage.js` script post-processes the LCOV coverage data to:

1. Parse TypeScript files to identify CSS template literal blocks
2. Remove those lines from the coverage calculation
3. Update the LF (lines found) and LH (lines hit) counts accordingly

## Usage

The fix is automatically integrated into the test coverage workflow:

```bash
yarn test:coverage  # Now includes the CSS fix automatically
```

Manual usage:

```bash
yarn test --coverage    # Generate coverage data
node fix-coverage.js   # Fix the CSS template literal issue
node check-coverage.js # Check final coverage
```

## Results

- **Before fix**: 22,677/27,383 statements (82.81%) - but included 6,561 CSS lines
- **After fix**: 16,427/20,822 statements (78.89%) - accurate coverage of executable code
- **CSS lines removed**: 6,561 lines across 63 component files

## Files Affected

The fix correctly processes CSS template literals in all component files, including:
- RangePicker: 93 CSS lines removed
- ImagePicker: 111 CSS lines removed  
- All other components with CSS-in-JS styling

The coverage reports now accurately reflect what code requires test coverage vs what is static CSS styling.