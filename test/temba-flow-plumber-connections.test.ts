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

    // Create mock canvas
    mockCanvas = document.createElement('div');
    document.body.appendChild(mockCanvas);

    // Create a mock editor with fireCustomEvent
    const mockEditor = { fireCustomEvent: stub() };

    // Create a new plumber instance
    plumber = new Plumber(mockCanvas, mockEditor);
  });

  afterEach(() => {
    if (plumber) {
      plumber.destroy();
    }
    document.body.removeChild(mockCanvas);
    clock.restore();
  });

  describe('setConnectionRemovingState', () => {
    it('returns false when no connections are found', () => {
      const exitElement = document.createElement('div');
      exitElement.id = 'test-exit';
      mockCanvas.appendChild(exitElement);

      const result = plumber.setConnectionRemovingState('test-exit', true);
      expect(result).to.be.false;
    });

    it('sets removing class on connections when isRemoving is true', () => {
      // Setup connection first
      const exitElement = document.createElement('div');
      exitElement.id = 'exit-1';
      exitElement.className = 'exit';
      mockCanvas.appendChild(exitElement);

      const nodeElement = document.createElement('div');
      nodeElement.id = 'node-1';
      nodeElement.className = 'node';
      mockCanvas.appendChild(nodeElement);

      plumber.makeSource('exit-1');
      plumber.makeTarget('node-1');
      plumber.connectIds('test', 'exit-1', 'node-1');
      clock.tick(51);

      const connection = mockCanvas.querySelector('.connection');
      expect(connection?.classList.contains('removing')).to.be.false;

      const result = plumber.setConnectionRemovingState('exit-1', true);
      expect(result).to.be.true;
      expect(connection?.classList.contains('removing')).to.be.true;
    });

    it('removes removing class from connections when isRemoving is false', () => {
      // Setup connection
      const exitElement = document.createElement('div');
      exitElement.id = 'exit-1';
      exitElement.className = 'exit';
      mockCanvas.appendChild(exitElement);

      const nodeElement = document.createElement('div');
      nodeElement.id = 'node-1';
      nodeElement.className = 'node';
      mockCanvas.appendChild(nodeElement);

      plumber.makeSource('exit-1');
      plumber.makeTarget('node-1');
      plumber.connectIds('test', 'exit-1', 'node-1');
      clock.tick(51);

      const connection = mockCanvas.querySelector('.connection');
      plumber.setConnectionRemovingState('exit-1', true);
      expect(connection?.classList.contains('removing')).to.be.true;

      const result = plumber.setConnectionRemovingState('exit-1', false);
      expect(result).to.be.true;
      expect(connection?.classList.contains('removing')).to.be.false;
    });
  });

  describe('connectIds and processPendingConnections', () => {
    it('creates connection after debounce timeout', () => {
      const exitElement = document.createElement('div');
      exitElement.id = 'exit-1';
      exitElement.className = 'exit';
      mockCanvas.appendChild(exitElement);

      const nodeElement = document.createElement('div');
      nodeElement.id = 'node-1';
      nodeElement.className = 'node';
      mockCanvas.appendChild(nodeElement);

      plumber.makeSource('exit-1');
      plumber.makeTarget('node-1');

      // Call connectIds
      plumber.connectIds('test-node', 'exit-1', 'node-1');

      // Connection shouldn't exist yet
      let connection = mockCanvas.querySelector('.connection');
      expect(connection).to.not.exist;

      // Advance timer to trigger the timeout
      clock.tick(51); // Just past the 50ms timeout

      // Now connection should exist
      connection = mockCanvas.querySelector('.connection');
      expect(connection).to.exist;
      expect(connection?.getAttribute('data-source')).to.equal('exit-1');
      expect(connection?.getAttribute('data-target')).to.equal('node-1');
    });

    it('clears previous timeout when called multiple times', () => {
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
  });

  describe('removeExitConnection', () => {
    it('removes connections for an exit', () => {
      // Setup connection first
      const exitElement = document.createElement('div');
      exitElement.id = 'exit-1';
      exitElement.className = 'exit';
      mockCanvas.appendChild(exitElement);

      const nodeElement = document.createElement('div');
      nodeElement.id = 'node-1';
      nodeElement.className = 'node';
      mockCanvas.appendChild(nodeElement);

      plumber.makeSource('exit-1');
      plumber.makeTarget('node-1');
      plumber.connectIds('test', 'exit-1', 'node-1');
      clock.tick(51);

      let connection = mockCanvas.querySelector('.connection');
      expect(connection).to.exist;

      const result = plumber.removeExitConnection('exit-1');

      expect(result).to.be.true;
      connection = mockCanvas.querySelector('.connection');
      expect(connection).to.not.exist;
    });

    it('returns false when no connections exist', () => {
      const exitElement = document.createElement('div');
      exitElement.id = 'exit-1';
      mockCanvas.appendChild(exitElement);

      const result = plumber.removeExitConnection('exit-1');

      expect(result).to.be.false;
    });
  });

  describe('removeNodeConnections', () => {
    it('removes all connections related to a node', () => {
      // Create node with exits
      const nodeElement = document.createElement('div');
      nodeElement.id = 'node-1';
      nodeElement.className = 'node';
      mockCanvas.appendChild(nodeElement);

      const exit1 = document.createElement('div');
      exit1.id = 'exit-1';
      exit1.className = 'exit';
      nodeElement.appendChild(exit1);

      const targetNode = document.createElement('div');
      targetNode.id = 'node-2';
      targetNode.className = 'node';
      mockCanvas.appendChild(targetNode);

      plumber.makeSource('exit-1');
      plumber.makeTarget('node-2');
      plumber.connectIds('test', 'exit-1', 'node-2');
      clock.tick(51);

      let connection = mockCanvas.querySelector('.connection');
      expect(connection).to.exist;

      // Remove all connections for node-1
      plumber.removeNodeConnections('node-1');

      connection = mockCanvas.querySelector('.connection');
      expect(connection).to.not.exist;
    });
  });
});
