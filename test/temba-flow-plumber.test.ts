import { expect } from '@open-wc/testing';
import { Plumber, SOURCE_DEFAULTS, TARGET_DEFAULTS } from '../src/flow/Plumber';
import { stub, useFakeTimers, SinonFakeTimers } from 'sinon';

describe('Plumber', () => {
  let plumber: Plumber;
  let mockJsPlumb: any;
  let mockCanvas: HTMLElement;
  let clock: SinonFakeTimers;

  beforeEach(() => {
    // Use fake timers to control setTimeout
    clock = useFakeTimers();

    // Create mock canvas and make getElementById return a mock element
    mockCanvas = document.createElement('div');
    const mockElement = document.createElement('div');
    stub(document, 'getElementById').returns(mockElement);

    // Create a mock editor with fireCustomEvent
    const mockEditor = { fireCustomEvent: stub() };

    // Create a new plumber instance
    plumber = new Plumber(mockCanvas, mockEditor);

    // Replace the internal jsPlumb instance with mocks
    mockJsPlumb = {
      getConnections: stub().returns([]),
      addClass: stub(),
      removeClass: stub(),
      batch: stub().callsFake((fn) => fn()),
      addEndpoint: stub().returns({}),
      connect: stub(),
      selectEndpoints: stub().returns({
        deleteAll: stub()
      }),
      deleteConnection: stub(),
      removeAllEndpoints: stub(),
      repaintEverything: stub(),
      revalidate: stub(),
      bind: stub()
    };

    (plumber as any).jsPlumb = mockJsPlumb;
    // Reset the connectionWait to avoid timing issues
    (plumber as any).connectionWait = null;
  });

  afterEach(() => {
    // Restore the original document.getElementById
    (document.getElementById as any).restore?.();
    clock.restore();
  });

  describe('constructor', () => {
    it('creates a new plumber instance', () => {
      expect(plumber).to.be.instanceOf(Plumber);
    });
  });

  describe('makeTarget', () => {
    it('creates a target endpoint for the specified element', () => {
      plumber.makeTarget('test-target');
      expect(mockJsPlumb.addEndpoint).to.have.been.called;
    });
  });

  describe('makeSource', () => {
    it('creates a source endpoint for the specified element', () => {
      plumber.makeSource('test-source');
      expect(mockJsPlumb.addEndpoint).to.have.been.called;
    });
  });

  describe('connectIds', () => {
    it('adds connection to pending connections and processes them', () => {
      plumber.connectIds('test-node', 'test-from', 'test-to');

      // Verify pendingConnections has the new connection
      expect((plumber as any).pendingConnections.length).to.equal(1);

      // Advance timer to trigger the timeout
      clock.tick(51); // Just past the 50ms timeout

      // Now the batch should have been called
      expect(mockJsPlumb.batch).to.have.been.called;
    });
  });

  describe('processPendingConnections', () => {
    it('processes pending connections with timeout', () => {
      // Add a connection to pending connections
      plumber.connectIds('test-node', 'test-from', 'test-to');

      // Fast-forward clock past the timeout
      clock.tick(51); // Just past the 50ms timeout

      expect(mockJsPlumb.batch).to.have.been.called;
    });

    it('creates endpoints and connections for pending connections', () => {
      plumber.connectIds('test-node', 'test-from', 'test-to');

      // Fast-forward clock past the timeout
      clock.tick(51); // Just past the 50ms timeout

      expect(mockJsPlumb.addEndpoint).to.have.been.called;
      expect(mockJsPlumb.connect).to.have.been.called;
    });

    it('clears existing timeout when called multiple times', () => {
      // Set up spies for window.setTimeout and window.clearTimeout
      const clearTimeoutSpy = stub(window, 'clearTimeout');
      const setTimeoutSpy = stub(window, 'setTimeout').returns(123 as any);

      // Call twice
      plumber.processPendingConnections();
      plumber.processPendingConnections();

      // Should have called clearTimeout once and setTimeout twice
      expect(clearTimeoutSpy).to.have.been.calledOnce;
      expect(setTimeoutSpy).to.have.been.calledTwice;

      // Clean up
      clearTimeoutSpy.restore();
      setTimeoutSpy.restore();
    });

    it('handles empty pending connections', () => {
      // Call without adding any connections
      plumber.processPendingConnections();

      // Fast-forward clock past the timeout
      clock.tick(51); // Just past the 50ms timeout

      expect(mockJsPlumb.batch).to.have.been.called;
    });
  });

  describe('constants', () => {
    it('has correct properties in SOURCE_DEFAULTS', () => {
      expect(SOURCE_DEFAULTS).to.have.property('endpoint');
      expect(SOURCE_DEFAULTS).to.have.property('anchors');
      expect(SOURCE_DEFAULTS).to.have.property('maxConnections');
      expect(SOURCE_DEFAULTS).to.have.property('source');
    });

    it('has correct properties in TARGET_DEFAULTS', () => {
      expect(TARGET_DEFAULTS).to.have.property('endpoint');
      expect(TARGET_DEFAULTS).to.have.property('anchor');
      expect(TARGET_DEFAULTS).to.have.property('maxConnections');
      expect(TARGET_DEFAULTS).to.have.property('target');
    });
  });
});
