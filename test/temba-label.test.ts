import { assert } from '@open-wc/testing';
import Label from '../src/label/Label';
import { assertScreenshot, getClip, getComponent } from './utils.test';

const TAG = 'temba-label';
const getLabel = async (slot, attrs: any = {}) => {
  return (await getComponent(TAG, attrs, slot)) as Label;
};

describe('temba-label', () => {
  it('renders default', async () => {
    const label: Label = await getLabel('Default');
    assert.instanceOf(label, Label);
    await assertScreenshot('label/no-icon', getClip(label));
  });

  it('renders icon', async () => {
    const label: Label = await getLabel('Default', { icon: 'home' });
    await assertScreenshot('label/default-icon', getClip(label));
  });

  it('renders primary', async () => {
    const label: Label = await getLabel('Primary', {
      icon: 'check',
      primary: true,
    });
    await assertScreenshot('label/primary', getClip(label));
  });

  it('renders secondary', async () => {
    const label: Label = await getLabel('Secondary', {
      icon: 'check',
      secondary: true,
    });
    await assertScreenshot('label/secondary', getClip(label));
  });

  it('renders tertiary', async () => {
    const label: Label = await getLabel('Tertiary', {
      icon: 'check',
      tertiary: true,
    });
    await assertScreenshot('label/tertiary', getClip(label));
  });

  it('renders dark', async () => {
    const label: Label = await getLabel('Dark', { icon: 'check', dark: true });
    await assertScreenshot('label/dark', getClip(label));
  });

  it('renders danger', async () => {
    const label: Label = await getLabel('Danger', {
      icon: 'alert-triangle',
      danger: true,
    });
    await assertScreenshot('label/danger', getClip(label));
  });

  it('renders custom', async () => {
    const label: Label = await getLabel('Custom Orange', {
      icon: 'tool',
      backgroundColor: 'rgb(240, 176, 29)',
      textColor: '#ffff',
    });
    await assertScreenshot('label/custom', getClip(label));
  });
});
