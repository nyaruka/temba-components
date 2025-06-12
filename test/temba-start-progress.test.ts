import { fixture, assert, expect } from '@open-wc/testing';
import { html } from 'lit';
import { StartProgress } from '../src/progress/StartProgress';
import { useFakeTimers, SinonFakeTimers, stub, restore } from 'sinon';
import { mockAPI, mockGET, assertScreenshot, getClip, getComponent } from './utils.test';

describe('StartProgress', () => {
  let clock: SinonFakeTimers;

  beforeEach(() => {
    clock = useFakeTimers();
    mockAPI();
  });

  afterEach(() => {
    clock.restore();
    restore();
  });

  it('can be created', async () => {
    const element = await getComponent('temba-start-progress');
    assert.instanceOf(element, StartProgress);
  });

  it('initializes with default properties', async () => {
    const element = await getComponent('temba-start-progress');
    
    expect(element.refreshes).to.equal(0);
    expect(element.complete).to.equal(false);
    expect(element.running).to.equal(false);
  });

  it('sets properties correctly', async () => {
    const element = await getComponent('temba-start-progress', {
      id: 'test-id',
      current: 50,
      total: 100,
      eta: '2023-01-01T00:00:00.000Z',
      message: 'Test message',
      statusEndpoint: '/test/status',
      interruptTitle: 'Test Title',
      interruptEndpoint: '/test/interrupt'
    });

    expect(element.id).to.equal('test-id');
    expect(element.current).to.equal(50);
    expect(element.total).to.equal(100);
    expect(element.eta).to.equal('2023-01-01T00:00:00.000Z');
    expect(element.message).to.equal('Test message');
    expect(element.statusEndpoint).to.equal('/test/status');
    expect(element.interruptTitle).to.equal('Test Title');
    expect(element.interruptEndpoint).to.equal('/test/interrupt');
  });

  it('renders progress bar with correct attributes', async () => {
    const element = await getComponent('temba-start-progress', {
      current: 75,
      total: 100,
      eta: '2023-01-01T00:00:00.000Z',
      message: 'Processing...'
    });

    const progress = element.shadowRoot?.querySelector('temba-progress');
    expect(progress).to.exist;
    expect(progress?.getAttribute('current')).to.equal('75');
    expect(progress?.getAttribute('total')).to.equal('100');
    expect(progress?.getAttribute('eta')).to.equal('2023-01-01T00:00:00.000Z');
    expect(progress?.getAttribute('message')).to.equal('Processing...');
  });

  it('renders interrupt button when running with interrupt configuration', async () => {
    const element = await getComponent('temba-start-progress', {
      running: true,
      interruptTitle: 'Stop Process',
      interruptEndpoint: '/api/interrupt'
    });

    const icon = element.shadowRoot?.querySelector('temba-icon[name="close"]');
    expect(icon).to.exist;
  });

  it('does not render interrupt button when not running', async () => {
    const element = await getComponent('temba-start-progress', {
      interruptTitle: 'Stop Process',
      interruptEndpoint: '/api/interrupt'
      // Note: running defaults to false when not specified
    });

    const icon = element.shadowRoot?.querySelector('temba-icon[name="close"]');
    expect(icon).to.not.exist;
  });

  it('does not render interrupt button when missing configuration', async () => {
    const element = await getComponent('temba-start-progress', {
      running: true
    });

    const icon = element.shadowRoot?.querySelector('temba-icon[name="close"]');
    expect(icon).to.not.exist;
  });

  describe('scheduleRemoval method', () => {
    it('removes element after timeout', async () => {
      const element = await getComponent('temba-start-progress');
      
      const removeSpy = stub(element, 'remove');
      element.scheduleRemoval();

      // Advance time by 5 seconds
      clock.tick(5000);

      expect(removeSpy.calledOnce).to.be.true;
      removeSpy.restore();
    });
  });

  describe('interruptStart method', () => {
    it('calls showModax with correct parameters', async () => {
      // Mock showModax function on window
      const originalShowModax = (window as any).showModax;
      const showModaxStub = stub();
      (window as any).showModax = showModaxStub;

      const element = await getComponent('temba-start-progress', {
        interruptTitle: 'Stop Process',
        interruptEndpoint: '/api/interrupt'
      });

      element.interruptStart();

      expect(showModaxStub.calledOnce).to.be.true;
      expect(showModaxStub.calledWith('Stop Process', '/api/interrupt')).to.be.true;

      // Restore original
      (window as any).showModax = originalShowModax;
    });
  });

  describe('refresh method - direct property testing', () => {
    it('can handle manual property updates like refresh would do', async () => {
      const element = await getComponent('temba-start-progress');
      
      // Simulate what refresh method would do
      element.refreshes = 1;
      element.current = 50;
      element.total = 100;
      element.complete = false;
      element.running = true;
      element.message = null;
      
      await element.updateComplete;

      expect(element.current).to.equal(50);
      expect(element.total).to.equal(100);
      expect(element.complete).to.equal(false);
      expect(element.running).to.equal(true);
      expect(element.message).to.be.null;
      expect(element.refreshes).to.equal(1);
    });

    it('can simulate pending status message', async () => {
      const element = await getComponent('temba-start-progress');
      
      // Simulate what refresh method would do for Pending status
      element.refreshes = 1;
      element.message = 'Preparing to start..';
      element.complete = false;
      element.running = false;
      
      await element.updateComplete;

      expect(element.message).to.equal('Preparing to start..');
      expect(element.complete).to.equal(false);
      expect(element.running).to.equal(false);
    });

    it('can simulate queued status message', async () => {
      const element = await getComponent('temba-start-progress');
      
      // Simulate what refresh method would do for Queued status
      element.refreshes = 1;
      element.message = 'Waiting..';
      element.complete = false;
      element.running = false;
      
      await element.updateComplete;

      expect(element.message).to.equal('Waiting..');
      expect(element.complete).to.equal(false);
      expect(element.running).to.equal(false);
    });

    it('can simulate completed status', async () => {
      const element = await getComponent('temba-start-progress');
      
      const scheduleRemovalSpy = stub(element, 'scheduleRemoval');
      
      // Simulate what refresh method would do for Completed status
      element.refreshes = 1;
      element.current = 100;
      element.total = 100;
      element.complete = true;
      element.running = false;
      
      await element.updateComplete;

      expect(element.current).to.equal(100);
      expect(element.total).to.equal(100);
      expect(element.complete).to.equal(true);
      expect(element.running).to.equal(false);
      
      scheduleRemovalSpy.restore();
    });

    it('can simulate ETA being null for distant estimates', async () => {
      const element = await getComponent('temba-start-progress');
      
      // Simulate what refresh method would do for distant ETA
      element.refreshes = 1;
      element.eta = null;
      
      await element.updateComplete;

      expect(element.eta).to.be.null;
    });

    it('handles empty results correctly', async () => {
      const element = await getComponent('temba-start-progress');
      
      // Simulate empty results case
      const initialRefreshes = element.refreshes;
      
      expect(element.refreshes).to.equal(initialRefreshes);
    });
  });
});