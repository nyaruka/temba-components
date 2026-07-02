import { assert, expect } from '@open-wc/testing';
import * as sinon from 'sinon';
import { CustomEventType } from '../src/interfaces';
import { FlowList } from '../src/list/FlowList';
import { getComponent } from './utils.test';

const TAG = 'temba-flow-list';
const getFlowList = async (attrs: any = {}, width = 400, height = 0) => {
  return (await getComponent(TAG, attrs, '', width, height)) as FlowList;
};

// a plain click with no modifier keys, carrying the stopPropagation /
// preventDefault spies the handler is expected to call
const makeClick = (over: any = {}) =>
  ({
    metaKey: false,
    ctrlKey: false,
    stopPropagation: sinon.spy(),
    preventDefault: sinon.spy(),
    ...over
  }) as any;

describe('temba-flow-list', () => {
  it('can be created', async () => {
    const list: FlowList = await getFlowList();
    assert.instanceOf(list, FlowList);
    expect(list.valueKey).to.equal('uuid');
  });

  it('opens the flow editor for a row', async () => {
    const list: FlowList = await getFlowList();
    expect((list as any).getRowHref({ uuid: 'flow-1' })).to.equal(
      '/flow/editor/flow-1/'
    );
  });

  it('navigates to the label view when a label chip is clicked', async () => {
    const list: FlowList = await getFlowList();
    const fired: any[] = [];
    list.addEventListener(CustomEventType.Redirected, (e: any) =>
      fired.push(e.detail)
    );

    const event = makeClick();
    (list as any).handleLabelClick(
      { uuid: 'label-1', name: 'Important' },
      event
    );

    // the row's navigation must not also fire
    expect(event.stopPropagation.called).to.be.true;
    expect(event.preventDefault.called).to.be.true;
    expect(fired).to.have.length(1);
    expect(fired[0].url).to.equal('/flow/labels/label-1');
  });

  it('opens the label view in a new tab on meta/ctrl-click', async () => {
    const list: FlowList = await getFlowList();
    const openStub = sinon.stub(window, 'open');
    const fired: any[] = [];
    list.addEventListener(CustomEventType.Redirected, (e: any) =>
      fired.push(e.detail)
    );

    try {
      (list as any).handleLabelClick(
        { uuid: 'label-1', name: 'Important' },
        makeClick({ metaKey: true })
      );

      expect(openStub.calledWith('/flow/labels/label-1', '_blank')).to.be.true;
      // no in-app redirect when opening a new tab
      expect(fired).to.have.length(0);
    } finally {
      openStub.restore();
    }
  });

  it('intercepts a real click on a rendered label chip', async () => {
    const list: FlowList = await getFlowList();
    // render a single row carrying a label chip
    (list as any).items = [
      {
        uuid: 'flow-1',
        name: 'Flow 1',
        labels: [{ uuid: 'label-1', name: 'Important' }]
      }
    ];
    list.requestUpdate();
    await list.updateComplete;

    const chip = list.shadowRoot.querySelector('temba-label') as HTMLElement;
    expect(chip, 'label chip rendered').to.exist;

    const redirects: any[] = [];
    const rowClicks: any[] = [];
    list.addEventListener(CustomEventType.Redirected, (e: any) =>
      redirects.push(e.detail)
    );
    list.addEventListener(CustomEventType.RowClick, (e: any) =>
      rowClicks.push(e.detail)
    );

    chip.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true })
    );

    // the label navigates, and the row's flow-editor navigation is suppressed
    expect(redirects).to.have.length(1);
    expect(redirects[0].url).to.equal('/flow/labels/label-1');
    expect(rowClicks, 'row click suppressed').to.have.length(0);
  });

  it('ignores a label with no uuid', async () => {
    const list: FlowList = await getFlowList();
    const fired: any[] = [];
    list.addEventListener(CustomEventType.Redirected, (e: any) =>
      fired.push(e.detail)
    );

    const event = makeClick();
    (list as any).handleLabelClick({ name: 'Important' } as any, event);

    // still swallows the click so the row doesn't navigate...
    expect(event.stopPropagation.called).to.be.true;
    // ...but there's nowhere to go
    expect(fired).to.have.length(0);
  });
});
