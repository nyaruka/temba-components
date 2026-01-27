import { html, fixture, expect } from '@open-wc/testing';
import { Editor } from '../src/flow/Editor';
import { stub, restore, SinonStub } from 'sinon';

customElements.define('temba-flow-editor-revisions', Editor);

describe('Editor Revisions', () => {
  let element: Editor;
  let fetchStub: SinonStub;

  beforeEach(async () => {
    restore();
    fetchStub = stub(window, 'fetch');
    // Initialize without 'flow' attribute to prevent firstUpdated from calling getStore().getState()
    element = await fixture(
      html`<temba-flow-editor-revisions></temba-flow-editor-revisions>`
    );
    element.flow = 'test-flow';
  });

  afterEach(() => {
    restore();
  });

  it('should exclude the most recent revision from the list', async () => {
    const mockRevisions = [
      {
        id: 3,
        created_on: '2023-01-03',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' }
      },
      {
        id: 2,
        created_on: '2023-01-02',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' }
      },
      {
        id: 1,
        created_on: '2023-01-01',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' }
      }
    ];

    // Mock the fetch response for the revisions list
    const mockResponse = new Response(
      JSON.stringify({ results: mockRevisions }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    fetchStub.resolves(mockResponse);

    // Call fetchRevisions (private)
    // Note: fetchRevisions calls fetchResults -> fetchResultsPage -> fetch
    await (element as any).fetchRevisions();

    const revisions = (element as any).revisions;
    expect(revisions.length).to.equal(2);
    expect(revisions[0].id).to.equal(2);
    expect(revisions[1].id).to.equal(1);
  });

  it('should handle empty revisions list', async () => {
    const mockResponse = new Response(JSON.stringify({ results: [] }), {
      status: 200
    });
    fetchStub.resolves(mockResponse);

    await (element as any).fetchRevisions();
    const revisions = (element as any).revisions;
    expect(revisions.length).to.equal(0);
  });

  it('should handle single revision in list', async () => {
    const mockRevisions = [
      {
        id: 1,
        created_on: '2023-01-01',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' }
      }
    ];
    const mockResponse = new Response(
      JSON.stringify({ results: mockRevisions }),
      { status: 200 }
    );
    fetchStub.resolves(mockResponse);

    await (element as any).fetchRevisions();
    const revisions = (element as any).revisions;
    expect(revisions.length).to.equal(0);
  });

  it('should have purple color for revisions tab and blue for selected item', async () => {
    // Force revisions window to show
    (element as any).revisionsWindowHidden = false;
    (element as any).localizationWindowHidden = true;

    // Mock revisions so we can see list items
    const mockRevisions = [
      {
        id: 2,
        created_on: '2023-01-02',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' }
      },
      {
        id: 1,
        created_on: '2023-01-01',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' }
      }
    ];
    (element as any).revisions = mockRevisions;
    (element as any).viewingRevision = mockRevisions[0]; // Select the first one

    await element.requestUpdate();

    // Check tab color
    const tab = element.querySelector('#revisions-tab');
    expect(tab).to.exist;
    expect(tab.getAttribute('color')).to.equal('#a626a4');

    // Check selected item styles
    const selectedItem = element.querySelector(
      '.revision-item.selected'
    ) as HTMLElement;
    expect(selectedItem).to.exist;

    // We need to check inline styles because they are set in the template
    const style = selectedItem.getAttribute('style');
    expect(style).to.contain('#f0f6ff'); // Blue background
    expect(style).to.contain('#a4cafe'); // Blue border
  });
});
