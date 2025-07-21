import { expect } from '@open-wc/testing';
import { stub, useFakeTimers, SinonFakeTimers } from 'sinon';
import { Plumber } from '../src/flow/Plumber';

describe('Plumber - Connection Management', () => {
  let plumber: Plumber;
  let mockCanvas: HTMLElement;
  let clock: SinonFakeTimers;

  beforeEach(() => {
    // Use fake timers to control setTimeout
    clock = useFakeTimers();

    // Create mock canvas and make getElementById return a mock element
    mockCanvas = document.createElement('div');
    const mockElement = document.createElement('div');
    stub(document, 'getElementById').returns(mockElement);

    // Create a new plumber instance
    plumber = new Plumber(mockCanvas);

    // Replace the internal jsPlumb instance with mocks
    (plumber as any).jsPlumb = {
      getConnections: stub().returns([]),
      addClass: stub(),
      removeClass: stub(),
      batch: stub().callsFake((fn: any) => fn()),
      addEndpoint: stub().returns({}),
      connect: stub(),
      selectEndpoints: stub().returns({
        deleteAll: stub()
      }),
      deleteConnection: stub(),
      removeAllEndpoints: stub(),
      repaintEverything: stub()
    };
  });

  afterEach(() => {
    // Restore the original document.getElementById
    (document.getElementById as any).restore?.();
    clock.restore();
  });

  describe('setConnectionRemovingState', () => {
    it('returns false when no connections are found', () => {
      const result = plumber.setConnectionRemovingState('test-exit', true);
      expect(result).to.be.false;
      expect((plumber as any).jsPlumb.getConnections).to.have.been.called;
    });

    it('sets removing class on connections when isRemoving is true', () => {
      const mockConnections = [
        { id: 'conn1', addClass: stub() },
        { id: 'conn2', addClass: stub() }
      ];

      (plumber as any).jsPlumb.getConnections = stub().returns(mockConnections);

      const result = plumber.setConnectionRemovingState('test-exit', true);
      expect(result).to.be.true;
      expect(mockConnections[0].addClass).to.have.been.calledWith('removing');
      expect(mockConnections[1].addClass).to.have.been.calledWith('removing');
    });

    it('removes removing class from connections when isRemoving is false', () => {
      const mockConnections = [
        { id: 'conn1', removeClass: stub() },
        { id: 'conn2', removeClass: stub() }
      ];

      (plumber as any).jsPlumb.getConnections = stub().returns(mockConnections);

      const result = plumber.setConnectionRemovingState('test-exit', false);
      expect(result).to.be.true;
      expect(mockConnections[0].removeClass).to.have.been.calledWith(
        'removing'
      );
      expect(mockConnections[1].removeClass).to.have.been.calledWith(
        'removing'
      );
    });
  });

  describe('connectIds and processPendingConnections', () => {
    it('adds connection to pending connections', () => {
      // Call connectIds which should add to pending connections
      plumber.connectIds('test-from', 'test-to');

      // Verify pendingConnections has the new connection
      expect((plumber as any).pendingConnections.length).to.equal(1);

      // Advance timer to trigger the timeout
      clock.tick(51); // Just past the 50ms timeout

      // Now the batch should have been called
      expect((plumber as any).jsPlumb.batch).to.have.been.called;
      expect((plumber as any).jsPlumb.addEndpoint).to.have.been.called;
      expect((plumber as any).jsPlumb.connect).to.have.been.called;
    });

    it('clears previous timeout when called multiple times', () => {
      // Set up spies for window.setTimeout and window.clearTimeout instead of global
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
  });

  describe('removeExitConnection', () => {
    it('removes connections for an exit', () => {
      const mockConnections = [{ id: 'conn1' }, { id: 'conn2' }];
      (plumber as any).jsPlumb.getConnections = stub().returns(mockConnections);

      const result = plumber.removeExitConnection('test-exit');

      expect(result).to.be.true;
      expect((plumber as any).jsPlumb.deleteConnection).to.have.been
        .calledTwice;
      expect((plumber as any).jsPlumb.removeAllEndpoints).to.have.been.called;
    });

    it('returns false when no connections exist', () => {
      (plumber as any).jsPlumb.getConnections = stub().returns([]);

      const result = plumber.removeExitConnection('test-exit');

      expect(result).to.be.false;
    });
  });
});
