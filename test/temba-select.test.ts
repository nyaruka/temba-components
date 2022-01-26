import { fixture, expect, assert } from '@open-wc/testing';
import { useFakeTimers } from 'sinon';
import { Options } from '../src/options/Options';
import { Select } from '../src/select/Select';
import { assertScreenshot, checkTimers, getClip } from './utils.test';
import { range } from '../src/utils';
import { Store } from '../src/store/Store';

let clock: any;

const colors = [
  { name: 'Red', value: '0' },
  { name: 'Green', value: '1' },
  { name: 'Blue', value: '2' },
];

export const createSelect = async (def: string, delay = 0) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', 'width: 250px;');

  const select: Select = await fixture(def, { parentNode });
  clock.tick(1);
  await select.updateComplete;
  await waitFor(delay);
  return select;
};

export const open = async (select: Select) => {
  await click('temba-select');
  await select.updateComplete;

  // Lots of various things introduce ticks here
  //  * quiet period for searchable
  //  * throttle for cursor movement (init)
  //  * throttle for scroll event if needed
  // As such, we aggressively wait for http activity
  // and advance possible ticks before and after to
  // reliably wait until the select is truly open

  await clock.tick(150);
  await select.httpComplete;
  await clock.tick(150);

  await waitFor(0);
  await clock.tick(150);

  checkTimers(clock);
  return select;
};

export const clear = (select: Select) => {
  (select.shadowRoot.querySelector('.clear-button') as HTMLDivElement).click();
};

export const getOptions = (select: Select): Options => {
  return select.shadowRoot.querySelector('temba-options[visible]');
};

export const clickOption = async (select: Select, index: number) => {
  const options = getOptions(select);
  const option = options.shadowRoot.querySelector(
    `[data-option-index="${index}"]`
  ) as HTMLDivElement;
  option.click();
  await clock.tick(250);
  await options.updateComplete;
  await select.updateComplete;
  //checkTimers(clock);
};

export const openAndClick = async (select: Select, index: number) => {
  await open(select);
  await clickOption(select, index);
};

export const getSelectHTML = (
  options: any[] = colors,
  attrs: any = { placeholder: 'Select a color', name: 'color' }
): string => {
  const selectHTML = `
  <temba-select ${Object.keys(attrs)
    .map((name: string) => `${name}='${attrs[name]}'`)
    .join(' ')}>
    ${options
      .map(
        option =>
          `<temba-option name="${option.name}" value="${option.value}"></temba-option>`
      )
      .join('')}
  </temba-select>`;
  return selectHTML;
};

export const forPages = async (select: Select, pages = 1) => {
  for (const _ in range(0, pages * 3 + 1)) {
    await select.httpComplete;
    await select.updateComplete;
    await waitFor(0);
  }
};

const getClipWithOptions = (select: Select) => {
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
      height: Math.max(selectClip.bottom, optionsClip.bottom) - y,
    };
    return combinedClip;
  }

  return selectClip;
};

const loadStore = async () => {
  const store: Store = await fixture(
    "<temba-store completion='/test-assets/store/editor.json'></temba-store>"
  );
  await store.httpComplete;
  return store;
};

describe('temba-select', () => {
  beforeEach(function () {
    clock = useFakeTimers();
    setViewport({ width: 500, height: 1000, deviceScaleFactor: 2 });
  });

  afterEach(function () {
    clock.restore();
  });

  it('can be created', async () => {
    const select = await createSelect('<temba-select></temba-select>');
    assert.instanceOf(select, Select);
  });

  it('can be disabled', async () => {
    const select = await createSelect(
      getSelectHTML(colors, { disabled: true })
    );

    expect(select.disabled).to.equal(true);
    await assertScreenshot('select/disabled', getClip(select));
  });

  it('can be disabled with selection', async () => {
    const select = await createSelect(
      getSelectHTML(colors, { disabled: true, value: '0' })
    );

    expect(select.disabled).to.equal(true);
    await assertScreenshot('select/disabled-selection', getClip(select));
  });

  it('can be disabled with multi selection', async () => {
    const select = await createSelect(
      getSelectHTML(colors, { placeholder: 'Select a color', multi: true })
    );

    await openAndClick(select, 0);
    select.disabled = true;
    expect(select.disabled).to.equal(true);

    // make sure we can't select anymore
    await open(select);
    expect(select.isOpen()).to.equal(false);
    await assertScreenshot('select/disabled-multi-selection', getClip(select));
  });

  it('can be created with temba-option tags', async () => {
    const select = await createSelect(getSelectHTML());
    assert.equal(select.getStaticOptions().length, 3);
    expect(select.values.length).to.equal(0);
    await assertScreenshot('select/with-placeholder', getClip(select));
  });

  it('picks the first option without a placeholder', async () => {
    const select = await createSelect(getSelectHTML(colors, {}));
    assert.equal(select.getStaticOptions().length, 3);
    expect(select.values[0].name).to.equal('Red');
    await assertScreenshot('select/without-placeholder', getClip(select));
  });

  it('shows options when opened', async () => {
    const select = await createSelect(getSelectHTML());
    await open(select);
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
    const select = await createSelect(getSelectHTML([], { options }));
    // select the first option
    await openAndClick(select, 0);
    expect(select.values[0].name).to.equal('Embedded Option');
    await assertScreenshot('select/embedded', getClipWithOptions(select));
  });

  describe('single selection', () => {
    it('can select a single option', async () => {
      const select = await createSelect(getSelectHTML());
      expect(select.values.length).to.equal(0);

      // select the first option
      await openAndClick(select, 0);

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
        getSelectHTML(colors, { searchable: true })
      );

      // select the second option
      await openAndClick(select, 1);
      expect(select.values.length).to.equal(1);
      expect(select.values[0].name).to.equal('Green');

      // for single selection our current selection should be in the list and focused
      await open(select);
      assert.equal(select.cursorIndex, 1);
      assert.equal(select.visibleOptions.length, 3);

      // now lets do a search, we should see our selection (green) and one other (red)
      await typeInto('temba-select', 're', false);
      await open(select);
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
        getSelectHTML(colors, { placeholder: 'Select a color', multi: true })
      );
      expect(select.values.length).to.equal(0);

      // select the first option twice
      await openAndClick(select, 0);
      await openAndClick(select, 0);

      // now we should have red and green selected
      expect(select.values.length).to.equal(2);
      expect(select.shadowRoot.innerHTML).to.contain('Red');
      expect(select.shadowRoot.innerHTML).to.contain('Green');

      await assertScreenshot(
        'select/selected-multi',
        getClipWithOptions(select)
      );
    });
  });

  describe('endpoints', () => {
    it('can load from an endpoint', async () => {
      const select = await createSelect(
        getSelectHTML([], {
          placeholder: 'Select a color',
          endpoint: '/test-assets/select/colors.json',
        })
      );

      await open(select);
      await assertScreenshot(
        'select/remote-options',
        getClipWithOptions(select)
      );
      assert.equal(select.visibleOptions.length, 3);
    });

    it('can search an endpoint', async () => {
      const select = await createSelect(
        getSelectHTML([], {
          placeholder: 'Select a color',
          endpoint: '/test-assets/select/colors.json',
          searchable: true,
        })
      );

      await typeInto('temba-select', 're', false);
      await open(select);
      await forPages(select, 2);
      assert.equal(select.visibleOptions.length, 2);

      await assertScreenshot('select/searching', getClipWithOptions(select));
    });

    it('pages through cursor results', async () => {
      const select = await createSelect(
        getSelectHTML([], {
          placeholder: 'Select a group',
          endpoint: '/test-assets/select/groups.json',
          valueKey: 'uuid',
        })
      );

      await open(select);
      await forPages(select, 3);

      // should have all three pages visible right away
      assert.equal(select.visibleOptions.length, 15);
    });

    it('shows cached results', async () => {
      const select = await createSelect(
        getSelectHTML([], {
          placeholder: 'Select a group',
          endpoint: '/test-assets/select/groups.json',
          valueKey: 'uuid',
          searchable: true,
        })
      );

      // wait for updates from fetching three pages
      await open(select);
      await forPages(select, 4);

      // quiet for searchable
      await waitFor(200);

      assert.equal(select.visibleOptions.length, 15);

      // close and reopen
      select.blur();
      await clock.tick(250);

      await open(select);
      assert.equal(select.visibleOptions.length, 15);

      // close and reopen once more (previous bug failed on third opening)
      select.blur();
      await open(select);
      assert.equal(select.visibleOptions.length, 15);
    });

    it('can enter expressions', async () => {
      await loadStore();
      const select = await createSelect(
        getSelectHTML([], {
          endpoint: '/colors.json',
          searchable: true,
          expressions: 'session',
        })
      );

      await typeInto('temba-select', 'Hi there @contact', false);
      await open(select);

      await forPages(select, 1);
      await clock.tick(400);
      await select.httpComplete;

      assert.equal(select.completionOptions.length, 14);
      await assertScreenshot('select/expressions', getClipWithOptions(select));
    });

    it('clears single selection', async () => {
      const select = await createSelect(
        getSelectHTML(colors, { clearable: true })
      );
      assert.equal(select.getStaticOptions().length, 3);

      await openAndClick(select, 0);
      expect(select.values[0].name).to.equal('Red');

      await assertScreenshot('select/selection-clearable', getClip(select));

      clear(select);
      expect(select.values.length).to.equal(0);
    });

    /**  */

    it('should look the same with search enabled', async () => {
      const select = await createSelect(
        getSelectHTML(colors, {
          placeholder: 'Select a color',
          searchable: true,
        })
      );
      await assertScreenshot(
        'select/search-enabled',
        getClipWithOptions(select)
      );
    });

    it('should look the same with search enabled and selection made', async () => {
      const select = await createSelect(
        getSelectHTML(colors, { searchable: true })
      );

      // select the first option
      await openAndClick(select, 1);
      await assertScreenshot(
        'select/search-selected',
        getClipWithOptions(select)
      );
    });

    it('should show focus for the selected option', async () => {
      const select = await createSelect(
        getSelectHTML(colors, { searchable: true })
      );

      // select the first option
      await openAndClick(select, 1);

      // now open and look at focus
      await open(select);
      await assertScreenshot(
        'select/search-selected-focus',
        getClipWithOptions(select)
      );
    });

    it('should show search with existing multiple selection', async () => {
      const select = await createSelect(
        getSelectHTML(colors, {
          placeholder: 'Select a color',
          searchable: true,
          multi: true,
        })
      );

      // select the first option
      await openAndClick(select, 0);
      await openAndClick(select, 0);
      await open(select);

      // now lets do a search, we should see our selection (green) and one other (red)
      await typeInto('temba-select', 're', false);
      await open(select);

      // should have two things selected and active query and no matching options
      await assertScreenshot(
        'select/search-multi-no-matches',
        getClipWithOptions(select)
      );
    });

    it('should show functions', async () => {
      await loadStore();

      const select = await createSelect(
        getSelectHTML(colors, {
          placeholder: 'Select a color',
          searchable: true,
          expressions: 'session',
        })
      );

      await typeInto('temba-select', 'look at @(max(m', false);
      await open(select);

      await assertScreenshot('select/functions', getClipWithOptions(select));
    });

    it('can select expression completion as value', async () => {
      await loadStore();

      const select = await createSelect(
        getSelectHTML(colors, {
          multi: true,
          placeholder: 'Select a color',
          searchable: true,
          expressions: 'session',
        })
      );

      await typeInto('temba-select', '@con', false);
      await openAndClick(select, 0);

      expect(select.values[0].name).to.equal('@contact');
      await assertScreenshot(
        'select/expression-selected',
        getClipWithOptions(select)
      );
    });
  });
});
