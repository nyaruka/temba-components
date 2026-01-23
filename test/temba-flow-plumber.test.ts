import { expect } from '@open-wc/testing';
import { Plumber, SOURCE_DEFAULTS, TARGET_DEFAULTS } from '../src/flow/Plumber';
import { stub, useFakeTimers, SinonFakeTimers } from 'sinon';

describe('Plumber', () => {
  let plumber: Plumber;
  let mockCanvas: HTMLElement;
  let clock: SinonFakeTimers;
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Use fake timers to control setTimeout
    clock = useFakeTimers();

    // Create mock canvas
    mockCanvas = document.createElement('div');
    document.body.appendChild(mockCanvas);

    // Create mock elements with IDs
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    mockCanvas.appendChild(mockElement);

    // Create a mock editor with fireCustomEvent
    const mockEditor = { fireCustomEvent: stub() };

    // Create a new plumber instance
    plumber = new Plumber(mockCanvas, mockEditor);
  });

  afterEach(() => {
    // Clean up
    if (plumber) {
      plumber.destroy();
    }
    document.body.removeChild(mockCanvas);
    clock.restore();
  });

  describe('constructor', () => {
    it('creates a new plumber instance', () => {
      expect(plumber).to.be.instanceOf(Plumber);
    });

    it('creates SVG container in canvas', () => {
      const svg = mockCanvas.querySelector('svg');
      expect(svg).to.exist;
      expect(svg?.classList.contains('connections-svg')).to.be.true;
    });
  });

  describe('makeTarget', () => {
    it('marks element as target', () => {
      plumber.makeTarget('test-element');
      expect(mockElement.dataset.isTarget).to.equal('true');
    });
  });

  describe('makeSource', () => {
    it('marks element as source and adds class', () => {
      plumber.makeSource('test-element');
      expect(mockElement.dataset.isSource).to.equal('true');
      expect(mockElement.classList.contains('plumb-source')).to.be.true;
    });
  });

  describe('connectIds', () => {
    it('creates connection between source and target', () => {
      const exitElement = document.createElement('div');
      exitElement.id = 'exit-1';
      exitElement.className = 'exit';
      exitElement.style.cssText =
        'position: absolute; left: 100px; top: 100px; width: 50px; height: 30px;';
      mockCanvas.appendChild(exitElement);

      const nodeElement = document.createElement('div');
      nodeElement.id = 'node-1';
      nodeElement.className = 'node';
      nodeElement.style.cssText =
        'position: absolute; left: 300px; top: 200px; width: 200px; height: 100px;';
      mockCanvas.appendChild(nodeElement);

      plumber.makeSource('exit-1');
      plumber.makeTarget('node-1');
      plumber.connectIds('test-scope', 'exit-1', 'node-1');

      // Advance timer to process pending connections
      clock.tick(51);

      // Check SVG connection was created
      const svg = mockCanvas.querySelector('svg');
      const connection = svg?.querySelector('.connection');
      expect(connection).to.exist;
      expect(connection?.getAttribute('data-source')).to.equal('exit-1');
      expect(connection?.getAttribute('data-target')).to.equal('node-1');
    });
  });

  describe('removeExitConnection', () => {
    it('removes connection for exit', () => {
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

      // Verify connection exists
      let connection = mockCanvas.querySelector('.connection');
      expect(connection).to.exist;

      // Remove connection
      const removed = plumber.removeExitConnection('exit-1');
      expect(removed).to.be.true;

      // Verify connection is gone
      connection = mockCanvas.querySelector('.connection');
      expect(connection).to.not.exist;
    });

    it('returns false when no connection exists', () => {
      const exitElement = document.createElement('div');
      exitElement.id = 'exit-1';
      mockCanvas.appendChild(exitElement);

      const removed = plumber.removeExitConnection('exit-1');
      expect(removed).to.be.false;
    });
  });

  describe('setConnectionRemovingState', () => {
    it('adds removing class to connection', () => {
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
      expect(connection?.classList.contains('removing')).to.be.false;

      // Set removing state
      plumber.setConnectionRemovingState('exit-1', true);
      expect(connection?.classList.contains('removing')).to.be.true;

      // Clear removing state
      plumber.setConnectionRemovingState('exit-1', false);
      expect(connection?.classList.contains('removing')).to.be.false;
    });

    it('returns false when no connection exists', () => {
      const exitElement = document.createElement('div');
      exitElement.id = 'exit-1';
      mockCanvas.appendChild(exitElement);

      const result = plumber.setConnectionRemovingState('exit-1', true);
      expect(result).to.be.false;
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
