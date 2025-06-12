import { fixture, assert, expect } from '@open-wc/testing';
import { FlowStoreElement } from '../src/store/FlowStoreElement';
import { getComponent, mockAPI, mockGET } from './utils.test';
import { FlowDetails } from '../src/interfaces';

describe('FlowStoreElement', () => {
  beforeEach(() => {
    mockAPI();
  });

  it('can be created', async () => {
    const element = await getComponent('temba-flow-details') as FlowStoreElement;
    assert.instanceOf(element, FlowStoreElement);
  });

  it('initializes with default properties', async () => {
    const element = await getComponent('temba-flow-details') as FlowStoreElement;
    
    expect(element.flow).to.be.undefined;
    expect(element.data).to.be.undefined;
    expect(element.endpoint).to.equal('/api/v2/flows.json?uuid=');
    // url might be undefined initially
    expect(element.url == null).to.be.true;
  });

  it('sets properties correctly', async () => {
    const element = await getComponent('temba-flow-details', {
      flow: 'test-flow-uuid',
      endpoint: '/custom/flows.json?uuid='
    }) as FlowStoreElement;

    expect(element.flow).to.equal('test-flow-uuid');
    expect(element.endpoint).to.equal('/custom/flows.json?uuid=');
  });

  describe('updated method', () => {
    it('sets url when flow is provided', async () => {
      const element = await getComponent('temba-flow-details') as FlowStoreElement;
      
      element.flow = 'test-flow-123';
      await element.updateComplete;

      expect(element.url).to.equal('/api/v2/flows.json?uuid=test-flow-123');
    });

    it('sets url to null when flow is empty', async () => {
      const element = await getComponent('temba-flow-details', {
        flow: 'initial-flow'
      }) as FlowStoreElement;
      
      // Verify initial state
      expect(element.url).to.equal('/api/v2/flows.json?uuid=initial-flow');
      
      // Clear the flow
      element.flow = '';
      await element.updateComplete;

      expect(element.url).to.be.null;
    });

    it('sets url to null when flow is null', async () => {
      const element = await getComponent('temba-flow-details', {
        flow: 'initial-flow'
      }) as FlowStoreElement;
      
      // Clear the flow to null
      element.flow = null;
      await element.updateComplete;

      expect(element.url).to.be.null;
    });

    it('updates url when flow changes', async () => {
      const element = await getComponent('temba-flow-details', {
        flow: 'flow-1'
      }) as FlowStoreElement;
      
      expect(element.url).to.equal('/api/v2/flows.json?uuid=flow-1');
      
      element.flow = 'flow-2';
      await element.updateComplete;

      expect(element.url).to.equal('/api/v2/flows.json?uuid=flow-2');
    });

    it('uses custom endpoint when provided', async () => {
      const element = await getComponent('temba-flow-details', {
        endpoint: '/custom/endpoint?id=',
        flow: 'test-flow'
      }) as FlowStoreElement;

      expect(element.url).to.equal('/custom/endpoint?id=test-flow');
    });
  });

  describe('prepareData method', () => {
    it('returns first item from array if data has length', async () => {
      const element = await getComponent('temba-flow-details') as FlowStoreElement;
      
      const inputData = [
        { uuid: 'flow-1', name: 'Test Flow 1' },
        { uuid: 'flow-2', name: 'Test Flow 2' }
      ];

      const result = element.prepareData(inputData);
      
      expect(result).to.deep.equal({ uuid: 'flow-1', name: 'Test Flow 1' });
    });

    it('returns data as-is if not an array', async () => {
      const element = await getComponent('temba-flow-details') as FlowStoreElement;
      
      const inputData = { uuid: 'flow-1', name: 'Test Flow' };

      const result = element.prepareData(inputData);
      
      expect(result).to.deep.equal(inputData);
    });

    it('returns data as-is if array is empty', async () => {
      const element = await getComponent('temba-flow-details') as FlowStoreElement;
      
      const inputData = [];

      const result = element.prepareData(inputData);
      
      expect(result).to.deep.equal([]);
    });

    it('returns null if data is null', async () => {
      const element = await getComponent('temba-flow-details') as FlowStoreElement;
      
      const result = element.prepareData(null);
      
      expect(result).to.be.null;
    });

    it('returns undefined if data is undefined', async () => {
      const element = await getComponent('temba-flow-details') as FlowStoreElement;
      
      const result = element.prepareData(undefined);
      
      expect(result).to.be.undefined;
    });
  });

  describe('render method', () => {
    it('returns undefined when no data is available', async () => {
      const element = await getComponent('temba-flow-details') as FlowStoreElement;
      
      const result = element.render();
      
      expect(result).to.be.undefined;
    });

    it('renders div when data is available', async () => {
      const element = await getComponent('temba-flow-details') as FlowStoreElement;
      
      element.data = { uuid: 'test-flow', name: 'Test Flow' } as FlowDetails;
      await element.updateComplete;

      const result = element.render();
      
      expect(result).to.exist;
    });

    it('renders empty div in DOM when data is set', async () => {
      const element = await getComponent('temba-flow-details') as FlowStoreElement;
      
      element.data = { uuid: 'test-flow', name: 'Test Flow' } as FlowDetails;
      await element.updateComplete;

      const div = element.shadowRoot?.querySelector('div');
      expect(div).to.exist;
    });
  });

  describe('integration tests', () => {
    it('handles flow property change workflow without triggering store', async () => {
      const element = await getComponent('temba-flow-details') as FlowStoreElement;
      
      // Initially no flow or data
      expect(element.flow).to.be.undefined;
      expect(element.data).to.be.undefined;
      // url might be undefined initially
      expect(element.url == null).to.be.true;
      
      // Simulate data being set directly (without triggering store)
      const mockFlowData = { uuid: 'integration-test-flow', name: 'Integration Test Flow' };
      element.data = mockFlowData as FlowDetails;
      await element.updateComplete;
      
      // Should be able to render
      const result = element.render();
      expect(result).to.exist;
    });
  });
});