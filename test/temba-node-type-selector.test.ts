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

    await assertScreenshot('node-type-selector/action-mode', getClip(selector));
  });

  it('shows dialog when opened in split mode', async () => {
    const selector = await createSelector();

    selector.show('split', { x: 100, y: 100 });
    await selector.updateComplete;

    expect(selector.open).to.be.true;
    expect(selector.mode).to.equal('split');

    await assertScreenshot('node-type-selector/split-mode', getClip(selector));
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
});
