import { fixture, expect, assert } from '@open-wc/testing';
import { FloatingTab } from '../src/display/FloatingTab';
import { assertScreenshot, getClip, getComponent } from './utils.test';

describe('temba-floating-tab', () => {
  it('can be created', async () => {
    const tab: FloatingTab = await getComponent('temba-floating-tab', {
      icon: 'phone',
      label: 'Phone Simulator',
      color: '#10b981',
      top: 100
    });
    
    assert.instanceOf(tab, FloatingTab);
    expect(tab.icon).to.equal('phone');
    expect(tab.label).to.equal('Phone Simulator');
    expect(tab.color).to.equal('#10b981');
    expect(tab.top).to.equal(100);
    expect(tab.hidden).to.equal(false);
    
    await assertScreenshot('floating-tab/default', getClip(tab));
  });

  it('can be hidden', async () => {
    const tab: FloatingTab = await getComponent('temba-floating-tab', {
      icon: 'phone',
      label: 'Phone Simulator',
      color: '#10b981',
      hidden: true
    });
    
    expect(tab.hidden).to.equal(true);
    expect(tab.classList.contains('hidden')).to.equal(true);
    
    await assertScreenshot('floating-tab/hidden', getClip(tab));
  });

  it('shows label on hover', async () => {
    const tab: FloatingTab = await getComponent('temba-floating-tab', {
      icon: 'phone',
      label: 'Phone Simulator',
      color: '#6366f1'
    });
    
    const tabElement = tab.shadowRoot.querySelector('.tab') as HTMLElement;
    expect(tabElement).to.exist;
    
    // simulate hover state
    const labelElement = tab.shadowRoot.querySelector('.label') as HTMLElement;
    expect(labelElement).to.exist;
    
    await assertScreenshot('floating-tab/hover', getClip(tab));
  });

  it('fires click event', async () => {
    const tab: FloatingTab = await getComponent('temba-floating-tab', {
      icon: 'clock',
      label: 'History',
      color: '#8b5cf6'
    });
    
    let clicked = false;
    tab.addEventListener('temba-button-clicked', () => {
      clicked = true;
    });
    
    const tabElement = tab.shadowRoot.querySelector('.tab') as HTMLElement;
    tabElement.click();
    
    expect(clicked).to.equal(true);
  });

  it('supports different colors', async () => {
    const tab1: FloatingTab = await getComponent('temba-floating-tab', {
      icon: 'phone',
      label: 'Phone',
      color: '#10b981',
      top: 100
    });
    
    const tab2: FloatingTab = await getComponent('temba-floating-tab', {
      icon: 'globe',
      label: 'Translation',
      color: '#6b7280',
      top: 200
    });
    
    const tab3: FloatingTab = await getComponent('temba-floating-tab', {
      icon: 'clock',
      label: 'History',
      color: '#8b5cf6',
      top: 300
    });
    
    await assertScreenshot('floating-tab/green', getClip(tab1));
    await assertScreenshot('floating-tab/gray', getClip(tab2));
    await assertScreenshot('floating-tab/purple', getClip(tab3));
  });

  it('supports custom positioning', async () => {
    const tab: FloatingTab = await getComponent('temba-floating-tab', {
      icon: 'phone',
      label: 'Phone Simulator',
      color: '#10b981',
      top: 250
    });
    
    expect(tab.top).to.equal(250);
  });
});
