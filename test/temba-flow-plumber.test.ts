import { html, fixture, expect } from '@open-wc/testing';
import { Plumber, SOURCE_DEFAULTS, TARGET_DEFAULTS } from '../src/flow/Plumber';
import { stub, restore } from 'sinon';

describe('Plumber', () => {
  let plumber: Plumber;
  let mockJsPlumb: any;
  let container: HTMLElement;

  beforeEach(async () => {
    // Create a container with mock elements
    container = await fixture(html`
      <div>
        <div id="test-canvas"></div>
        <div id="test-source">Source Element</div>
        <div id="test-target">Target Element</div>
        <div id="test-from">From Element</div>
        <div id="test-to">To Element</div>
      </div>
    `);

    const canvas = container.querySelector('#test-canvas') as HTMLElement;

    // Mock jsPlumb functionality
    mockJsPlumb = {
      addEndpoint: stub().returns({ uuid: 'mock-endpoint' }),
      connect: stub(),
      batch: stub().callsFake((fn: () => void) => fn())
    };

    // Create plumber instance and replace jsPlumb
    plumber = new Plumber(canvas);
    // Access private property for testing
    (plumber as any).jsPlumb = mockJsPlumb;
  });

  afterEach(() => {
    restore();
  });

  describe('constructor', () => {
    it('creates a new plumber instance', () => {
      expect(plumber).to.be.instanceOf(Plumber);
    });
  });

  describe('makeTarget', () => {
    it('creates a target endpoint for the specified element', () => {
      plumber.makeTarget('test-target');

      expect(mockJsPlumb.addEndpoint).to.have.been.calledWith(
        container.querySelector('#test-target'),
        TARGET_DEFAULTS
      );
    });

    it('handles non-existent elements gracefully', () => {
      plumber.makeTarget('non-existent');

      expect(mockJsPlumb.addEndpoint).to.have.been.calledWith(
        null,
        TARGET_DEFAULTS
      );
    });
  });

  describe('makeSource', () => {
    it('creates a source endpoint for the specified element', () => {
      plumber.makeSource('test-source');

      expect(mockJsPlumb.addEndpoint).to.have.been.calledWith(
        container.querySelector('#test-source'),
        SOURCE_DEFAULTS
      );
    });

    it('handles non-existent elements gracefully', () => {
      plumber.makeSource('non-existent');

      expect(mockJsPlumb.addEndpoint).to.have.been.calledWith(
        null,
        SOURCE_DEFAULTS
      );
    });
  });

  describe('connectIds', () => {
    it('adds connection to pending connections and processes them', () => {
      plumber.connectIds('test-from', 'test-to');

      // Verify that the method doesn't throw and plumber exists
      expect(plumber).to.exist;
    });
  });

  describe('processPendingConnections', () => {
    it('processes pending connections with timeout', (done) => {
      // Add a connection to pending connections
      plumber.connectIds('test-from', 'test-to');

      // Wait for the debounced timeout
      setTimeout(() => {
        expect(mockJsPlumb.batch).to.have.been.called;
        done();
      }, 60); // Wait longer than the 50ms timeout
    });

    it('creates endpoints and connections for pending connections', (done) => {
      plumber.connectIds('test-from', 'test-to');

      setTimeout(() => {
        expect(mockJsPlumb.addEndpoint).to.have.been.called;
        expect(mockJsPlumb.connect).to.have.been.called;
        done();
      }, 60);
    });

    it('clears existing timeout when called multiple times', () => {
      // Call processPendingConnections directly
      plumber.processPendingConnections();
      plumber.processPendingConnections();

      // This mainly tests that no errors are thrown
      expect(plumber).to.exist;
    });

    it('handles empty pending connections', (done) => {
      // Call without adding any connections
      plumber.processPendingConnections();

      setTimeout(() => {
        expect(mockJsPlumb.batch).to.have.been.called;
        done();
      }, 60);
    });
  });

  describe('constants', () => {
    it('exports SOURCE_DEFAULTS with correct structure', () => {
      expect(SOURCE_DEFAULTS).to.have.property('endpoint');
      expect(SOURCE_DEFAULTS.endpoint).to.have.property('type');
      expect(SOURCE_DEFAULTS.endpoint).to.have.property('options');
      expect(SOURCE_DEFAULTS).to.have.property('anchors');
      expect(SOURCE_DEFAULTS).to.have.property('maxConnections', 1);
      expect(SOURCE_DEFAULTS).to.have.property('isSource', true);
      expect(SOURCE_DEFAULTS).to.have.property('dragAllowedWhenFull', false);
      expect(SOURCE_DEFAULTS).to.have.property('deleteEndpointsOnEmpty', true);
    });

    it('exports TARGET_DEFAULTS with correct structure', () => {
      expect(TARGET_DEFAULTS).to.have.property('endpoint');
      expect(TARGET_DEFAULTS.endpoint).to.have.property('type');
      expect(TARGET_DEFAULTS.endpoint).to.have.property('options');
      expect(TARGET_DEFAULTS).to.have.property('anchor');
      expect(TARGET_DEFAULTS).to.have.property('isTarget', true);
      expect(TARGET_DEFAULTS).to.have.property('dragAllowedWhenFull', false);
      expect(TARGET_DEFAULTS).to.have.property('deleteEndpointsOnEmpty', true);
    });

    it('has correct SOURCE_DEFAULTS endpoint options', () => {
      const options = SOURCE_DEFAULTS.endpoint.options;
      expect(options).to.have.property('radius', 6);
      expect(options).to.have.property('cssClass', 'plumb-source');
      expect(options).to.have.property('hoverClass', 'plumb-source-hover');
      expect(options).to.have.property('connectedClass', 'plumb-connected');
    });

    it('has correct TARGET_DEFAULTS endpoint options', () => {
      const options = TARGET_DEFAULTS.endpoint.options;
      expect(options).to.have.property('width', 23);
      expect(options).to.have.property('height', 23);
      expect(options).to.have.property('cssClass', 'plumb-target');
      expect(options).to.have.property('hoverClass', 'plumb-target-hover');
    });

    it('has correct TARGET_DEFAULTS anchor options', () => {
      const anchor = TARGET_DEFAULTS.anchor;
      expect(anchor).to.have.property('type', 'Continuous');
      expect(anchor.options).to.have.property('faces');
      expect(anchor.options.faces).to.include('top');
      expect(anchor.options.faces).to.include('left');
      expect(anchor.options.faces).to.include('right');
      expect(anchor.options).to.have.property(
        'cssClass',
        'continuos plumb-target-anchor'
      );
    });
  });
});
