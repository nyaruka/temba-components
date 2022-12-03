import * as sinon from 'sinon';
import { TembaDate } from '../src/date/TembaDate';
import {
  assertScreenshot,
  getClip,
  getComponent,
  loadStore,
} from './utils.test';
import { DateTime } from 'luxon';
import { expect } from '@open-wc/testing';

const TAG = 'temba-date';

export const getDate = async (attrs: any = {}) => {
  attrs['width'] = 100;
  return (await getComponent(TAG, attrs)) as TembaDate;
};

// mock the current time
const now = DateTime.fromISO('2022-12-02T21:00:00.000000-07:00');
sinon.replace(DateTime, 'now', () => {
  return now;
});

describe('temba-date', () => {
  beforeEach(() => {
    loadStore();
  });

  it('renders default', async () => {
    const date = await getDate({ isodate: '1978-11-18T02:22:00.000000-07:00' });
    const dateString = (
      date.shadowRoot.querySelector('.date') as HTMLDivElement
    ).innerText;

    await assertScreenshot('date/date', getClip(date));
    expect(dateString).to.equal('11/18/1978');
  });

  it('renders duration', async () => {
    const date = await getDate({
      isodate: '1978-11-18T02:22:00.000000-07:00',
      display: 'duration',
    });
    const dateString = (
      date.shadowRoot.querySelector('.date') as HTMLDivElement
    ).innerText;

    await assertScreenshot('date/duration', getClip(date));
    expect(dateString).to.equal('44 years');
  });

  it('renders datetime', async () => {
    const date = await getDate({
      isodate: '1978-11-18T02:22:00.000000-07:00',
      display: 'datetime',
    });
    const dateString = (
      date.shadowRoot.querySelector('.date') as HTMLDivElement
    ).innerText;

    await assertScreenshot('date/datetime', getClip(date));
    expect(dateString).to.equal('11/18/1978, 9:22 AM');
  });
});
