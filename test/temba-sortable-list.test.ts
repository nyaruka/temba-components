import { expect, fixture, oneEvent } from '@open-wc/testing';
import { html, TemplateResult } from 'lit';
import { CustomEventType } from '../src/interfaces';
import { SortableList } from '../src/list/SortableList';
import { assertScreenshot, getClip } from './utils.test';
import Sinon, { useFakeTimers } from 'sinon';

const BORING_LIST = html`
  <temba-sortable-list>
    <style>
      .sortable {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        height: 20px;
      }
    </style>
    <div class="sortable" id="chicken" style="">Chicken</div>
    <div class="sortable" id="fish">Fish</div>
  </temba-sortable-list>
`;

const HORIZONTAL_LIST = html`
  <temba-sortable-list horizontal>
    <style>
      .sortable {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        height: 20px;
        width: 50px;
      }
    </style>
    <div class="sortable" id="red">Red</div>
    <div class="sortable" id="blue">Blue</div>
    <div class="sortable" id="green">Green</div>
  </temba-sortable-list>
`;

const createSorter = async (def: TemplateResult) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', 'width: 100px;');
  return (await fixture(def, { parentNode })) as SortableList;
};

describe('temba-sortable-list', () => {
  let clock: Sinon.SinonFakeTimers;
  beforeEach(function () {
    clock = useFakeTimers();
    clock.runAll();
  });

  afterEach(function () {
    clock.restore();
  });

  it('renders default', async () => {
    const list: SortableList = await createSorter(BORING_LIST);
    await assertScreenshot('list/sortable', getClip(list));
  });

  it('can get ids of sortable elements', async () => {
    const list: SortableList = await createSorter(BORING_LIST);
    await list.updateComplete;

    const ids = list.getIds();
    expect(ids).to.deep.equal(['chicken', 'fish']);
  });

  it('works with horizontal layout', async () => {
    const list: SortableList = await createSorter(HORIZONTAL_LIST);
    await list.updateComplete;

    const ids = list.getIds();
    expect(ids).to.deep.equal(['red', 'blue', 'green']);

    // Test horizontal drag behavior
    const bounds = list.getBoundingClientRect();
    const orderChanged = oneEvent(list, CustomEventType.OrderChanged, false);

    // Drag the first item (red) to after the second item (blue)
    await moveMouse(bounds.left + 10, bounds.top + 10);
    await mouseDown();
    await moveMouse(bounds.left + 80, bounds.top + 10);
    await mouseUp();
    clock.runAll();

    const orderEvent = await orderChanged;
    expect(orderEvent.detail).to.deep.equal({
      swap: [0, 2]
    });
  });

  it('handles prepareGhost callback', async () => {
    const list: SortableList = await createSorter(BORING_LIST);
    let ghostPrepared = false;

    list.prepareGhost = (ghost: HTMLElement) => {
      ghostPrepared = true;
      ghost.style.backgroundColor = 'red';
    };

    const bounds = list.getBoundingClientRect();

    // Start dragging to trigger ghost creation
    await moveMouse(bounds.left + 20, bounds.bottom - 10);
    await mouseDown();
    await moveMouse(bounds.left + 30, bounds.bottom - 10);

    expect(ghostPrepared).to.be.true;

    // Clean up
    await mouseUp();
    clock.runAll();
  });

  it('drags', async () => {
    const list: SortableList = await createSorter(BORING_LIST);
    const updated = oneEvent(list, 'change', false);

    const bounds = list.getBoundingClientRect();

    await moveMouse(bounds.left + 20, bounds.bottom - 10);
    await mouseDown();
    await moveMouse(bounds.left + 20, bounds.top + 5);

    // should be hovered
    await assertScreenshot('list/sortable-dragging', getClip(list));

    // now lets drop - this will fire the order changed event
    const orderChanged = oneEvent(list, CustomEventType.OrderChanged, false);
    await mouseUp();
    clock.runAll();
    await list.updateComplete;
    clock.runAll();

    // we should fire an order changed event on drop
    const orderEvent = await orderChanged;
    expect(orderEvent.detail).to.deep.equal({
      swap: [1, 0]
    });

    await assertScreenshot('list/sortable-dropped', getClip(list));

    // we should fire a change event
    const changeEvent = await updated;
    expect(changeEvent.type).to.equal('change');
  });

  it('detects external drag when dragging outside container', async () => {
    const list: SortableList = await createSorter(BORING_LIST);
    const bounds = list.getBoundingClientRect();

    // track external drag events
    let externalDragFired = false;
    let internalDragFired = false;

    list.addEventListener(CustomEventType.DragExternal, () => {
      externalDragFired = true;
    });

    list.addEventListener(CustomEventType.DragInternal, () => {
      internalDragFired = true;
    });

    // start dragging an item
    await moveMouse(bounds.left + 20, bounds.bottom - 10);
    await mouseDown();
    
    // drag outside the container (far to the right)
    await moveMouse(bounds.right + 100, bounds.top + 10);
    clock.runAll();

    // should have fired external drag event
    expect(externalDragFired).to.be.true;

    // drag back inside
    externalDragFired = false; // reset
    await moveMouse(bounds.left + 20, bounds.top + 10);
    clock.runAll();

    // should have fired internal drag event
    expect(internalDragFired).to.be.true;

    // clean up
    await mouseUp();
    clock.runAll();
  });

  it('fires DragStop with isExternal=true when dropped outside container', async () => {
    const list: SortableList = await createSorter(BORING_LIST);
    const bounds = list.getBoundingClientRect();

    // start dragging an item
    await moveMouse(bounds.left + 20, bounds.bottom - 10);
    await mouseDown();
    
    // drag outside the container
    await moveMouse(bounds.right + 100, bounds.top + 10);
    clock.runAll();

    // listen for drag stop event
    const dragStop = oneEvent(list, CustomEventType.DragStop, false);
    
    // drop outside
    await mouseUp();
    clock.runAll();

    const dragStopEvent = await dragStop;
    expect(dragStopEvent.detail.isExternal).to.be.true;
  });
});

