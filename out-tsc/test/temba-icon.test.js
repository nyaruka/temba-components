import { assert } from '@open-wc/testing';
import { VectorIcon } from '../src/display/Icon';
import { getComponent } from './utils.test';
const TAG = 'temba-icon';
const getIcon = async (attrs = {}) => {
    return (await getComponent(TAG, attrs));
};
describe(TAG, () => {
    it('can be created', async () => {
        const icon = await getIcon({ name: 'checkmark' });
        assert.instanceOf(icon, VectorIcon);
    });
});
//# sourceMappingURL=temba-icon.test.js.map