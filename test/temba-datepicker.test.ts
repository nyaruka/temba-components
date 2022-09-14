import { fixture, expect, assert } from '@open-wc/testing';
import DatePicker from '../src/datepicker/DatePicker';
import { assertScreenshot, getAttributes, getClip } from './utils.test';

export const getPickerHTML = (attrs: any = {}) => {
  return `<temba-datepicker ${getAttributes(attrs)}></temba-datepicker>`;
};

export const createPicker = async (def: string) => {
  const parentNode = document.createElement('div');
  // parentNode.setAttribute('style', 'width: 250px;');
  const picker: DatePicker = await fixture(def, { parentNode });
  return picker;
};

describe('temba-datepicker', () => {
  it('can be created', async () => {
    const picker: DatePicker = await createPicker(getPickerHTML());
    assert.instanceOf(picker, DatePicker);
    await assertScreenshot('datepicker/default', getClip(picker));
  });

  it('can be initialized with an iso date', async () => {
    const picker: DatePicker = await createPicker(
      getPickerHTML({ value: '2020-01-20T14:00Z' })
    );
    assert.instanceOf(picker, DatePicker);

    // default should be browser locale, which for our tests is UTC
    expect(picker.timezone).to.equal('UTC');

    // we should display in the current locale
    await assertScreenshot('datepicker/initial-value', getClip(picker));

    // but our value should be our original value as a full iso date
    expect(picker.getISODate()).is.equal('2020-01-20T14:00:00.000Z');
  });

  it('can be initialized with a timezone', async () => {
    const picker: DatePicker = await createPicker(
      getPickerHTML({
        value: '2020-01-20T14:00Z',
        timezone: 'America/New_York',
      })
    );
    assert.instanceOf(picker, DatePicker);

    expect(picker.timezone).to.equal('America/New_York');

    // we should display in the eastern timezone
    await assertScreenshot('datepicker/initial-timezone', getClip(picker));

    // but our value should be our original value as a full iso date
    expect(picker.getISODate()).is.equal('2020-01-20T14:00:00.000Z');
  });
});
