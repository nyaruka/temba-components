import { expect, fixture, oneEvent } from '@open-wc/testing';
import { html, TemplateResult } from 'lit';
import { CustomEventType } from '../src/interfaces';
import { SortableList } from '../src/list/SortableList';
import { assertScreenshot, getClip } from './utils.test';

const BORING_LIST = html`
  <temba-sortable-list>
    <div class="sortable" id="chicken" style="padding:10px">Chicken</div>
    <div class="sortable" id="fish" style="padding:10px">Fish</div>
  </temba-sortable-list>
`;

const createSorter = async (def: TemplateResult) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', 'width: 200px;');
  return (await fixture(def, { parentNode })) as SortableList;
};

describe('temba-sortable-list', () => {
  it('renders default', async () => {
    const list: SortableList = await createSorter(BORING_LIST);
    await assertScreenshot('list/sortable', getClip(list));
  });

  it('drags', async () => {
    const list: SortableList = await createSorter(BORING_LIST);
    const orderChanged = oneEvent(list, CustomEventType.OrderChanged);
    const updated = oneEvent(list, 'change');

    const bounds = list.getBoundingClientRect();

    await moveMouse(bounds.left + 20, bounds.bottom - 10);
    await mouseDown();
    await moveMouse(bounds.left + 30, bounds.top + 20);

    // we should fire an order changed event
    const orderEvent = await orderChanged;
    expect(orderEvent.detail).to.deep.equal({
      from: 'fish',
      to: 'chicken',
      fromIdx: 1,
      toIdx: 0,
    });

    // should be hovered
    await assertScreenshot('list/sortable-dragging', getClip(list));

    // now lets drop, it'll look the same as before dragging since
    // its the consuming elements job to do the reordering
    await mouseUp();
    await assertScreenshot('list/sortable-dropped', getClip(list));

    // we should fire a change event
    const changeEvent = await updated;
    expect(changeEvent.type).to.equal('change');
  });
});
