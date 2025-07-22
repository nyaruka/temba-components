import { expect } from '@open-wc/testing';
import { Editor } from '../src/flow/Editor';
import { Plumber } from '../src/flow/Plumber';
import { stub, restore } from 'sinon';

// Register the component
customElements.define('temba-flow-editor-test', Editor);

describe('Flow Editor Arrow Hover', () => {
  let mockCanvas: HTMLElement;
  let plumber: Plumber;

  beforeEach(() => {
    restore();
    mockCanvas = document.createElement('div');
    mockCanvas.id = 'test-canvas';
    document.body.appendChild(mockCanvas);

    // Stub document.getElementById to return mock elements
    stub(document, 'getElementById').callsFake((id: string) => {
      const mockElement = document.createElement('div');
      mockElement.id = id;
      return mockElement;
    });
  });

  afterEach(() => {
    restore();
    document.body.removeChild(mockCanvas);
  });

  it('should have CSS styles for arrow hover behavior', () => {
    const styles = Editor.styles;
    expect(styles).to.exist;

    // Check that the CSS contains the arrow hover styles
    const cssText = styles.cssText;
    expect(cssText).to.contain('.plumb-arrow:hover');
    expect(cssText).to.contain('arrow-hover');
    expect(cssText).to.contain(':has(.plumb-arrow:hover)');
  });

  it('should set up arrow hover listeners after connections are created', async () => {
    // Create a mock plumber instance
    plumber = new Plumber(mockCanvas);

    // Mock the jsPlumb instance
    const mockJsPlumb = {
      batch: stub().callsFake((fn) => fn()),
      addEndpoint: stub().returns({}),
      connect: stub(),
      selectEndpoints: stub().returns({
        deleteAll: stub()
      }),
      bind: stub(),
      getConnections: stub().returns([]),
      repaintEverything: stub(),
      revalidate: stub()
    };

    (plumber as any).jsPlumb = mockJsPlumb;

    // Create mock arrow and connector elements in the DOM
    const mockConnector = document.createElement('div');
    mockConnector.className = 'plumb-connector';

    const mockArrow = document.createElement('div');
    mockArrow.className = 'plumb-arrow';
    mockConnector.appendChild(mockArrow);
    mockCanvas.appendChild(mockConnector);

    // Stub querySelectorAll to return our mock arrow
    const querySelectorAllStub = stub(document, 'querySelectorAll');
    const mockNodeList = {
      length: 1,
      item: (index: number) => (index === 0 ? mockArrow : null),
      [0]: mockArrow,
      [Symbol.iterator]: function* () {
        yield mockArrow;
      },
      forEach: function (callback: (element: Element) => void) {
        callback(mockArrow);
      }
    } as unknown as NodeListOf<Element>;
    querySelectorAllStub.withArgs('.plumb-arrow').returns(mockNodeList);

    // Call setupArrowHoverListeners directly
    (plumber as any).setupArrowHoverListeners();

    // Test that hover listeners work
    expect(mockConnector.classList.contains('arrow-hover')).to.be.false;

    // Simulate mouseenter on arrow
    const mouseEnterEvent = new MouseEvent('mouseenter');
    mockArrow.dispatchEvent(mouseEnterEvent);

    expect(mockConnector.classList.contains('arrow-hover')).to.be.true;

    // Simulate mouseleave on arrow
    const mouseLeaveEvent = new MouseEvent('mouseleave');
    mockArrow.dispatchEvent(mouseLeaveEvent);

    expect(mockConnector.classList.contains('arrow-hover')).to.be.false;

    querySelectorAllStub.restore();
  });

  it('should handle arrow hover when no parent connector exists', async () => {
    plumber = new Plumber(mockCanvas);

    const mockJsPlumb = {
      batch: stub(),
      bind: stub()
    };

    (plumber as any).jsPlumb = mockJsPlumb;

    // Create mock arrow without parent connector
    const mockArrow = document.createElement('div');
    mockArrow.className = 'plumb-arrow';
    mockCanvas.appendChild(mockArrow);

    const querySelectorAllStub = stub(document, 'querySelectorAll');
    const mockNodeList = {
      length: 1,
      item: (index: number) => (index === 0 ? mockArrow : null),
      [0]: mockArrow,
      [Symbol.iterator]: function* () {
        yield mockArrow;
      },
      forEach: function (callback: (element: Element) => void) {
        callback(mockArrow);
      }
    } as unknown as NodeListOf<Element>;
    querySelectorAllStub.withArgs('.plumb-arrow').returns(mockNodeList);

    // This should not throw an error
    expect(() => {
      (plumber as any).setupArrowHoverListeners();
    }).not.to.throw();

    querySelectorAllStub.restore();
  });
});
