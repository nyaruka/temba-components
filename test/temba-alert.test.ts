import { fixture, assert } from '@open-wc/testing';
import { Alert } from '../src/alert/Alert';

import './utils.test';

export const getHTML = () => {
  return `<temba-alert></temba-alert>`;
};

describe('temba-alert', () => {
  beforeEach(() => {});
  afterEach(() => {});

  it('can be created', async () => {
    const alert: Alert = await fixture(getHTML());
    assert.instanceOf(alert, Alert);
  });
});
