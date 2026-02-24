import { expect } from '@open-wc/testing';
import { split_by_webhook } from '../../src/flow/nodes/split_by_webhook';
import { Node, CallWebhook } from '../../src/store/flow-definition';
import { NodeTest } from '../NodeHelper';

/**
 * Test suite for the split_by_webhook node configuration.
 */
describe('split_by_webhook node config', () => {
  const helper = new NodeTest(split_by_webhook, 'split_by_webhook');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct type and name', () => {
      expect(split_by_webhook.type).to.equal('split_by_webhook');
      expect(split_by_webhook.name).to.equal('Call Webhook');
    });
  });

  describe('round-trip transformation', () => {
    it('should transform from flow definition to form data', () => {
      const node: Node = {
        uuid: 'test-node',
        actions: [
          {
            type: 'call_webhook',
            uuid: 'action-1',
            method: 'POST',
            url: 'https://example.com/webhook',
            headers: { Authorization: 'Bearer token123' },
            body: '{"key": "value"}'
          } as CallWebhook
        ],
        exits: []
      };

      const formData = split_by_webhook.toFormData!(node);

      expect(formData.uuid).to.equal('test-node');
      expect(formData.method).to.equal('POST');
      expect(formData.url).to.equal('https://example.com/webhook');
      expect(formData.headers).to.deep.equal({ Authorization: 'Bearer token123' });
      expect(formData.body).to.equal('{"key": "value"}');
    });

    it('should transform from form data to flow definition (GET)', () => {
      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        exits: []
      };

      const formData = {
        uuid: 'test-node',
        method: [{ value: 'GET', name: 'GET' }],
        url: 'https://example.com/api',
        headers: [],
        body: ''
      };

      const resultNode = split_by_webhook.fromFormData!(
        formData,
        originalNode
      );

      expect(resultNode.uuid).to.equal('test-node');
      expect(resultNode.actions).to.have.lengthOf(1);
      expect(resultNode.actions![0].type).to.equal('call_webhook');

      const action = resultNode.actions![0] as any;
      expect(action.method).to.equal('GET');
      expect(action.url).to.equal('https://example.com/api');

      // Should have Success/Failure router
      expect(resultNode.router).to.exist;
      expect(resultNode.router!.type).to.equal('switch');
      expect(resultNode.exits).to.have.lengthOf(2);
    });

    it('should transform from form data to flow definition (POST)', () => {
      const originalNode: Node = {
        uuid: 'test-node',
        actions: [],
        exits: []
      };

      const formData = {
        uuid: 'test-node',
        method: [{ value: 'POST', name: 'POST' }],
        url: 'https://example.com/webhook',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        body: '{"data": "@contact.name"}'
      };

      const resultNode = split_by_webhook.fromFormData!(
        formData,
        originalNode
      );

      const action = resultNode.actions![0] as any;
      expect(action.method).to.equal('POST');
      expect(action.url).to.equal('https://example.com/webhook');
      expect(action.headers).to.have.lengthOf(1);
      expect(action.body).to.equal('{"data": "@contact.name"}');
    });

    it('should preserve action UUID on re-save', () => {
      const originalNode: Node = {
        uuid: 'test-node',
        actions: [
          {
            type: 'call_webhook',
            uuid: 'existing-action-uuid',
            method: 'GET',
            url: 'https://example.com/old'
          } as CallWebhook
        ],
        exits: []
      };

      const formData = {
        uuid: 'test-node',
        method: [{ value: 'GET', name: 'GET' }],
        url: 'https://example.com/new',
        headers: [],
        body: ''
      };

      const resultNode = split_by_webhook.fromFormData!(
        formData,
        originalNode
      );

      expect(resultNode.actions![0].uuid).to.equal('existing-action-uuid');
    });
  });
});
