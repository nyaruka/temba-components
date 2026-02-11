import { expect } from '@open-wc/testing';
import { Plumber, calculateFlowchartPath } from '../src/flow/Plumber';
import { stub, useFakeTimers, SinonFakeTimers } from 'sinon';

describe('Plumber', () => {
  let plumber: Plumber;
  let mockCanvas: HTMLElement;
  let clock: SinonFakeTimers;
  let mockElement: HTMLElement;

  beforeEach(() => {
    clock = useFakeTimers();

    mockCanvas = document.createElement('div');
    mockCanvas.id = 'canvas';
    document.body.appendChild(mockCanvas);

    mockElement = document.createElement('div');
    mockElement.id = 'test-exit';
    mockCanvas.appendChild(mockElement);

    const mockEditor = { fireCustomEvent: stub() };
    plumber = new Plumber(mockCanvas, mockEditor);
  });

  afterEach(() => {
    mockCanvas.remove();
    clock.restore();
  });

  describe('constructor', () => {
    it('creates a new plumber instance', () => {
      expect(plumber).to.be.instanceOf(Plumber);
    });
  });

  describe('makeSource', () => {
    it('registers a mousedown listener on the exit element', () => {
      const exitEl = document.createElement('div');
      exitEl.id = 'exit-1';
      mockCanvas.appendChild(exitEl);

      plumber.makeSource('exit-1');

      // Source should be tracked
      expect((plumber as any).sources.has('exit-1')).to.be.true;

      exitEl.remove();
    });

    it('cleans up previous listener when called again', () => {
      const exitEl = document.createElement('div');
      exitEl.id = 'exit-2';
      mockCanvas.appendChild(exitEl);

      plumber.makeSource('exit-2');
      plumber.makeSource('exit-2');

      expect((plumber as any).sources.has('exit-2')).to.be.true;

      exitEl.remove();
    });
  });

  describe('makeTarget', () => {
    it('is a no-op', () => {
      // Should not throw
      plumber.makeTarget('test-node');
    });
  });

  describe('connectIds', () => {
    it('adds connection to pending connections and processes them', () => {
      plumber.connectIds('test-node', 'test-from', 'test-to');
      expect((plumber as any).pendingConnections.length).to.equal(1);
    });
  });

  describe('processPendingConnections', () => {
    it('clears existing rAF when called multiple times', () => {
      const cancelSpy = stub(window, 'cancelAnimationFrame');
      const rafSpy = stub(window, 'requestAnimationFrame').returns(123 as any);

      plumber.processPendingConnections();
      plumber.processPendingConnections();

      expect(cancelSpy).to.have.been.calledOnce;
      expect(rafSpy).to.have.been.calledTwice;

      cancelSpy.restore();
      rafSpy.restore();
    });
  });

  describe('event system', () => {
    it('supports on/off/notify pattern', () => {
      let received = null;
      const handler = (info: any) => {
        received = info;
      };

      plumber.on('test-event', handler);
      (plumber as any).notifyListeners('test-event', { data: 'test' });
      expect(received).to.deep.equal({ data: 'test' });

      received = null;
      plumber.off('test-event', handler);
      (plumber as any).notifyListeners('test-event', { data: 'test2' });
      expect(received).to.be.null;
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      plumber.connectIds('test-node', 'test-from', 'test-to');
      plumber.reset();

      expect((plumber as any).pendingConnections.length).to.equal(0);
      expect((plumber as any).connections.size).to.equal(0);
      expect((plumber as any).sources.size).to.equal(0);
    });
  });
});

describe('calculateFlowchartPath', () => {
  it('generates a straight vertical path when source and target are aligned', () => {
    const path = calculateFlowchartPath(100, 0, 100, 100);
    expect(path).to.include('M 100 0');
    expect(path).to.include('L 100 100');
    // Should not contain Q (quadratic curve) for aligned points
    expect(path).to.not.include('Q');
  });

  it('generates a path with corners when source and target are offset', () => {
    const path = calculateFlowchartPath(50, 0, 150, 200);
    expect(path).to.include('M 50 0');
    expect(path).to.include('Q'); // Should have rounded corners
    expect(path).to.include('L 150 200');
  });

  it('handles custom stub and corner radius', () => {
    const path = calculateFlowchartPath(0, 0, 100, 100, 30, 15, 10);
    expect(path).to.include('M 0 0');
    expect(path).to.include('L 100 100');
  });

  it('handles cases where vertical space is tight by using reduced-radius corners', () => {
    // With stubs of 20+10=30, and only 35 total vertical space, there's only 5px for corners
    const path = calculateFlowchartPath(50, 0, 150, 35);
    expect(path).to.include('M 50 0');
    // Should still use rounded corners (L-shape with curves)
    expect(path).to.include('Q');
  });

  it('enforces midY is always below source exit for top face', () => {
    // Target above source — midY should not go above sourceY + stubStart
    const path = calculateFlowchartPath(50, 100, 150, 50);
    expect(path).to.include('M 50 100');
    // Should still exit downward with a curve at exitY (120)
    expect(path).to.include('Q');
  });

  it('generates a path entering from the left face', () => {
    const path = calculateFlowchartPath(50, 0, 150, 100, 20, 10, 5, 'left');
    expect(path).to.include('M 50 0');
    expect(path).to.include('L 150 100'); // ends at target
  });

  it('generates a path entering from the right face', () => {
    const path = calculateFlowchartPath(150, 0, 50, 100, 20, 10, 5, 'right');
    expect(path).to.include('M 150 0');
    expect(path).to.include('L 50 100'); // ends at target
  });
});
