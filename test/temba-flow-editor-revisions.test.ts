import { html, fixture, expect } from '@open-wc/testing';
import { Editor } from '../src/flow/Editor';
import { IssuesWindow } from '../src/flow/IssuesWindow';
import { RevisionsWindow } from '../src/flow/RevisionsWindow';
import { zustand } from '../src/store/AppState';
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

  it('should include the current revision at the top of the list', async () => {
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
    expect(revisions.length).to.equal(3);
    expect(revisions[0].id).to.equal(3);
    expect(revisions[1].id).to.equal(2);
    expect(revisions[2].id).to.equal(1);
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
    expect(revisions.length).to.equal(1);
    expect(revisions[0].id).to.equal(1);
  });

  it('collapses revisions inside a 15 minute window into the most recent', async () => {
    const mockRevisions = [
      {
        id: 4,
        created_on: '2024-06-01T12:30:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: [
          {
            type: 'action_updated',
            node: 'n1',
            uuid: 'a1',
            subtype: 'send_msg'
          }
        ]
      },
      {
        id: 3,
        created_on: '2024-06-01T12:25:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: [
          {
            type: 'action_updated',
            node: 'n1',
            uuid: 'a2',
            subtype: 'send_msg'
          }
        ]
      },
      {
        id: 2,
        created_on: '2024-06-01T12:20:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: [{ type: 'sticky_added', uuid: 's1' }]
      },
      {
        id: 1,
        created_on: '2024-06-01T11:00:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: [{ type: 'node_moved', uuid: 'n1' }]
      }
    ];

    const mockResponse = new Response(
      JSON.stringify({ results: mockRevisions }),
      { status: 200 }
    );
    fetchStub.resolves(mockResponse);

    await (revisionsWindow as any).fetchRevisions();

    const revisions = (revisionsWindow as any).revisions;
    // ids 4/3/2 are within 15 min → collapsed onto id 4; id 1 stands alone
    expect(revisions.length).to.equal(2);
    expect(revisions[0].id).to.equal(4);
    expect(revisions[0].changes.length).to.equal(3);
    expect(revisions[1].id).to.equal(1);
  });

  it('does not collapse revisions exactly 15 minutes apart (strict less-than)', async () => {
    const mockRevisions = [
      {
        id: 2,
        created_on: '2024-06-01T12:15:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: [{ type: 'sticky_added', uuid: 's1' }]
      },
      {
        id: 1,
        created_on: '2024-06-01T12:00:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: [{ type: 'sticky_added', uuid: 's2' }]
      }
    ];

    const mockResponse = new Response(
      JSON.stringify({ results: mockRevisions }),
      { status: 200 }
    );
    fetchStub.resolves(mockResponse);

    await (revisionsWindow as any).fetchRevisions();

    const revisions = (revisionsWindow as any).revisions;
    expect(revisions.length).to.equal(2);
    expect(revisions[0].id).to.equal(2);
    expect(revisions[1].id).to.equal(1);
  });

  it('keeps revisions with no recorded changes standalone', async () => {
    const mockRevisions = [
      {
        id: 3,
        created_on: '2024-06-01T12:10:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: [{ type: 'sticky_added', uuid: 's1' }]
      },
      {
        id: 2,
        created_on: '2024-06-01T12:05:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: null
      },
      {
        id: 1,
        created_on: '2024-06-01T12:00:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: [{ type: 'sticky_added', uuid: 's2' }]
      }
    ];

    const mockResponse = new Response(
      JSON.stringify({ results: mockRevisions }),
      { status: 200 }
    );
    fetchStub.resolves(mockResponse);

    await (revisionsWindow as any).fetchRevisions();

    const revisions = (revisionsWindow as any).revisions;
    expect(revisions.length).to.equal(3);
    expect(revisions.map((r: any) => r.id)).to.deep.equal([3, 2, 1]);
  });

  it('keeps significant revisions standalone, splitting groups around them', async () => {
    const mockRevisions = [
      {
        id: 3,
        created_on: '2024-06-01T12:10:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: [
          {
            type: 'action_updated',
            node: 'n1',
            uuid: 'a1',
            subtype: 'send_msg'
          }
        ]
      },
      {
        id: 2,
        created_on: '2024-06-01T12:05:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        // three distinct phrase groups → significant
        changes: [
          { type: 'metadata_changed', field: 'name' },
          { type: 'action_added', node: 'n1', uuid: 'a2', subtype: 'send_msg' },
          { type: 'sticky_added', uuid: 's1' }
        ]
      },
      {
        id: 1,
        created_on: '2024-06-01T12:00:00Z',
        user: { id: 1, first_name: 'A', last_name: 'B', username: 'ab' },
        changes: [{ type: 'sticky_moved', uuid: 's2' }]
      }
    ];

    const mockResponse = new Response(
      JSON.stringify({ results: mockRevisions }),
      { status: 200 }
    );
    fetchStub.resolves(mockResponse);

    await (revisionsWindow as any).fetchRevisions();

    const revisions = (revisionsWindow as any).revisions;
    expect(revisions.length).to.equal(3);
    expect(revisions[0].id).to.equal(3);
    expect(revisions[1].id).to.equal(2);
    expect(revisions[2].id).to.equal(1);
    // changes should not have been merged across the significant revision
    expect(revisions[0].changes.length).to.equal(1);
    expect(revisions[1].changes.length).to.equal(3);
    expect(revisions[2].changes.length).to.equal(1);
  });

  it('refreshes the list when a new revision is saved while the window is open', async () => {
    fetchStub.callsFake(
      async () =>
        new Response(JSON.stringify({ results: [] }), { status: 200 })
    );

    zustand.setState({
      viewingRevision: false,
      flowDefinition: { revision: 1, nodes: [] } as any
    });
    (revisionsWindow as any).hidden = false;
    await revisionsWindow.updateComplete;
    fetchStub.resetHistory();

    zustand.setState({
      flowDefinition: { revision: 2, nodes: [] } as any
    });
    await revisionsWindow.updateComplete;

    expect(fetchStub.callCount).to.be.greaterThan(0);
  });

  it('does not refresh when the revision number decreases (e.g., loading an older one)', async () => {
    fetchStub.callsFake(
      async () =>
        new Response(JSON.stringify({ results: [] }), { status: 200 })
    );

    zustand.setState({
      viewingRevision: false,
      flowDefinition: { revision: 7, nodes: [] } as any
    });
    (revisionsWindow as any).hidden = false;
    await revisionsWindow.updateComplete;
    fetchStub.resetHistory();

    // revision number drops without viewingRevision flipping (e.g., a fetch race)
    zustand.setState({
      flowDefinition: { revision: 4, nodes: [] } as any
    });
    await revisionsWindow.updateComplete;

    expect(fetchStub.callCount).to.equal(0);
  });

  it('does not refresh when previewing an older revision', async () => {
    fetchStub.callsFake(
      async () =>
        new Response(JSON.stringify({ results: [] }), { status: 200 })
    );

    zustand.setState({
      viewingRevision: false,
      flowDefinition: { revision: 5, nodes: [] } as any
    });
    (revisionsWindow as any).hidden = false;
    await revisionsWindow.updateComplete;
    fetchStub.resetHistory();

    zustand.setState({
      viewingRevision: true,
      flowDefinition: { revision: 3, nodes: [] } as any
    });
    await revisionsWindow.updateComplete;

    expect(fetchStub.callCount).to.equal(0);
  });

  it('should label the current revision and not show a revert button for it', async () => {
    (element as any).revisionsWindowHidden = false;
    await element.requestUpdate();

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
      }
    ];
    (revisionsWindow as any).revisions = mockRevisions;
    await revisionsWindow.updateComplete;

    const items = revisionsWindow.shadowRoot?.querySelectorAll(
      '.revision-item'
    ) as NodeListOf<HTMLElement>;
    expect(items.length).to.equal(2);

    // First item is the current revision
    expect(items[0].classList.contains('current')).to.be.true;
    expect(items[0].querySelector('.current-label')).to.exist;
    expect(items[0].querySelector('.revert-button')).to.not.exist;

    // Selecting the current revision should not show a revert button
    (revisionsWindow as any).viewingRevision = mockRevisions[0];
    await revisionsWindow.updateComplete;
    const refreshed = revisionsWindow.shadowRoot?.querySelectorAll(
      '.revision-item'
    ) as NodeListOf<HTMLElement>;
    expect(refreshed[0].classList.contains('selected')).to.be.true;
    expect(refreshed[0].querySelector('.revert-button')).to.not.exist;
    expect(refreshed[0].querySelector('.current-label')).to.exist;

    // Second item is not current and has no current label
    expect(items[1].classList.contains('current')).to.be.false;
    expect(items[1].querySelector('.current-label')).to.not.exist;
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
    (revisionsWindow as any).viewingRevision = mockRevisions[1]; // Select a non-current revision

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
