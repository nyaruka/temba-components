import { fixture, expect, assert } from '@open-wc/testing';
import DateRangePicker from '../src/daterangepicker/DateRangePicker';
import { assertScreenshot, getAttributes, getClip } from './utils.test';

export const getDropdownState = (picker: DateRangePicker): boolean => {
  const dropdown = picker.shadowRoot?.querySelector('temba-dropdown') as any;
  return dropdown ? dropdown.open : false;
};

export const getRangePickerHTML = (attrs: any = {}) => {
  return `<temba-daterangepicker ${getAttributes(
    attrs
  )}></temba-daterangepicker>`;
};

export const createRangePicker = async (def: string) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', 'width: 400px;');
  parentNode.id = 'parent';
  const picker: DateRangePicker = await fixture(def, { parentNode });
  return picker;
};

describe('temba-daterangepicker', () => {
  it('can create a date range picker', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML()
    );
    assert.instanceOf(picker, DateRangePicker);
    expect(picker.startDate).to.equal('');
    expect(picker.endDate).to.equal('');
    await assertScreenshot('daterangepicker/empty', getClip(picker));
  });

  it('can be initialized with start and end dates', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML({
        'start-date': '2024-01-01',
        'end-date': '2024-01-15'
      })
    );

    expect(picker.startDate).to.equal('2024-01-01');
    expect(picker.endDate).to.equal('2024-01-15');
    expect(picker.value).to.deep.equal({
      startDate: '2024-01-01',
      endDate: '2024-01-15'
    });
    await assertScreenshot('daterangepicker/with-range', getClip(picker));
  });

  it('can be initialized with only a start date', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML({ 'start-date': '2024-01-01' })
    );

    expect(picker.startDate).to.equal('2024-01-01');
    expect(picker.endDate).to.equal('');
    await assertScreenshot('daterangepicker/start-only', getClip(picker));
  });

  it('can be initialized with only an end date', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML({ 'end-date': '2024-01-15' })
    );

    expect(picker.startDate).to.equal('');
    expect(picker.endDate).to.equal('2024-01-15');
    await assertScreenshot('daterangepicker/end-only', getClip(picker));
  });

  it('displays placeholder text when no dates are selected', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML()
    );

    const rangeDisplay = picker.shadowRoot?.querySelector('.range-text');
    expect(rangeDisplay?.textContent?.trim()).to.equal('Select date range');
  });

  it('formats dates correctly in the display', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML({
        'start-date': '2024-01-01',
        'end-date': '2024-12-31'
      })
    );

    const rangeDisplay = picker.shadowRoot?.querySelector('.range-text');
    expect(rangeDisplay?.textContent?.trim()).to.contain('Jan 01, 2024');
    expect(rangeDisplay?.textContent?.trim()).to.contain('Dec 31, 2024');
  });

  it('opens dropdown when display is clicked', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML()
    );

    expect(getDropdownState(picker)).to.be.false;

    const rangeDisplay = picker.shadowRoot?.querySelector(
      '.range-display'
    ) as HTMLElement;
    rangeDisplay.click();
    await picker.updateComplete;

    expect(getDropdownState(picker)).to.be.true;
    await assertScreenshot('daterangepicker/dropdown-open', getClip(picker));
  });

  it('validates that end date is after start date', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML()
    );

    // Open the dropdown
    const rangeDisplay = picker.shadowRoot?.querySelector(
      '.range-display'
    ) as HTMLElement;
    rangeDisplay.click();
    await picker.updateComplete;

    // Set end date before start date
    const startInput = picker.shadowRoot?.querySelector(
      '.date-inputs input[type="date"]'
    ) as HTMLInputElement;
    const endInput = picker.shadowRoot?.querySelectorAll(
      '.date-inputs input[type="date"]'
    )[1] as HTMLInputElement;

    startInput.value = '2024-01-15';
    startInput.dispatchEvent(new Event('change'));
    await picker.updateComplete;

    endInput.value = '2024-01-01';
    endInput.dispatchEvent(new Event('change'));
    await picker.updateComplete;

    // Try to apply the invalid range
    const applyButton = picker.shadowRoot?.querySelector(
      '.actions button.primary'
    ) as HTMLElement;
    applyButton.click();
    await picker.updateComplete;

    // Should show error and not close dropdown
    expect(getDropdownState(picker)).to.be.true;
    const errorMessage = picker.shadowRoot?.querySelector('.error');
    expect(errorMessage).to.not.be.null;
    expect(errorMessage?.textContent).to.contain(
      'End date must be after start date'
    );
  });

  it('applies valid date range and closes dropdown', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML()
    );

    // Open the dropdown
    const rangeDisplay = picker.shadowRoot?.querySelector(
      '.range-display'
    ) as HTMLElement;
    rangeDisplay.click();
    await picker.updateComplete;

    // Set valid date range
    const startInput = picker.shadowRoot?.querySelector(
      '.date-inputs input[type="date"]'
    ) as HTMLInputElement;
    const endInput = picker.shadowRoot?.querySelectorAll(
      '.date-inputs input[type="date"]'
    )[1] as HTMLInputElement;

    startInput.value = '2024-01-01';
    startInput.dispatchEvent(new Event('change'));
    await picker.updateComplete;

    endInput.value = '2024-01-15';
    endInput.dispatchEvent(new Event('change'));
    await picker.updateComplete;

    // Apply the range
    const applyButton = picker.shadowRoot?.querySelector(
      '.actions button.primary'
    ) as HTMLElement;
    applyButton.click();
    await picker.updateComplete;

    // Should update properties and close dropdown
    expect(getDropdownState(picker)).to.be.false;
    expect(picker.startDate).to.equal('2024-01-01');
    expect(picker.endDate).to.equal('2024-01-15');
  });

  it('cancels changes and closes dropdown', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML({
        'start-date': '2024-01-01',
        'end-date': '2024-01-15'
      })
    );

    // Open the dropdown
    const rangeDisplay = picker.shadowRoot?.querySelector(
      '.range-display'
    ) as HTMLElement;
    rangeDisplay.click();

    // Change dates
    const startInput = picker.shadowRoot?.querySelector(
      '.date-inputs input[type="date"]'
    ) as HTMLInputElement;
    startInput.value = '2024-02-01';
    startInput.dispatchEvent(new Event('change'));

    // Cancel changes
    const cancelButton = picker.shadowRoot?.querySelector(
      '.actions button:not(.primary)'
    ) as HTMLElement;
    cancelButton.click();

    // Should revert to original values and close dropdown
    expect(getDropdownState(picker)).to.be.false;
    expect(picker.startDate).to.equal('2024-01-01');
    expect(picker.endDate).to.equal('2024-01-15');
  });

  it('shows range preview when both dates are selected', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML()
    );

    // Open the dropdown
    const rangeDisplay = picker.shadowRoot?.querySelector(
      '.range-display'
    ) as HTMLElement;
    rangeDisplay.click();
    await picker.updateComplete;

    // Set both dates
    const startInput = picker.shadowRoot?.querySelector(
      '.date-inputs input[type="date"]'
    ) as HTMLInputElement;
    const endInput = picker.shadowRoot?.querySelectorAll(
      '.date-inputs input[type="date"]'
    )[1] as HTMLInputElement;

    startInput.value = '2024-01-01';
    startInput.dispatchEvent(new Event('change'));
    await picker.updateComplete;

    endInput.value = '2024-01-15';
    endInput.dispatchEvent(new Event('change'));
    await picker.updateComplete;

    // Check that preview is shown
    const preview = picker.shadowRoot?.querySelector('.range-preview');
    expect(preview).to.not.be.null;
    expect(preview?.textContent).to.contain('Preview:');
    expect(preview?.textContent).to.contain('Jan 01, 2024');
    expect(preview?.textContent).to.contain('Jan 15, 2024');
  });

  it('fires change event when range is applied', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML()
    );

    let changeEventFired = false;
    picker.addEventListener('change', () => {
      changeEventFired = true;
    });

    // Open dropdown and set range
    const rangeDisplay = picker.shadowRoot?.querySelector(
      '.range-display'
    ) as HTMLElement;
    rangeDisplay.click();

    const startInput = picker.shadowRoot?.querySelector(
      '.date-inputs input[type="date"]'
    ) as HTMLInputElement;
    const endInput = picker.shadowRoot?.querySelectorAll(
      '.date-inputs input[type="date"]'
    )[1] as HTMLInputElement;

    startInput.value = '2024-01-01';
    startInput.dispatchEvent(new Event('change'));

    endInput.value = '2024-01-15';
    endInput.dispatchEvent(new Event('change'));

    // Apply the range
    const applyButton = picker.shadowRoot?.querySelector(
      '.actions button.primary'
    ) as HTMLElement;
    applyButton.click();

    expect(changeEventFired).to.be.true;
  });

  it('serializes value as JSON string', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML({
        'start-date': '2024-01-01',
        'end-date': '2024-01-15'
      })
    );

    const serialized = picker.serializeValue(picker.value);
    expect(serialized).to.equal(
      '{"startDate":"2024-01-01","endDate":"2024-01-15"}'
    );
  });

  it('works with form field wrapper', async () => {
    const picker: DateRangePicker = await createRangePicker(
      getRangePickerHTML({
        label: 'Date Range',
        name: 'date_range',
        'help-text': 'Select a date range'
      })
    );

    const field = picker.shadowRoot?.querySelector('temba-field');
    expect(field).to.exist;
    expect(field?.getAttribute('name')).to.equal('date_range');
    await assertScreenshot('daterangepicker/with-label', getClip(picker));
  });
});
