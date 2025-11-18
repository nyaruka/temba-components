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
    const titles = Array.from(nodeItems || []).map((item) =>
      item.textContent?.trim()
    );

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
    const titles = Array.from(nodeItems || []).map((item) =>
      item.textContent?.trim()
    );

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
    const titles = Array.from(nodeItems || []).map((item) =>
      item.textContent?.trim()
    );

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
    const titles = Array.from(nodeItems || []).map((item) =>
      item.textContent?.trim()
    );

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
    const titles = Array.from(nodeItems || []).map((item) =>
      item.textContent?.trim()
    );

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
    const titles = Array.from(nodeItems || []).map((item) =>
      item.textContent?.trim()
    );

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
    const titles = Array.from(nodeItems || []).map((item) =>
      item.textContent?.trim()
    );

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
    const titles = Array.from(nodeItems || []).map((item) =>
      item.textContent?.trim()
    );

    // without airtime feature, should not have Send Airtime
    expect(titles).to.not.include('Send Airtime');
  });

  it('hides actions/nodes with empty flowTypes array from selector', async () => {
    const selector = await createSelector();

    // test that isConfigAvailable returns false for empty flowTypes array
    const configWithEmptyFlowTypes = {
      name: 'Test Action',
      type: 'test_action',
      flowTypes: [] // empty array should hide from all flow types
    };

    selector.flowType = 'message';
    await selector.updateComplete;

    // call private method via any to test behavior
    const isAvailable = (selector as any).isConfigAvailable(
      configWithEmptyFlowTypes
    );
    expect(isAvailable).to.be.false;

    // test with different flow types - should still be false
    selector.flowType = 'voice';
    await selector.updateComplete;

    const isAvailableVoice = (selector as any).isConfigAvailable(
      configWithEmptyFlowTypes
    );
    expect(isAvailableVoice).to.be.false;
  });

  it('shows actions/nodes with undefined flowTypes for all flow types', async () => {
    const selector = await createSelector();

    // test that isConfigAvailable returns true for undefined flowTypes
    const configWithUndefinedFlowTypes = {
      name: 'Test Action',
      type: 'test_action'
      // flowTypes is undefined - should be available for all
    };

    selector.flowType = 'message';
    await selector.updateComplete;

    const isAvailable = (selector as any).isConfigAvailable(
      configWithUndefinedFlowTypes
    );
    expect(isAvailable).to.be.true;

    // test with different flow types - should still be true
    selector.flowType = 'voice';
    await selector.updateComplete;

    const isAvailableVoice = (selector as any).isConfigAvailable(
      configWithUndefinedFlowTypes
    );
    expect(isAvailableVoice).to.be.true;
  });

  describe('alias filtering', () => {
    it('should not show split_by_run_result twice when aliases exist', async () => {
      const selector = await createSelector();

      selector.show('split', { x: 100, y: 100 });
      await selector.updateComplete;

      // Get all the node items rendered in the selector
      const nodeItems = selector.shadowRoot!.querySelectorAll('.node-item');

      // Count how many times "Split by Result" appears
      let splitByResultCount = 0;
      nodeItems.forEach((item) => {
        const title = item.querySelector('.node-item-title');
        if (title?.textContent?.includes('Split by Result')) {
          splitByResultCount++;
        }
      });

      // Should only appear once, not twice
      expect(splitByResultCount).to.equal(1);
    });

    it('should not show split_by_run_result_delimited type in the selector', async () => {
      const selector = await createSelector();

      selector.show('split', { x: 100, y: 100 });
      await selector.updateComplete;

      // Get all the node items and check their data-type attributes
      const nodeItems = selector.shadowRoot!.querySelectorAll('.node-item');

      let foundDelimitedType = false;
      nodeItems.forEach((item) => {
        const typeAttr = item.getAttribute('data-type');
        if (typeAttr === 'split_by_run_result_delimited') {
          foundDelimitedType = true;
        }
      });

      expect(foundDelimitedType).to.be.false;
    });
  });
});
