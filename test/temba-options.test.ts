import { fixture } from '@open-wc/testing';
import { Options } from '../src/options/Options';
import { assertScreenshot, getClip } from './utils';
import './utils';

const colors = [
  { name: 'Red', value: '0' },
  { name: 'Green', value: '1' },
  { name: 'Blue', value: '2' },
];

export const getOptionsHTML = (attrs: any = {}): string => {
  return `
    <temba-options ${Object.keys(attrs)
      .map((name: string) => `${name}='${attrs[name]}'`)
      .join(' ')}>
    </temba-select>`;
};

export const createOptions = async (def: string) => {
  const parentNode = document.createElement('div');
  parentNode.setAttribute('style', 'width: 250px;');
  return (await fixture(def, { parentNode })) as Options;
};

describe('temba-options-screenshots', () => {
  it('renders block mode', async () => {
    const options: Options = await createOptions(
      getOptionsHTML({ block: true, visible: true })
    );
    options.options = colors;
    await options.updateComplete;
    await assertScreenshot('options/block', getClip(options));
  });
});