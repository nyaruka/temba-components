import { html, fixture, expect } from '@open-wc/testing';
import { TembaDate } from '../src/display/TembaDate';
import {
  assertScreenshot,
  getClip,
  getComponent,
  loadStore,
  mockNow
} from './utils.test';
import { SinonStub, stub } from 'sinon';
import { stubbable } from '../src/utils';

const TAG = 'temba-date';

export const getDate = async (attrs: any = {}) => {
  attrs['width'] = 100;
  return (await getComponent(TAG, attrs)) as TembaDate;
};

describe('temba-date', () => {
  let mockedNow: SinonStub;
  let stubbableStub: SinonStub;
  const baseDate = new Date('2022-12-02T21:00:00.000000');

  beforeEach(() => {
    mockedNow = mockNow('2022-12-02T21:00:00.000000');
    stubbableStub = stub(stubbable, 'getCurrentDate').returns(baseDate);
    loadStore();
  });

  afterEach(() => {
    mockedNow.restore();
    stubbableStub.restore();
  });

  it('renders default', async () => {
    const date = await getDate({ value: '1978-11-18T02:22:00.000000' });
    const dateString = (
      date.shadowRoot.querySelector('.date') as HTMLSpanElement
    ).innerText;

    await assertScreenshot('date/date', getClip(date));
    expect(dateString).to.equal('11/18/1978');
  });

  it('renders duration', async () => {
    const date = await getDate({
      value: '1978-11-18T02:22:00.000000',
      display: 'duration'
    });
    const dateString = (
      date.shadowRoot.querySelector('.date') as HTMLSpanElement
    ).innerText;

    await assertScreenshot('date/duration', getClip(date));
    expect(dateString).to.equal('18 Nov 1978');
  });

  it('renders duration with recent date showing relative time', async () => {
    const date = await getDate({
      value: '2022-12-02T20:00:00.000000', // 1 hour ago from mocked "now" (21:00)
      display: 'duration'
    });
    const dateString = (
      date.shadowRoot.querySelector('.date') as HTMLSpanElement
    ).innerText;

    expect(dateString).to.equal('1h');
  });

  it('renders duration with date from different year', async () => {
    const date = await getDate({
      value: '2021-06-15T10:00:00.000000', // More than 6 months ago from mocked Dec 2022
      display: 'duration'
    });
    const dateString = (
      date.shadowRoot.querySelector('.date') as HTMLSpanElement
    ).innerText;

    expect(dateString).to.equal('15 Jun 2021');
  });

  it('renders duration with date from same year but more than 6 months', async () => {
    const date = await getDate({
      value: '2022-01-15T10:00:00.000000', // More than 6 months ago but same year
      display: 'duration'
    });
    const dateString = (
      date.shadowRoot.querySelector('.date') as HTMLSpanElement
    ).innerText;

    expect(dateString).to.equal('15 Jan'); // Should not show year for same year
  });

  it('renders datetime', async () => {
    const date = await getDate({
      value: '1978-11-18T02:22:00.000000',
      display: 'datetime'
    });
    const dateString = (
      date.shadowRoot.querySelector('.date') as HTMLSpanElement
    ).innerText;

    await assertScreenshot('date/datetime', getClip(date));
    expect(dateString).to.equal('11/18/1978, 2:22 AM');
  });

  it('renders timedate', async () => {
    const date = await getDate({
      value: '2022-12-01T21:30:00.000000',
      display: 'timedate'
    });
    const dateString = (
      date.shadowRoot.querySelector('.date') as HTMLSpanElement
    ).innerText;
    await assertScreenshot('date/timedate', getClip(date));
    expect(dateString).to.equal('Dec 1');
  });

  it('renders inline', async () => {
    const el: HTMLElement = await fixture(html`
      <span
        >Your birthday is
        <temba-date value="1978-11-18T02:22:00.000000"></temba-date>!</span
      >
    `);

    await assertScreenshot('date/date-inline', getClip(el));
  });
});
