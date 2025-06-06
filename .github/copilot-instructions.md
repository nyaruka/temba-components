# Copilot Development Instructions

## Package Management

We use **yarn** for package management. Always use yarn commands instead of npm:

```bash
# Install dependencies
yarn install

# Add new dependencies
yarn add <package-name>

# Add dev dependencies
yarn add -D <package-name>
```

## Testing

All tests are run using:

```bash
yarn test
```

To check for coverage, use:

```bash
yarn test --coverage
```


### Isolating Tests for Quicker Development ###
You also can run an idividual test file to speed up development:

```bash
yarn test test/temba-textinput.test.ts
```

You can isolate a specific test within a file you are working to speed things up by updating the method in the file from it(...) to it.only(...)

For example:
```typescript
it('can select a single option', async () => {...});
```
becomes..
```typescript
it.only('can select a single option', async () => {...});
```

By doing this and only running the individual test file, you can drastically speed up iteration while running tests.

### Validation ###

Before a PR is ready it must pass validation checks for linting, formatting, and tests. This will also report coverage and you need to manually verify coverage does not drop.

```bash
yarn validate
```

### Making commits

Before committing always run `yarn precommit` and include any changes it makes.

### Test Coverage Requirements

- **100% code coverage** is expected for all code we touch
- The aim is to maintain complete test coverage across the codebase
- When modifying existing code, ensure all changed lines are covered by tests
- When adding new features, write comprehensive tests that cover all reachable code paths
- Never add tests to try to test unreachable or dead code, instead make a comment in the dead scope that it is unreachable

### Test Structure

Tests live under the `/test` directory and follow these patterns:

1. **Import required testing utilities:**

   ```typescript
   import { fixture, assert } from '@open-wc/testing';
   import { assertScreenshot, getClip, getComponent } from './utils.test';
   ```

2. **Test file naming:** Use the pattern `temba-{component}.test.ts`

3. **Test organization:** Use `describe()` blocks for component grouping and `it()` for individual test cases

4. **Test methodology:** These are ui based tests, so whenever possbile, the test should be written from the user's perspective. In other words, you should instrument a click in the browser to test behavior as a user would instead of calling instance methods on components. Instance method calling can be appropriate at times but should be used sparingly. For example, use the mouseClickElement() test method or the methods in src/untyped.d.ts for pressing keys, typing, using the mouse, etc.

5. **Example Test:** A good example test to model after is `temba-textinput.test.ts`

### Screenshot Testing

This project includes visual regression testing through screenshot comparison:

#### How Screenshot Tests Work

- Screenshots are captured during test execution using Puppeteer/Chromium
- "Truth" images are stored in `/screenshots/truth/` directory
- Test screenshots are compared pixel-by-pixel against truth images
- Failed comparisons generate diff images showing visual changes

#### Screenshot Test Implementation

```typescript
// Take a screenshot of a component
await assertScreenshot('component/state-name', clipRegion);

// Get clipping region for a component
const clip = getClip(element);

// Custom clip adjustments if needed
const customClip = getClip(element);
customClip.width += 20;
customClip.height += 10;
```

#### Critical Test Ordering

**Tests must validate expected values FIRST, then screenshots:**

```typescript
it('validates component behavior', async () => {
  const component = await getComponent('temba-example', { prop: 'value' });

  // 1. FIRST: Test expected values and behavior
  assert.instanceOf(component, ExampleComponent);
  expect(component.prop).to.equal('value');
  expect(component.textContent).to.contain('expected text');

  // 2. SECOND: Take screenshot for visual verification
  await assertScreenshot('example/state', getClip(component));
});
```

This ordering ensures:

- Functional correctness is verified before visual verification
- Failed functional tests provide clearer debugging information
- Screenshot tests serve as additional visual regression protection

#### Screenshot Test Best Practices

- Use descriptive names: `'component/specific-state'` not `'test1'`
- Include sufficient context in clip regions to show component state
- Adjust clip regions when components have dynamic sizing
- Group related screenshots in subdirectories (e.g., `tip/left`, `tip/right`)

## Development Workflow

1. **Install dependencies:** `yarn install`
2. **Start development server:** `yarn start`
3. **Run tests during development:** `yarn test`
4. **Pre-commit checks before committing:** `yarn pre-commit`
5. **Validate changes:** `yarn validate`
6. **Check Coverage:** Once validated, check for 100% coverage

## Code Quality

- Follow existing TypeScript patterns in the codebase
- Use ESLint and Prettier configurations (automatically enforced)
- Write descriptive test names and clear assertions
- Ensure all modified code paths have corresponding test coverage

## Formatting

- We use prettier for formatting, review the settings in .prettierrc
- When commmenting, if it is more than one sentence use standard case and punctuation, however for short comments, all lowercase is preferred

## Component Development

When creating or modifying components:

1. Create/update the component implementation
2. Write comprehensive unit tests covering all functionality
3. Add screenshot tests for visual states
4. Verify 100% coverage of modified code
5. Run full test suite to ensure no regressions
6. Make sure building for production yields no errors

Remember: The goal is robust, well-tested components with both functional and visual verification.
