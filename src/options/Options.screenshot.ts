import moxios from 'moxios';
import sinon from 'sinon';
import { assertScreenshot } from '../../test/utils';
import { fixture } from '@open-wc/testing';
import { colors } from '../select/Select.test';
import { Options } from './Options';

const closedClip = {
  y: 70,
  x: 0,
  width: 485,
  height: 55,
};

const clip = (height: number = 55) => {
  return { ...closedClip, height };
};

(window as any).setViewport({
  width: 500,
  height: 1000,
  deviceScaleFactor: 2,
});

export const getOptionsHTML = (attrs: any = {}): string => {
  return `
    <temba-options ${Object.keys(attrs)
      .map((name: string) => `${name}='${attrs[name]}'`)
      .join(' ')}>
    </temba-select>`;
};

describe('temba-options-screenshots', () => {
  it('renders block mode', async () => {
    const ele: Options = await fixture(
      getOptionsHTML({ block: true, visible: true })
    );
    ele.options = colors;

    await assertScreenshot('options-block', clip(110));
  });
});
