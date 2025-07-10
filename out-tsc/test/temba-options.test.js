import { fixture } from '@open-wc/testing';
import { assertScreenshot, getClip, getHTML } from './utils.test';
const colors = [
    { name: 'Red', value: '0' },
    { name: 'Green', value: '1' },
    { name: 'Blue', value: '2' }
];
export const getOptionsHTML = (attrs = {}) => {
    return getHTML('temba-options', attrs);
};
export const createOptions = async (def) => {
    const parentNode = document.createElement('div');
    parentNode.setAttribute('style', 'width: 250px;');
    return (await fixture(def, { parentNode }));
};
describe('temba-options-screenshots', () => {
    it('renders block mode', async () => {
        const options = await createOptions(getOptionsHTML({ block: true, visible: true }));
        options.options = colors;
        await options.updateComplete;
        await assertScreenshot('options/block', getClip(options));
    });
});
//# sourceMappingURL=temba-options.test.js.map