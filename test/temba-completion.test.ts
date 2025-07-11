import { fixture, assert, expect } from '@open-wc/testing';
import { Completion } from '../src/form/Completion';
import { assertScreenshot, getClip, getComponent } from './utils.test';

export const getHTML = (attrs = {}) => {
  const attrString = Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  return `<temba-completion ${attrString}></temba-completion>`;
};

describe('temba-completion', () => {
  it('can be created', async () => {
    const completion: Completion = await fixture(getHTML());
    assert.instanceOf(completion, Completion);
  });

  it('highlights expressions with background color', async () => {
    const completion = (await getComponent('temba-completion', {
      value: 'Hello @contact.name, your age is @contact.age years.',
      session: true
    })) as Completion;

    assert.instanceOf(completion, Completion);

    // Wait for the component to initialize and update highlights
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Check that the highlight overlay exists
    const highlightOverlay = completion.shadowRoot.querySelector(
      '.highlight-overlay'
    ) as HTMLDivElement;
    assert.exists(highlightOverlay, 'Highlight overlay should exist');

    // Check that expression highlights are created
    const highlights = highlightOverlay.querySelectorAll(
      '.expression-highlight'
    );
    expect(highlights.length).to.equal(
      2,
      'Should have two expression highlights'
    );

    await assertScreenshot(
      'completion/expression-highlights',
      getClip(completion)
    );
  });

  it('updates highlights when value changes', async () => {
    const completion = (await getComponent('temba-completion', {
      value: 'Hello @contact.name',
      session: true
    })) as Completion;

    // Wait for initial highlights
    await new Promise((resolve) => setTimeout(resolve, 100));

    const highlightOverlay = completion.shadowRoot.querySelector(
      '.highlight-overlay'
    ) as HTMLDivElement;
    let highlights = highlightOverlay.querySelectorAll('.expression-highlight');
    expect(highlights.length).to.equal(
      1,
      'Should have one expression highlight initially'
    );

    // Update the value
    completion.value = 'Hello @contact.name, welcome @contact.first_name!';
    await completion.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check updated highlights
    highlights = highlightOverlay.querySelectorAll('.expression-highlight');
    expect(highlights.length).to.equal(
      2,
      'Should have two expression highlights after update'
    );

    await assertScreenshot(
      'completion/updated-expression-highlights',
      getClip(completion)
    );
  });

  it('does not highlight when disableCompletion is true', async () => {
    const completion = (await getComponent('temba-completion', {
      value: 'Hello @contact.name',
      session: true,
      disableCompletion: true
    })) as Completion;

    // Wait for component to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const highlightOverlay = completion.shadowRoot.querySelector(
      '.highlight-overlay'
    ) as HTMLDivElement;
    const highlights = highlightOverlay.querySelectorAll(
      '.expression-highlight'
    );
    expect(highlights.length).to.equal(
      0,
      'Should have no highlights when completion is disabled'
    );

    await assertScreenshot(
      'completion/no-highlights-disabled',
      getClip(completion)
    );
  });

  it('handles empty value gracefully', async () => {
    const completion = (await getComponent('temba-completion', {
      value: '',
      session: true
    })) as Completion;

    // Wait for component to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const highlightOverlay = completion.shadowRoot.querySelector(
      '.highlight-overlay'
    ) as HTMLDivElement;
    const highlights = highlightOverlay.querySelectorAll(
      '.expression-highlight'
    );
    expect(highlights.length).to.equal(
      0,
      'Should have no highlights for empty value'
    );

    await assertScreenshot('completion/empty-value', getClip(completion));
  });

  it('highlights multiple simple expressions', async () => {
    const completion = (await getComponent('temba-completion', {
      value: 'Hello @contact.name and @contact.age',
      session: true
    })) as Completion;

    // Wait for component to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const highlightOverlay = completion.shadowRoot.querySelector(
      '.highlight-overlay'
    ) as HTMLDivElement;
    const highlights = highlightOverlay.querySelectorAll(
      '.expression-highlight'
    );
    expect(highlights.length).to.equal(
      2,
      'Should highlight two simple expressions'
    );

    await assertScreenshot(
      'completion/multiple-simple-expressions',
      getClip(completion)
    );
  });
});
