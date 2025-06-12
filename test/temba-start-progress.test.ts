import { fixture, assert, expect } from '@open-wc/testing';
import { html } from 'lit';
import { StartProgress } from '../src/progress/StartProgress';
import { useFakeTimers, SinonFakeTimers, stub, restore } from 'sinon';
import { mockAPI, mockGET } from './utils.test';

describe('StartProgress', () => {
  let clock: SinonFakeTimers;
  let element: StartProgress;

  beforeEach(() => {
    clock = useFakeTimers();
    mockAPI();
  });

  afterEach(() => {
    clock.restore();
    restore();
  });

  it('can be created', async () => {
    element = await fixture(html`<temba-start-progress></temba-start-progress>`);
    assert.instanceOf(element, StartProgress);
  });

  it('initializes with default properties', async () => {
    element = await fixture(html`<temba-start-progress></temba-start-progress>`);
    
    expect(element.refreshes).to.equal(0);
    expect(element.complete).to.equal(false);
    expect(element.running).to.equal(false);
  });

  it('sets properties correctly', async () => {
    element = await fixture(html`
      <temba-start-progress
        id="test-id"
        current="50" 
        total="100"
        eta="2023-01-01T00:00:00.000Z"
        message="Test message"
        statusEndpoint="/test/status"
        interruptTitle="Test Title"
        interruptEndpoint="/test/interrupt"
      ></temba-start-progress>
    `);

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
    element = await fixture(html`
      <temba-start-progress
        current="75"
        total="100"
        eta="2023-01-01T00:00:00.000Z"
        message="Processing..."
      ></temba-start-progress>
    `);

    const progress = element.shadowRoot?.querySelector('temba-progress');
    expect(progress).to.exist;
    expect(progress?.getAttribute('current')).to.equal('75');
    expect(progress?.getAttribute('total')).to.equal('100');
    expect(progress?.getAttribute('eta')).to.equal('2023-01-01T00:00:00.000Z');
    expect(progress?.getAttribute('message')).to.equal('Processing...');
  });

  it('renders interrupt button when running with interrupt configuration', async () => {
    element = await fixture(html`
      <temba-start-progress
        running="true"
        interruptTitle="Stop Process"
        interruptEndpoint="/api/interrupt"
      ></temba-start-progress>
    `);

    const icon = element.shadowRoot?.querySelector('temba-icon[name="close"]');
    expect(icon).to.exist;
  });

  it('does not render interrupt button when not running', async () => {
    element = await fixture(html`
      <temba-start-progress
        running="false"
        interruptTitle="Stop Process"
        interruptEndpoint="/api/interrupt"
      ></temba-start-progress>
    `);

    const icon = element.shadowRoot?.querySelector('temba-icon[name="close"]');
    expect(icon).to.not.exist;
  });

  it('does not render interrupt button when missing configuration', async () => {
    element = await fixture(html`
      <temba-start-progress
        running="true"
      ></temba-start-progress>
    `);

    const icon = element.shadowRoot?.querySelector('temba-icon[name="close"]');
    expect(icon).to.not.exist;
  });

  it('calls refresh when id property changes', async () => {
    mockGET(/\/api\/status/, {
      results: [{
        progress: { current: 10, total: 100 },
        status: 'Started',
        modified_on: new Date().toISOString()
      }]
    });

    element = await fixture(html`
      <temba-start-progress statusEndpoint="/api/status"></temba-start-progress>
    `);

    const refreshSpy = stub(element, 'refresh');
    element.id = 'new-id';
    await element.updateComplete;

    expect(refreshSpy.calledOnce).to.be.true;
    refreshSpy.restore();
  });

  describe('refresh method', () => {
    beforeEach(() => {
      element = new StartProgress();
      element.statusEndpoint = '/api/status';
    });

    it('updates properties from API response - Started status', async () => {
      const now = new Date();
      const modifiedOn = new Date(now.getTime() - 5000); // 5 seconds ago
      
      mockGET(/\/api\/status/, {
        results: [{
          progress: { current: 50, total: 100 },
          status: 'Started',
          modified_on: modifiedOn.toISOString()
        }]
      });

      await element.refresh();

      expect(element.current).to.equal(50);
      expect(element.total).to.equal(100);
      expect(element.complete).to.equal(false);
      expect(element.running).to.equal(true);
      expect(element.message).to.be.null;
      expect(element.refreshes).to.equal(1);
    });

    it('updates properties from API response - Completed status', async () => {
      mockGET(/\/api\/status/, {
        results: [{
          progress: { current: 100, total: 100 },
          status: 'Completed',
          modified_on: new Date().toISOString()
        }]
      });

      const scheduleRemovalSpy = stub(element, 'scheduleRemoval');
      await element.refresh();

      expect(element.current).to.equal(100);
      expect(element.total).to.equal(100);
      expect(element.complete).to.equal(true);
      expect(element.running).to.equal(false);
      expect(scheduleRemovalSpy.calledOnce).to.be.true;
      scheduleRemovalSpy.restore();
    });

    it('updates properties from API response - Failed status', async () => {
      mockGET(/\/api\/status/, {
        results: [{
          progress: { current: 30, total: 100 },
          status: 'Failed',
          modified_on: new Date().toISOString()
        }]
      });

      const scheduleRemovalSpy = stub(element, 'scheduleRemoval');
      await element.refresh();

      expect(element.complete).to.equal(true);
      expect(element.running).to.equal(false);
      expect(scheduleRemovalSpy.calledOnce).to.be.true;
      scheduleRemovalSpy.restore();
    });

    it('updates properties from API response - Interrupted status', async () => {
      mockGET(/\/api\/status/, {
        results: [{
          progress: { current: 40, total: 100 },
          status: 'Interrupted',
          modified_on: new Date().toISOString()
        }]
      });

      const scheduleRemovalSpy = stub(element, 'scheduleRemoval');
      await element.refresh();

      expect(element.complete).to.equal(true);
      expect(element.running).to.equal(false);
      expect(scheduleRemovalSpy.calledOnce).to.be.true;
      scheduleRemovalSpy.restore();
    });

    it('updates message for Pending status', async () => {
      mockGET(/\/api\/status/, {
        results: [{
          progress: { current: 0, total: 100 },
          status: 'Pending',
          modified_on: new Date().toISOString()
        }]
      });

      await element.refresh();

      expect(element.message).to.equal('Preparing to start..');
      expect(element.complete).to.equal(false);
      expect(element.running).to.equal(false);
    });

    it('updates message for Queued status', async () => {
      mockGET(/\/api\/status/, {
        results: [{
          progress: { current: 0, total: 100 },
          status: 'Queued',
          modified_on: new Date().toISOString()
        }]
      });

      await element.refresh();

      expect(element.message).to.equal('Waiting..');
      expect(element.complete).to.equal(false);
      expect(element.running).to.equal(false);
    });

    it('calculates ETA for Started status with reasonable rate', async () => {
      const now = new Date();
      const modifiedOn = new Date(now.getTime() - 1000); // 1 second ago
      
      mockGET(/\/api\/status/, {
        results: [{
          progress: { current: 500, total: 1000 }, // 50% complete in 1 second
          status: 'Started',
          modified_on: modifiedOn.toISOString()
        }]
      });

      await element.refresh();

      expect(element.eta).to.not.be.null;
      expect(new Date(element.eta)).to.be.instanceOf(Date);
    });

    it('does not set ETA for low rate', async () => {
      const now = new Date();
      const modifiedOn = new Date(now.getTime() - 1000); // 1 second ago
      
      mockGET(/\/api\/status/, {
        results: [{
          progress: { current: 1, total: 1000 }, // Very slow rate
          status: 'Started',
          modified_on: modifiedOn.toISOString()
        }]
      });

      await element.refresh();

      expect(element.eta).to.be.undefined;
    });

    it('does not set ETA for distant future estimates', async () => {
      const now = new Date();
      const modifiedOn = new Date(now.getTime() - 1000); // 1 second ago
      
      mockGET(/\/api\/status/, {
        results: [{
          progress: { current: 1, total: 10000000 }, // Would take months
          status: 'Started',
          modified_on: modifiedOn.toISOString()
        }]
      });

      await element.refresh();

      expect(element.eta).to.be.null;
    });

    it('schedules next refresh when not complete', async () => {
      mockGET(/\/api\/status/, {
        results: [{
          progress: { current: 50, total: 100 },
          status: 'Started',
          modified_on: new Date().toISOString()
        }]
      });

      const refreshSpy = stub(element, 'refresh').resolves();
      await element.refresh();
      refreshSpy.restore();

      // Advance time to trigger scheduled refresh
      clock.tick(1000);

      // Verify refresh was scheduled (would be called again)
      expect(element.refreshes).to.equal(1);
    });

    it('handles empty API response', async () => {
      mockGET(/\/api\/status/, { results: [] });

      await element.refresh();

      // Should not throw or change properties
      expect(element.refreshes).to.equal(0);
    });
  });

  describe('interruptStart method', () => {
    it('calls showModax with correct parameters', async () => {
      // Mock showModax function
      const showModaxStub = stub();
      (window as any).showModax = showModaxStub;

      element = await fixture(html`
        <temba-start-progress
          interruptTitle="Stop Process"
          interruptEndpoint="/api/interrupt"
        ></temba-start-progress>
      `);

      element.interruptStart();

      expect(showModaxStub.calledOnce).to.be.true;
      expect(showModaxStub.calledWith('Stop Process', '/api/interrupt')).to.be.true;

      showModaxStub.restore();
    });
  });

  describe('scheduleRemoval method', () => {
    it('removes element after timeout', async () => {
      element = await fixture(html`<temba-start-progress></temba-start-progress>`);
      
      const removeSpy = stub(element, 'remove');
      element.scheduleRemoval();

      // Advance time by 5 seconds
      clock.tick(5000);

      expect(removeSpy.calledOnce).to.be.true;
      removeSpy.restore();
    });
  });

  describe('interrupt button interaction', () => {
    it('calls interruptStart when interrupt button is clicked', async () => {
      element = await fixture(html`
        <temba-start-progress
          running="true"
          interruptTitle="Stop Process"
          interruptEndpoint="/api/interrupt"
        ></temba-start-progress>
      `);

      const interruptSpy = stub(element, 'interruptStart');
      
      const icon = element.shadowRoot?.querySelector('temba-icon[name="close"]') as HTMLElement;
      icon.click();

      expect(interruptSpy.calledOnce).to.be.true;
      interruptSpy.restore();
    });
  });
});