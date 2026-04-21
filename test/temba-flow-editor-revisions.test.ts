import { html, fixture, expect } from '@open-wc/testing';
import { Editor } from '../src/flow/Editor';
import { IssuesWindow } from '../src/flow/IssuesWindow';
import { RevisionsWindow } from '../src/flow/RevisionsWindow';
import { stub, restore, SinonStub } from 'sinon';

customElements.define('temba-flow-editor-revisions', Editor);
if (!customElements.get('temba-issues-window')) {
  customElements.define('temba-issues-window', IssuesWindow);
}
if (!customElements.get('temba-revisions-window')) {
  customElements.define('temba-revisions-window', RevisionsWindow);
}

describe('Editor Revisions', () => {
  let element: Editor;
  let revisionsWindow: RevisionsWindow;
  let fetchStub: SinonStub;

  beforeEach(async () => {
    restore();
    fetchStub = stub(window, 'fetch');
    // Initialize without 'flow' attribute to prevent firstUpdated from calling getStore().getState()
    element = await fixture(
      html`<temba-flow-editor-revisions></temba-flow-editor-revisions>`
    );
    element.flow = 'test-flow';
    revisionsWindow = element.querySelector(
      'temba-revisions-window'
    ) as RevisionsWindow;
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

    await (revisionsWindow as any).fetchRevisions();

    const revisions = (revisionsWindow as any).revisions;
    expect(revisions.length).to.equal(2);
    expect(revisions[0].id).to.equal(2);
    expect(revisions[1].id).to.equal(1);
  });

  it('should handle empty revisions list', async () => {
    const mockResponse = new Response(JSON.stringify({ results: [] }), {
      status: 200
    });
    fetchStub.resolves(mockResponse);

    await (revisionsWindow as any).fetchRevisions();
    const revisions = (revisionsWindow as any).revisions;
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

    await (revisionsWindow as any).fetchRevisions();
    const revisions = (revisionsWindow as any).revisions;
    expect(revisions.length).to.equal(0);
  });

  it('should have purple color for revisions window and blue for selected item', async () => {
    // Force revisions window to show
    (element as any).revisionsWindowHidden = false;
    await element.requestUpdate();

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
    (revisionsWindow as any).revisions = mockRevisions;
    (revisionsWindow as any).viewingRevision = mockRevisions[0]; // Select the first one

    await revisionsWindow.updateComplete;

    // Check revisions window color - now inside the component's shadow DOM
    const floatingWindow = revisionsWindow.shadowRoot?.querySelector(
      'temba-floating-window'
    );
    expect(floatingWindow).to.exist;
    expect(floatingWindow.getAttribute('color')).to.equal('rgb(142, 94, 167)');

    // Check selected item styles - inside the component's shadow DOM
    const selectedItem = revisionsWindow.shadowRoot?.querySelector(
      '.revision-item.selected'
    ) as HTMLElement;
    expect(selectedItem).to.exist;

    // We need to check inline styles because they are set in the template
    const style = selectedItem.getAttribute('style');
    expect(style).to.contain('#f0f6ff'); // Blue background
    expect(style).to.contain('#a4cafe'); // Blue border
  });
});
