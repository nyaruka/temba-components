import '../temba-modules';
import { fixture, assert, oneEvent } from '@open-wc/testing';
import { TabPane } from '../src/layout/TabPane';
import { Tab } from '../src/layout/Tab';
import { CustomEventType } from '../src/interfaces';

const SPLIT_TABS = `
  <temba-tabs orderable>
    <temba-tab name="Chat" icon="message" maxWidth="600" pinned>
      <div>chat</div>
    </temba-tab>
    <temba-tab name="Details" icon="info" splitWidth="300">
      <div>details</div>
    </temba-tab>
    <temba-tab name="Fields" icon="fields" splitWidth="300">
      <div>fields</div>
    </temba-tab>
    <temba-tab name="Notes" icon="notes">
      <div>notes</div>
    </temba-tab>
  </temba-tabs>
`;

const SKIP_TABS = `
  <temba-tabs>
    <temba-tab name="Chat" icon="message" maxWidth="600" pinned>
      <div>chat</div>
    </temba-tab>
    <temba-tab name="Details" icon="info" splitWidth="300">
      <div>details</div>
    </temba-tab>
    <temba-tab name="Static" icon="flow">
      <div>static</div>
    </temba-tab>
    <temba-tab name="Fields" icon="fields" splitWidth="300">
      <div>fields</div>
    </temba-tab>
  </temba-tabs>
`;

const BASIC_TABS = `
  <temba-tabs>
    <temba-tab name="First" icon="message">
      <div>first</div>
    </temba-tab>
    <temba-tab name="Second" icon="info">
      <div>second</div>
    </temba-tab>
  </temba-tabs>
`;

// let layout, the resize observer and the grow delay settle, then re-render
const settle = async (tabs: TabPane) => {
  await tabs.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 300));
  await tabs.updateComplete;
};

// wait for a condition that depends on the resize observer, which can be
// slow to fire when the test machine is under load
const until = async (tabs: TabPane, check: () => boolean) => {
  const start = Date.now();
  while (!check() && Date.now() - start < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  await tabs.updateComplete;
};

const getTabs = async (
  width: number,
  markup: string = SPLIT_TABS
): Promise<TabPane> => {
  const wrapper = (await fixture(
    `<div style="width:${width}px;display:flex;">${markup}</div>`
  )) as HTMLDivElement;
  const tabs = wrapper.querySelector('temba-tabs') as TabPane;
  await settle(tabs);
  return tabs;
};

describe('temba-tabs', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders tabs and switches on click', async () => {
    const tabs = await getTabs(500, BASIC_TABS);
    assert.equal(tabs.options.length, 2);
    assert.equal(tabs.index, 0);
    assert.isTrue(tabs.getTab(0).selected);

    const options = tabs.shadowRoot.querySelectorAll('.option');
    (options[1] as HTMLElement).click();
    await tabs.updateComplete;
    assert.equal(tabs.index, 1);
    assert.isTrue(tabs.getTab(1).selected);
    assert.isFalse(tabs.getTab(0).selected);
  });

  it('does not split without room', async () => {
    const tabs = await getTabs(800);
    assert.equal(tabs.splitTabs.length, 0);
    assert.isFalse(tabs.isSplitActive());
    assert.isNull(tabs.shadowRoot.querySelector('.option.merged'));

    // the anchor is uncapped so we never show empty space
    assert.equal(tabs.getTab(0).style.width, '');
  });

  it('pulls the next tab into a split view when it fits', async () => {
    const tabs = await getTabs(1000);
    assert.equal(tabs.splitTabs.length, 2);
    assert.isTrue(tabs.isSplitActive());

    const chat = tabs.getTab(0);
    const details = tabs.getTab(1);
    assert.isTrue(chat.split);
    assert.isTrue(details.split);
    assert.isFalse(tabs.getTab(2).split);

    // the anchor is capped and the last pane fills the rest
    assert.equal(chat.style.width, '600px');
    assert.equal(details.style.flexGrow, '1');

    // merged tabs render as a single option with segments
    const merged = tabs.shadowRoot.querySelector('.option.merged');
    assert.isNotNull(merged);
    assert.equal(merged.querySelectorAll('.segment').length, 2);
    assert.isTrue(merged.classList.contains('selected'));

    // the non-merged tabs are still their own options
    assert.equal(
      tabs.shadowRoot.querySelectorAll('.option:not(.merged)').length,
      2
    );
  });

  it('splits additional tabs in order as the width grows', async () => {
    const tabs = await getTabs(1300);
    assert.equal(tabs.splitTabs.length, 3);

    // notes doesn't declare a split width so it stays a tab
    assert.isFalse(tabs.getTab(3).split);

    // middle pane uses its minimum width, last pane flexes
    assert.equal(tabs.getTab(1).style.width, '300px');
    assert.equal(tabs.getTab(2).style.flexGrow, '1');

    // one resizer between the two secondary panes, none next to the anchor
    assert.equal(tabs.shadowRoot.querySelectorAll('.resizer').length, 1);
  });

  it('shows pane headers for pulled down tabs', async () => {
    const tabs = await getTabs(1300);
    assert.equal(tabs.splitTabs.length, 3);
    await tabs.getTab(1).updateComplete;

    // the anchor doesn't get a header or card treatment, pulled panes do
    assert.isNull(tabs.getTab(0).shadowRoot.querySelector('.header'));
    assert.isFalse(tabs.getTab(0).classList.contains('pane-card'));
    assert.isTrue(tabs.getTab(1).classList.contains('pane-card'));
    assert.isTrue(tabs.getTab(2).classList.contains('pane-card'));
    assert.include(
      tabs.getTab(1).shadowRoot.querySelector('.header .name').textContent,
      'Details'
    );
    assert.include(
      tabs.getTab(2).shadowRoot.querySelector('.header .name').textContent,
      'Fields'
    );
  });

  it('skips tabs that are not split enabled', async () => {
    const tabs = await getTabs(1300, SKIP_TABS);

    // static has no split width, so chat merges with details and fields
    assert.equal(tabs.splitTabs.length, 3);
    assert.deepEqual(
      tabs.splitTabs.map((tab) => tab.name),
      ['Chat', 'Details', 'Fields']
    );
    assert.isFalse(tabs.getTab(2).split);

    // static remains its own option next to the merged one
    assert.equal(tabs.shadowRoot.querySelectorAll('.option').length, 2);
  });

  it('waits for the width to settle before adding panes', async () => {
    const wrapper = (await fixture(
      `<div style="width:1300px;display:flex;">${SPLIT_TABS}</div>`
    )) as HTMLDivElement;
    const tabs = wrapper.querySelector('temba-tabs') as TabPane;
    await tabs.updateComplete;

    // shortly after load we haven't split yet, we're waiting for the
    // layout to settle
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(tabs.splitTabs.length, 0);

    // a late layout shift (like the nav menu arriving) shrinks us before
    // the grow delay elapses, so the extra pane never flashes in
    wrapper.style.width = '1000px';
    await until(tabs, () => tabs.splitTabs.length === 2);
    assert.equal(tabs.splitTabs.length, 2);
  });

  it('pops tabs back out when the width shrinks', async () => {
    const tabs = await getTabs(1300);
    assert.equal(tabs.splitTabs.length, 3);

    const wrapper = tabs.parentElement;
    wrapper.style.width = '1000px';
    await until(tabs, () => tabs.splitTabs.length === 2);
    assert.equal(tabs.splitTabs.length, 2);
    assert.isFalse(tabs.getTab(2).split);

    wrapper.style.width = '700px';
    await until(tabs, () => tabs.splitTabs.length === 0);
    assert.equal(tabs.splitTabs.length, 0);
    assert.isFalse(tabs.getTab(0).split);
    assert.equal(tabs.getTab(0).style.width, '');
    assert.isNull(tabs.shadowRoot.querySelector('.option.merged'));
  });

  it('shows other tabs alone while the merged view is not selected', async () => {
    const tabs = await getTabs(1000);
    assert.isTrue(tabs.isSplitActive());

    tabs.index = 3;
    await settle(tabs);
    assert.isFalse(tabs.isSplitActive());
    assert.isFalse(tabs.getTab(0).split);
    assert.isTrue(tabs.getTab(3).selected);

    // the merged option is still there, just not selected
    const merged = tabs.shadowRoot.querySelector('.option.merged');
    assert.isNotNull(merged);
    assert.isFalse(merged.classList.contains('selected'));

    // clicking it brings the split view back
    (merged as HTMLElement).click();
    await settle(tabs);
    assert.equal(tabs.index, 0);
    assert.isTrue(tabs.isSplitActive());
  });

  it('resizes middle panes with the resizer and remembers the width', async () => {
    const tabs = await getTabs(1300);
    const details = tabs.getTab(1);
    assert.equal(details.style.width, '300px');

    const resizer = tabs.shadowRoot.querySelector('.resizer') as HTMLElement;
    resizer.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 0 })
    );
    assert.isTrue(tabs.dragging);

    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50 }));
    assert.equal(details.style.width, '350px');

    const listener = oneEvent(tabs, CustomEventType.Resized, false);
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 50 }));
    const event = await listener;

    assert.isFalse(tabs.dragging);
    assert.equal(event.detail.width, 350);
    assert.equal(window.localStorage.getItem('temba-tabs-split-info'), '350');
  });

  it('clamps resizer drags to the pane minimums', async () => {
    const tabs = await getTabs(1300);
    const details = tabs.getTab(1);

    const resizer = tabs.shadowRoot.querySelector('.resizer') as HTMLElement;
    resizer.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: 0 })
    );

    // can't shrink below our own minimum
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: -500 }));
    assert.equal(details.style.width, '300px');

    // can't grow past the last pane's minimum
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 5000 }));
    const width = parseInt(details.style.width);
    const fields = tabs.getTab(2) as Tab;
    assert.isAtLeast(fields.offsetWidth, 299);
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 5000 }));
    assert.isBelow(width, 5000);
  });

  it('restores remembered widths, clamped to the available space', async () => {
    window.localStorage.setItem('temba-tabs-split-info', '450');
    let tabs = await getTabs(1450);
    assert.equal(tabs.getTab(1).style.width, '450px');

    // a remembered width that no longer fits is clamped so the last
    // pane keeps its minimum
    window.localStorage.setItem('temba-tabs-split-info', '10000');
    tabs = await getTabs(1300);
    assert.equal(tabs.getTab(1).style.width, '370px');
  });

  it('skips hidden tabs when merging', async () => {
    const tabs = await getTabs(1300);
    tabs.setTabDetails(1, { count: 0, hidden: true });
    await settle(tabs);

    // details is hidden so chat merges directly with fields
    assert.equal(tabs.splitTabs.length, 2);
    assert.isFalse(tabs.getTab(1).split);
    assert.isTrue(tabs.getTab(2).split);
  });

  it('reorders tabs by dragging and remembers the order', async () => {
    const tabs = await getTabs(1000);
    assert.equal(tabs.splitTabs[1].name, 'Details');

    // drag the fields option to the left of the merged option
    const fields = tabs.shadowRoot.querySelector(
      '.option[data-index="2"]'
    ) as HTMLElement;
    const merged = tabs.shadowRoot.querySelector(
      '.option.merged'
    ) as HTMLElement;
    const fieldsBox = fields.getBoundingClientRect();
    const mergedBox = merged.getBoundingClientRect();

    fields.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        clientX: fieldsBox.left + 10,
        clientY: fieldsBox.top + 5
      })
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: mergedBox.left + 2,
        clientY: mergedBox.top + 5
      })
    );
    assert.isTrue(tabs.orderDragging);
    window.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: mergedBox.left + 2,
        clientY: mergedBox.top + 5
      })
    );
    await settle(tabs);

    // fields is now the first tab pulled into the split view
    assert.isFalse(tabs.orderDragging);
    assert.equal(tabs.splitTabs[1].name, 'Fields');
    assert.equal(tabs.index, 0);
    assert.equal(
      window.localStorage.getItem('temba-tabs-order'),
      '["fields","info","notes"]'
    );
  });

  it('ignores stored ordering when not orderable', async () => {
    // an order saved from another view must not leak into tab panes that
    // don't allow reordering
    window.localStorage.setItem(
      'temba-tabs-order',
      JSON.stringify(['fields', 'info', 'notes'])
    );
    const tabs = await getTabs(1000, SKIP_TABS);
    assert.equal(tabs.getDisplayOrder()[0].name, 'Chat');
    assert.equal(tabs.getDisplayOrder()[1].name, 'Details');
    assert.equal(tabs.splitTabs[1].name, 'Details');
  });

  it('reorders merged panes by dragging their segments', async () => {
    const tabs = await getTabs(1300);
    assert.deepEqual(
      tabs.splitTabs.map((tab) => tab.name),
      ['Chat', 'Details', 'Fields']
    );

    // drag the details segment past the fields segment
    const segments = tabs.shadowRoot.querySelectorAll(
      '.option.merged .segment'
    );
    const details = segments[1] as HTMLElement;
    const fields = segments[2] as HTMLElement;
    const detailsBox = details.getBoundingClientRect();
    const fieldsBox = fields.getBoundingClientRect();

    details.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        clientX: detailsBox.left + 10,
        clientY: detailsBox.top + 5
      })
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: fieldsBox.right - 2,
        clientY: fieldsBox.top + 5
      })
    );
    window.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: fieldsBox.right - 2,
        clientY: fieldsBox.top + 5
      })
    );
    await settle(tabs);

    assert.deepEqual(
      tabs.splitTabs.map((tab) => tab.name),
      ['Chat', 'Fields', 'Details']
    );
    assert.equal(
      window.localStorage.getItem('temba-tabs-order'),
      '["fields","info","notes"]'
    );
  });

  it('reorders panes by dragging their title bars', async () => {
    const tabs = await getTabs(1300);
    assert.deepEqual(
      tabs.splitTabs.map((tab) => tab.name),
      ['Chat', 'Details', 'Fields']
    );

    const details = tabs.getTab(1);
    await details.updateComplete;
    const header = details.shadowRoot.querySelector('.header') as HTMLElement;
    assert.isTrue(header.classList.contains('grab'));

    const headerBox = header.getBoundingClientRect();
    const fieldsBox = tabs.getTab(2).getBoundingClientRect();

    header.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        composed: true,
        clientX: headerBox.left + 20,
        clientY: headerBox.top + 5
      })
    );

    // a small move starts the drag, lifting the card at its position
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: headerBox.left + 40,
        clientY: headerBox.top + 5
      })
    );

    // then drag until the card itself crosses the fields pane midpoint,
    // the whole card follows while a placeholder holds its slot and the
    // panes reorder live
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        clientX: fieldsBox.right - 10,
        clientY: headerBox.top + 5
      })
    );
    assert.equal(details.style.position, 'fixed');
    const placeholder = tabs.shadowRoot.querySelector(
      '.drop-placeholder'
    ) as HTMLElement;
    assert.isNotNull(placeholder);
    assert.deepEqual(
      tabs.splitTabs.map((tab) => tab.name),
      ['Chat', 'Fields', 'Details']
    );

    // the placeholder holds the dragged card's slot, after fields
    assert.equal(placeholder.style.order, '4');

    window.dispatchEvent(
      new MouseEvent('mouseup', {
        clientX: fieldsBox.right - 10,
        clientY: headerBox.top + 5
      })
    );
    await settle(tabs);
    assert.equal(details.style.position, '');
    assert.isNull(tabs.shadowRoot.querySelector('.drop-placeholder'));
    assert.equal(
      window.localStorage.getItem('temba-tabs-order'),
      '["fields","info","notes"]'
    );
  });

  it('never lets pane content clip or scroll horizontally', async () => {
    const tabs = await getTabs(
      1000,
      `
      <temba-tabs>
        <temba-tab name="Chat" icon="message" maxWidth="600" pinned>
          <div>chat</div>
        </temba-tab>
        <temba-tab name="Details" icon="info" splitWidth="300">
          <div class="long">${'x'.repeat(600)}</div>
          <div class="wide" style="width:800px">wide</div>
        </temba-tab>
      </temba-tabs>
    `
    );
    assert.equal(tabs.splitTabs.length, 2);
    const details = tabs.getTab(1);
    const paneWidth = details.getBoundingClientRect().width;

    // an unbreakable string wraps instead of overflowing
    const long = details.querySelector('.long') as HTMLElement;
    assert.isAtMost(long.scrollWidth, long.clientWidth + 1);
    assert.isAbove(long.getBoundingClientRect().height, 30);

    // an explicitly wide child is clamped to the pane
    const wide = details.querySelector('.wide') as HTMLElement;
    assert.isAtMost(wide.getBoundingClientRect().width, paneWidth + 1);
  });

  it('restores a remembered tab order', async () => {
    window.localStorage.setItem(
      'temba-tabs-order',
      JSON.stringify(['fields', 'info', 'notes'])
    );
    const tabs = await getTabs(1000);

    // fields ranks first so it gets pulled down instead of details
    assert.equal(tabs.splitTabs.length, 2);
    assert.equal(tabs.splitTabs[1].name, 'Fields');

    // the pinned chat tab is unaffected by ordering
    assert.equal(tabs.getDisplayOrder()[0].name, 'Chat');
  });
});
