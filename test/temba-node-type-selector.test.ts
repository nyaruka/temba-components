import { expect, assert } from '@open-wc/testing';
import { NodeTypeSelector } from '../src/flow/NodeTypeSelector';
import { assertScreenshot, getClip, getComponent } from './utils.test';

describe('temba-node-type-selector', () => {
  const createSelector = async () => {
    const component = (await getComponent(
      'temba-node-type-selector',
      {},
      '',
      700,
      600
    )) as NodeTypeSelector;
    await component.updateComplete;
    return component;
  };

  it('can be created', async () => {
    const selector = await createSelector();
    assert.instanceOf(selector, NodeTypeSelector);
    expect(selector.open).to.be.false;
  });

  it('is not visible when closed', async () => {
    const selector = await createSelector();
    expect(selector.open).to.be.false;

    // component should not be in DOM when closed
    expect(selector.hasAttribute('open')).to.be.false;
  });

  it('shows dialog when opened in action mode', async () => {
    const selector = await createSelector();

    selector.show('action', { x: 100, y: 100 });
    await selector.updateComplete;

    expect(selector.open).to.be.true;
    expect(selector.mode).to.equal('action');
    expect(selector.hasAttribute('open')).to.be.true;

    const dialog = selector.shadowRoot?.querySelector('.dialog') as HTMLElement;
    await assertScreenshot('node-type-selector/action-mode', getClip(dialog));
  });

  it('shows dialog when opened in split mode', async () => {
    const selector = await createSelector();

    selector.show('split', { x: 100, y: 100 });
    await selector.updateComplete;

    expect(selector.open).to.be.true;
    expect(selector.mode).to.equal('split');

    const dialog = selector.shadowRoot?.querySelector('.dialog') as HTMLElement;
    await assertScreenshot('node-type-selector/split-mode', getClip(dialog));
  });

  it('displays action types in action mode', async () => {
    const selector = await createSelector();
    selector.show('action', { x: 100, y: 100 });
    await selector.updateComplete;

    const title = selector.shadowRoot?.querySelector('.header h2');
    expect(title?.textContent).to.equal('Select an Action');

    // verify we have node items
    const nodeItems = selector.shadowRoot?.querySelectorAll('.node-item');
    expect(nodeItems?.length).to.be.greaterThan(0);
  });

  it('displays split types in split mode', async () => {
    const selector = await createSelector();
    selector.show('split', { x: 100, y: 100 });
    await selector.updateComplete;

    const title = selector.shadowRoot?.querySelector('.header h2');
    expect(title?.textContent).to.equal('Select a Split');

    // verify we have node items
    const nodeItems = selector.shadowRoot?.querySelectorAll('.node-item');
    expect(nodeItems?.length).to.be.greaterThan(0);
  });

  it('closes when close() is called', async () => {
    const selector = await createSelector();
    selector.show('action', { x: 100, y: 100 });
    await selector.updateComplete;

    expect(selector.open).to.be.true;

    selector.close();
    await selector.updateComplete;

    expect(selector.open).to.be.false;
  });

  it('closes when overlay is clicked', async () => {
    const selector = await createSelector();
    selector.show('action', { x: 100, y: 100 });
    await selector.updateComplete;

    const overlay = selector.shadowRoot?.querySelector(
      '.overlay'
    ) as HTMLElement;
    overlay.click();
    await selector.updateComplete;

    expect(selector.open).to.be.false;
  });

  it('closes when cancel button is clicked', async () => {
    const selector = await createSelector();
    selector.show('action', { x: 100, y: 100 });
    await selector.updateComplete;

    const cancelButton = selector.shadowRoot?.querySelector(
      'temba-button'
    ) as HTMLElement;
    cancelButton.click();
    await selector.updateComplete;

    expect(selector.open).to.be.false;
  });

  it('fires selection event when node type is clicked', async () => {
    const selector = await createSelector();
    selector.show('action', { x: 100, y: 100 });
    await selector.updateComplete;

    let selectionFired = false;
    let selectionDetail = null;

    selector.addEventListener('temba-selection', (event: any) => {
      selectionFired = true;
      selectionDetail = event.detail;
    });

    // click on first node item
    const firstNodeItem = selector.shadowRoot?.querySelector(
      '.node-item'
    ) as HTMLElement;
    firstNodeItem.click();
    await selector.updateComplete;

    expect(selectionFired).to.be.true;
    expect(selectionDetail).to.have.property('nodeType');
    expect(selectionDetail).to.have.property('position');
    expect(selectionDetail.position).to.deep.equal({ x: 100, y: 100 });
    expect(selector.open).to.be.false;
  });

  it('filters actions by flow type - voice flow should show voice-only actions', async () => {
    const selector = await createSelector();
    selector.flowType = 'voice';
    await selector.updateComplete;
    selector.show('action', { x: 100, y: 100 });
    await selector.updateComplete;

    // get all node item titles
    const nodeItems = selector.shadowRoot?.querySelectorAll('.node-item-title');
    const titles = Array.from(nodeItems || []).map((item) => item.textContent);

    // voice flow should have Say Message and Play Audio
    expect(titles).to.include('Say Message');
    expect(titles).to.include('Play Audio');
  });

  it('filters actions by flow type - message flow should not show voice-only actions', async () => {
    const selector = await createSelector();
    selector.flowType = 'message';
    await selector.updateComplete;
    selector.show('action', { x: 100, y: 100 });
    await selector.updateComplete;

    // get all node item titles
    const nodeItems = selector.shadowRoot?.querySelectorAll('.node-item-title');
    const titles = Array.from(nodeItems || []).map((item) => item.textContent);

    // message flow should not have Say Message or Play Audio
    expect(titles).to.not.include('Say Message');
    expect(titles).to.not.include('Play Audio');
  });

  it('filters splits by flow type - message flow should show wait for response', async () => {
    const selector = await createSelector();
    selector.flowType = 'message';
    await selector.updateComplete;
    selector.show('split', { x: 100, y: 100 });
    await selector.updateComplete;

    // get all node item titles
    const nodeItems = selector.shadowRoot?.querySelectorAll('.node-item-title');
    const titles = Array.from(nodeItems || []).map((item) => item.textContent);

    // message flow should have Wait for Response
    expect(titles).to.include('Wait for Response');
  });

  it('filters splits by flow type - voice flow should not show wait for response', async () => {
    const selector = await createSelector();
    selector.flowType = 'voice';
    await selector.updateComplete;
    selector.show('split', { x: 100, y: 100 });
    await selector.updateComplete;

    // get all node item titles
    const nodeItems = selector.shadowRoot?.querySelectorAll('.node-item-title');
    const titles = Array.from(nodeItems || []).map((item) => item.textContent);

    // voice flow should not have Wait for Response
    expect(titles).to.not.include('Wait for Response');

    // but should have Wait for Digits and Wait for Menu Selection
    expect(titles).to.include('Wait for Digits');
    expect(titles).to.include('Wait for Menu Selection');
  });

  it('filters by features - AI feature enables AI splits', async () => {
    const selector = await createSelector();
    selector.flowType = 'message';
    selector.features = ['ai'];
    await selector.updateComplete;
    selector.show('split', { x: 100, y: 100 });
    await selector.updateComplete;

    // get all node item titles
    const nodeItems = selector.shadowRoot?.querySelectorAll('.node-item-title');
    const titles = Array.from(nodeItems || []).map((item) => item.textContent);

    // with ai feature, should have Split by AI
    expect(titles).to.include('Split by AI');
  });

  it('filters by features - without AI feature, AI splits are hidden', async () => {
    const selector = await createSelector();
    selector.flowType = 'message';
    selector.features = [];
    await selector.updateComplete;
    selector.show('split', { x: 100, y: 100 });
    await selector.updateComplete;

    // get all node item titles
    const nodeItems = selector.shadowRoot?.querySelectorAll('.node-item-title');
    const titles = Array.from(nodeItems || []).map((item) => item.textContent);

    // without ai feature, should not have Split by AI
    expect(titles).to.not.include('Split by AI');
  });

  it('filters by features - airtime feature enables airtime actions', async () => {
    const selector = await createSelector();
    selector.flowType = 'message';
    selector.features = ['airtime'];
    await selector.updateComplete;
    selector.show('action', { x: 100, y: 100 });
    await selector.updateComplete;

    // get all node item titles
    const nodeItems = selector.shadowRoot?.querySelectorAll('.node-item-title');
    const titles = Array.from(nodeItems || []).map((item) => item.textContent);

    // with airtime feature, should have Send Airtime
    expect(titles).to.include('Send Airtime');
  });

  it('filters by features - without airtime feature, airtime actions are hidden', async () => {
    const selector = await createSelector();
    selector.flowType = 'message';
    selector.features = [];
    await selector.updateComplete;
    selector.show('action', { x: 100, y: 100 });
    await selector.updateComplete;

    // get all node item titles
    const nodeItems = selector.shadowRoot?.querySelectorAll('.node-item-title');
    const titles = Array.from(nodeItems || []).map((item) => item.textContent);

    // without airtime feature, should not have Send Airtime
    expect(titles).to.not.include('Send Airtime');
  });
});
