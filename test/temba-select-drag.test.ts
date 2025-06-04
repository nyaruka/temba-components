import { fixture, expect, assert } from '@open-wc/testing';
import { useFakeTimers } from 'sinon';
import { Select, SelectOption } from '../src/select/Select';

const createMultiSelect = async (clock, values: SelectOption[]) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', 'width: 300px;');

  const optionsHTML = values.map(value => 
    `<temba-option name="${value.name}" value="${value.value}"${value.selected ? ' selected' : ''}></temba-option>`
  ).join('');

  const select: Select<SelectOption> = await fixture(
    `<temba-select multi>${optionsHTML}</temba-select>`,
    { parentNode }
  );
  
  clock.runAll();
  await select.updateComplete;
  return select;
};

describe('temba-select drag and drop', () => {
  let clock;

  beforeEach(() => {
    clock = useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });
  it('shows sortable list for 3+ selected items', async () => {
    const select = await createMultiSelect(clock, [
      { name: 'Red', value: '0', selected: true },
      { name: 'Green', value: '1', selected: true },
      { name: 'Blue', value: '2', selected: true }
    ]);

    console.log('select.values:', select.values);
    expect(select.values).to.not.be.undefined;
    expect(select.values.length).to.equal(3);
    
    // Should have a sortable list
    const sortableList = select.shadowRoot.querySelector('temba-sortable-list');
    expect(sortableList).to.not.be.null;
    
    // Should have sortable items
    const sortableItems = select.shadowRoot.querySelectorAll('.sortable');
    expect(sortableItems.length).to.equal(3);
  });

  it('does not show sortable list for 2 selected items', async () => {
    const select = await createMultiSelect(clock, [
      { name: 'Red', value: '0', selected: true },
      { name: 'Green', value: '1', selected: true }
    ]);

    expect(select.values).to.not.be.undefined;
    expect(select.values.length).to.equal(2);
    
    // Should not have a sortable list
    const sortableList = select.shadowRoot.querySelector('temba-sortable-list');
    expect(sortableList).to.be.null;
  });

  it('does not show sortable list for 1 selected item', async () => {
    const select = await createMultiSelect(clock, [
      { name: 'Red', value: '0', selected: true }
    ]);

    expect(select.values).to.not.be.undefined;
    expect(select.values.length).to.equal(1);
    
    // Should not have a sortable list
    const sortableList = select.shadowRoot.querySelector('temba-sortable-list');
    expect(sortableList).to.be.null;
  });

  it('can reorder values', async () => {
    const select = await createMultiSelect(clock, [
      { name: 'Red', value: '0', selected: true },
      { name: 'Green', value: '1', selected: true },
      { name: 'Blue', value: '2', selected: true }
    ]);

    expect(select.values).to.not.be.undefined;
    expect(select.values.length).to.equal(3);

    // Initial order
    expect(select.values[0].name).to.equal('Red');
    expect(select.values[1].name).to.equal('Green');
    expect(select.values[2].name).to.equal('Blue');

    // Simulate drag and drop event manually
    const orderChangedEvent = new CustomEvent('temba-order-changed', {
      detail: {
        fromIdx: 0,
        toIdx: 1
      }
    });

    const sortableList = select.shadowRoot.querySelector('temba-sortable-list');
    sortableList.dispatchEvent(orderChangedEvent);

    await select.updateComplete;

    // Order should be swapped
    expect(select.values[0].name).to.equal('Green');
    expect(select.values[1].name).to.equal('Red');
    expect(select.values[2].name).to.equal('Blue');
  });
});