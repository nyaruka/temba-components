import * as sinon from 'sinon';
import { fixture, expect, assert } from '@open-wc/testing';
import { useFakeTimers } from 'sinon';
import { Options } from '../src/options/Options';
import { Select, SelectOption } from '../src/select/Select';
import {
  assertScreenshot,
  checkTimers,
  getClip,
  loadStore,
  mouseClickElement
} from './utils.test';
import { CustomEventType } from '../src/interfaces';

const colors = [
  { name: 'Red', value: '0' },
  { name: 'Green', value: '1' },
  { name: 'Blue', value: '2' }
];

export const createSelect = async (clock, def: string) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', 'width: 250px;');

  const select: Select<SelectOption> = await fixture(def, { parentNode });
  clock.runAll();
  await select.updateComplete;
  return select;
};

export const open = async (clock, select: Select<SelectOption>) => {
  if (!select.endpoint) {
    await mouseClickElement(select);
    await clock.runAll();
    await clock.runAll();
    return select;
  }

  const promise = new Promise<Select<SelectOption>>((resolve) => {
    select.addEventListener(
      CustomEventType.FetchComplete,
      async () => {
        await clock.runAll();
        resolve(select);
      },
      { once: true }
    );
  });

  await mouseClickElement(select);
  await clock.runAll();

  return promise;
};

export const clear = (select: Select<SelectOption>) => {
  (select.shadowRoot.querySelector('.clear-button') as HTMLDivElement).click();
};

export const getOptions = (select: Select<SelectOption>): Options => {
  return select.shadowRoot.querySelector('temba-options[visible]');
};

export const clickOption = async (
  clock: any,
  select: Select<SelectOption>,
  index: number
) => {
  const options = getOptions(select);
  const option = options.shadowRoot.querySelector(
    `[data-option-index="${index}"]`
  ) as HTMLDivElement;

  await mouseClickElement(option);
  await options.updateComplete;
  await select.updateComplete;
  await clock.runAll();

  checkTimers(clock);
};

export const openAndClick = async (
  clock: any,
  select: Select<SelectOption>,
  index: number
) => {
  await open(clock, select);
  await clickOption(clock, select, index);
};

export const getSelectHTML = (
  options: SelectOption[] = colors,
  attrs: any = { placeholder: 'Select a color', name: 'color' },
  selected: any = null
): string => {
  const selectHTML = `
  <temba-select${Object.keys(attrs)
    .map((name: string) => {
      // check if it's a string attribute
      if (typeof attrs[name] === 'string') {
        return ` ${name}="${attrs[name].replace(/"/g, '&quot;')}"`;
      }

      if (typeof attrs[name] === 'boolean') {
        return ` ${name}`;
      }

      return ` ${name}="${attrs[name]}"`;
    })
    .join(' ')}>
    ${options
      .map(
        (option) =>
          `<temba-option name="${option.name}" value="${option.value}"${
            option.selected || option.value === selected ? ' selected' : ''
          }></temba-option>`
      )
      .join('')}
  </temba-select>`;
  return selectHTML;
};

const getClipWithOptions = (select: Select<any>) => {
  const selectClip = getClip(select);
  const options = select.shadowRoot.querySelector(
    'temba-options[visible]'
  ) as Options;

  if (options) {
    const optionsClip = getClip(options);
    const y = Math.min(selectClip.y, optionsClip.y);
    const x = Math.min(selectClip.x, optionsClip.x);
    const combinedClip = {
      y,
      x,
      width: Math.max(selectClip.right, optionsClip.right) - x,
      height: Math.max(selectClip.bottom, optionsClip.bottom) - y
    };
    return combinedClip;
  }

  return selectClip;
};

describe('temba-select', () => {
  let clock: any;
  beforeEach(function () {
    clock = useFakeTimers();
    clock.tick(400);
    setViewport({ width: 500, height: 1000, deviceScaleFactor: 2 });
  });

  afterEach(function () {
    clock.restore();
  });

  it('can be created', async () => {
    const select = await createSelect(clock, '<temba-select></temba-select>');
    assert.instanceOf(select, Select);
  });

  it('can be disabled', async () => {
    const select = await createSelect(
      clock,
      getSelectHTML(colors, { disabled: true })
    );

    expect(select.disabled).to.equal(true);
    await assertScreenshot('select/disabled', getClip(select));
  });

  it('can be disabled with selection', async () => {
    const select = await createSelect(
      clock,
      getSelectHTML(colors, { disabled: true, value: '0' })
    );

    expect(select.disabled).to.equal(true);
    await assertScreenshot('select/disabled-selection', getClip(select));
  });

  it('can be disabled with multi selection', async () => {
    const select = await createSelect(
      clock,
      getSelectHTML(colors, { placeholder: 'Select a color', multi: true })
    );

    await openAndClick(clock, select, 0);
    select.disabled = true;
    expect(select.disabled).to.equal(true);

    // make sure we can't select anymore
    await open(clock, select);
    expect(select.isOpen()).to.equal(false);
    await assertScreenshot('select/disabled-multi-selection', getClip(select));
  });

  it('can be created with temba-option tags', async () => {
    const select = await createSelect(clock, getSelectHTML());
    assert.equal(select.getStaticOptions().length, 3);
    expect(select.values.length).to.equal(0);
    await assertScreenshot('select/with-placeholder', getClip(select));
  });

  it('picks the first option without a placeholder', async () => {
    const select = await createSelect(clock, getSelectHTML(colors, {}));
    assert.equal(select.getStaticOptions().length, 3);
    expect(select.values[0].name).to.equal('Red');
    await assertScreenshot('select/without-placeholder', getClip(select));
  });

  it('shows options when opened', async () => {
    const select = await createSelect(clock, getSelectHTML());
    await open(clock, select);
    const options = getOptions(select);
    assert.instanceOf(options, Options);

    // our options should be visible
    assert.isTrue(
      options.shadowRoot
        .querySelector('.options-container')
        .classList.contains('show')
    );

    await assertScreenshot('select/local-options', getClipWithOptions(select));
  });

  it('can be created with attribute options', async () => {
    const options = JSON.stringify([{ name: 'Embedded Option', value: '0' }]);
    const select = await createSelect(clock, getSelectHTML([], { options }));
    // select the first option
    await openAndClick(clock, select, 0);
    expect(select.values[0].name).to.equal('Embedded Option');
    await assertScreenshot('select/embedded', getClipWithOptions(select));
  });

  describe('single selection', () => {
    it('can select a single option', async () => {
      const select = await createSelect(clock, getSelectHTML());

      // nothing is selected to start
      expect(select.values.length).to.equal(0);
      expect(select.value).to.equal(null);

      // select the first option
      const changeEvent = sinon.spy();
      select.addEventListener('change', changeEvent);
      await openAndClick(clock, select, 0);

      assert(changeEvent.called, 'change event not fired');
      expect(select.values.length).to.equal(1);
      expect(select.values[0].name).to.equal('Red');
      expect(select.shadowRoot.innerHTML).to.contain('Red');

      await assertScreenshot(
        'select/selected-single',
        getClipWithOptions(select)
      );
    });

    it('can search with existing selection', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML(colors, { searchable: true })
      );

      // select the second option
      await openAndClick(clock, select, 1);
      expect(select.values.length).to.equal(1);
      expect(select.values[0].name).to.equal('Green');

      // for single selection our current selection should be in the list and focused
      await open(clock, select);
      assert.equal(select.cursorIndex, 1);
      assert.equal(select.visibleOptions.length, 3);

      // now lets do a search, we should see our selection (green) and one other (red)
      await typeInto('temba-select', 're', false);
      await open(clock, select);
      assert.equal(select.visibleOptions.length, 2);

      await assertScreenshot(
        'select/search-with-selected',
        getClipWithOptions(select)
      );

      // but our cursor should be on the first match
      assert.equal(select.cursorIndex, 0);
    });
  });

  describe('multiple selection', () => {
    it('can select multiple options', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML(colors, { placeholder: 'Select a color', multi: true })
      );
      expect(select.values.length).to.equal(0);

      const changeEvent = sinon.spy();
      select.addEventListener('change', changeEvent);

      // select the first option twice
      await openAndClick(clock, select, 0);
      assert(changeEvent.called, 'change event not fired');

      changeEvent.resetHistory();
      await openAndClick(clock, select, 0);
      assert(changeEvent.called, 'change event not fired');

      // now we should have red and green selected
      expect(select.values.length).to.equal(2);
      expect(select.shadowRoot.innerHTML).to.contain('Red');
      expect(select.shadowRoot.innerHTML).to.contain('Green');

      await assertScreenshot(
        'select/selected-multi',
        getClipWithOptions(select)
      );
    });

    it('can select multiple options until maxitems', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML(colors, { placeholder: 'Select a color', multi: true, maxItems: 2 })
      );
      expect(select.values.length).to.equal(0);

      const changeEvent = sinon.spy();
      select.addEventListener('change', changeEvent);

      // select the first option 3 times, only 2 (maxitems) options are handled and added
      await openAndClick(clock, select, 0);
      assert(changeEvent.called, 'change event not fired');

      changeEvent.resetHistory();
      await openAndClick(clock, select, 0);
      assert(changeEvent.called, 'change event not fired');

      changeEvent.resetHistory();
      await openAndClick(clock, select, 0);
      assert(!changeEvent.called, 'change event should not be fired');

      // but we should have red and green selected only, no blue
      expect(select.values.length).to.equal(2);
      expect(select.shadowRoot.innerHTML).to.contain('Red');
      expect(select.shadowRoot.innerHTML).to.contain('Green');

      await assertScreenshot(
        'select/selected-multi-maxitems-reached',
        getClipWithOptions(select)
      );
    });

    it('shows multiple values on initialization', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML(
          [
            { name: 'Red', value: '0' },
            { name: 'Green', value: '1', selected: true },
            { name: 'Blue', value: '2', selected: true }
          ],
          {
            placeholder: 'Select a color',
            multi: true
          }
        )
      );
      await assertScreenshot('select/multiple-initial-values', getClip(select));
      expect(select.values.length).to.equal(2);
    });
  });

  describe('static options', () => {
    it('accepts an initial value', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML(colors, { value: '1' })
      );
      expect(select.values[0].name).to.equal('Green');
      await assertScreenshot('select/static-initial-value', getClip(select));
    });

    it('honors temba-option selected attribute', async () => {
      const select = await createSelect(clock, getSelectHTML(colors, {}, '1'));
      expect(select.values[0].name).to.equal('Green');
      await assertScreenshot(
        'select/static-initial-via-selected',
        getClip(select)
      );
    });
  });

  describe('endpoints', () => {
    it('can load from an endpoint', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML([], {
          placeholder: 'Select a color',
          endpoint: '/test-assets/select/colors.json'
        })
      );

      await open(clock, select);
      await assertScreenshot(
        'select/remote-options',
        getClipWithOptions(select)
      );
      assert.equal(select.visibleOptions.length, 3);
    });

    it('can search an endpoint', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML([], {
          placeholder: 'Select a color',
          endpoint: '/test-assets/select/colors.json',
          searchable: true
        })
      );

      await typeInto('temba-select', 're', false);
      await open(clock, select);
      assert.equal(select.visibleOptions.length, 2);

      await assertScreenshot('select/searching', getClipWithOptions(select));
    });

    it('can use an endpoint and allow multiple', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML([], {
          placeholder: 'Select a color',
          endpoint: '/test-assets/select/colors.json',
          searchable: true,
          multi: true
        })
      );

      await assertScreenshot(
        'select/multi-with-endpoint',
        getClipWithOptions(select)
      );

      // await typeInto('temba-select', 're', false);
      // await open(select);
      // assert.equal(select.visibleOptions.length, 2);
    });

    it('pages through cursor results', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML([], {
          placeholder: 'Select a group',
          endpoint: '/test-assets/select/groups.json',
          valueKey: 'uuid'
        })
      );

      await open(clock, select);

      // should have all three pages visible right away
      assert.equal(select.visibleOptions.length, 15);
    });

    it('shows cached results', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML([], {
          placeholder: 'Select a group',
          endpoint: '/test-assets/select/groups.json',
          valueKey: 'uuid',
          searchable: true
        })
      );

      // wait for updates from fetching three pages
      await open(clock, select);
      assert.equal(select.visibleOptions.length, 15);

      // close and reopen
      select.blur();
      await clock.tick(250);

      await open(clock, select);
      assert.equal(select.visibleOptions.length, 15);

      // close and reopen once more (previous bug failed on third opening)
      // select.blur();
      // await open(select);
      // assert.equal(select.visibleOptions.length, 15);
    });

    it('can enter expressions', async () => {
      await loadStore();
      const select = await createSelect(
        clock,
        getSelectHTML([], {
          endpoint: '/colors.json',
          searchable: true,
          expressions: 'session'
        })
      );

      await typeInto('temba-select', 'Hi there @contact', false);
      await open(clock, select);

      assert.equal(select.completionOptions.length, 14);
      await assertScreenshot('select/expressions', getClipWithOptions(select));
    });

    it('clears single selection', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML(colors, { clearable: true })
      );
      assert.equal(select.getStaticOptions().length, 3);

      await openAndClick(clock, select, 0);
      expect(select.values[0].name).to.equal('Red');

      await assertScreenshot('select/selection-clearable', getClip(select));

      clear(select);
      expect(select.values.length).to.equal(0);
    });

    it('should look the same with search enabled', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML(colors, {
          placeholder: 'Select a color',
          searchable: true
        })
      );
      await assertScreenshot(
        'select/search-enabled',
        getClipWithOptions(select)
      );
    });

    it('should look the same with search enabled and selection made', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML(colors, { searchable: true })
      );

      // select the first option
      await openAndClick(clock, select, 1);
      await assertScreenshot(
        'select/search-selected',
        getClipWithOptions(select)
      );
    });

    it('should show focus for the selected option', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML(colors, { searchable: true })
      );

      // select the first option
      await openAndClick(clock, select, 1);

      // now open and look at focus
      await open(clock, select);
      await assertScreenshot(
        'select/search-selected-focus',
        getClipWithOptions(select)
      );
    });

    it('should show search with existing multiple selection', async () => {
      const select = await createSelect(
        clock,
        getSelectHTML(colors, {
          placeholder: 'Select a color',
          searchable: true,
          multi: true
        })
      );

      // select the first option
      await openAndClick(clock, select, 0);
      await openAndClick(clock, select, 0);
      await open(clock, select);

      // now lets do a search, we should see our selection (green) and one other (red)
      await typeInto('temba-select', 're', false);
      await open(clock, select);

      // should have two things selected and active query and no matching options
      await assertScreenshot(
        'select/search-multi-no-matches',
        getClipWithOptions(select)
      );
    });

    it('should show functions', async () => {
      await loadStore();

      const select = await createSelect(
        clock,
        getSelectHTML(colors, {
          placeholder: 'Select a color',
          searchable: true,
          expressions: 'session'
        })
      );

      await typeInto('temba-select', 'look at @(max(m', false);
      await open(clock, select);

      await assertScreenshot('select/functions', getClipWithOptions(select));
    });

    it('should truncate selection if necessesary', async () => {
      const options = [
        {
          name: 'this_is_a_long_selection_to_make_sure_it_truncates',
          value: '0'
        }
      ];

      const select = await createSelect(
        clock,
        getSelectHTML(options, {
          value: '0'
        })
      );

      await assertScreenshot(
        'select/truncated-selection',
        getClipWithOptions(select)
      );
    });

    it('can select expression completion as value', async () => {
      await loadStore();

      const select = await createSelect(
        clock,
        getSelectHTML(colors, {
          multi: true,
          placeholder: 'Select a color',
          searchable: true,
          expressions: 'session'
        })
      );

      await typeInto('temba-select', '@con', false);
      await openAndClick(clock, select, 0);

      expect(select.values[0].name).to.equal('@contact');
      await assertScreenshot(
        'select/expression-selected',
        getClipWithOptions(select)
      );
    });
  });
});
