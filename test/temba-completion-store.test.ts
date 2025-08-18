import { expect, fixture, html } from '@open-wc/testing';
import { Store } from '../src/store/Store';
import { Completion } from '../src/form/Completion';

// Register the components
import '../temba-modules';

describe('Completion with store', () => {
  it('should work with proper completion endpoint', async () => {
    // Create a store with the completion endpoint
    const store = await fixture<Store>(html`
      <temba-store completion="/api/v2/completion.json"></temba-store>
    `);

    // Wait for the store to be ready
    await new Promise((resolve) => {
      const checkReady = () => {
        if (store.ready) {
          resolve(true);
        } else {
          setTimeout(checkReady, 10);
        }
      };
      checkReady();
    });

    // Verify the store has loaded the schema
    const schema = store.getCompletionSchema();
    expect(schema).to.not.be.undefined;
    expect(schema.types).to.not.be.undefined;
    expect(schema.root).to.not.be.undefined;
    expect(schema.root_no_session).to.not.be.undefined;

    // Verify functions are loaded
    const functions = store.getFunctions();
    expect(functions).to.not.be.undefined;
    expect(functions.length).to.be.greaterThan(0);

    // Now test completion component
    const completion = await fixture<Completion>(html`
      <temba-completion value="@cont"></temba-completion>
    `);

    // Simulate typing in the completion field
    const textInput = completion.shadowRoot.querySelector('temba-textinput');
    expect(textInput).to.not.be.null;
  });
});
