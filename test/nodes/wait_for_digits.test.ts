import { expect } from '@open-wc/testing';
import { wait_for_digits } from '../../src/flow/nodes/wait_for_digits';
import { Node } from '../../src/store/flow-definition';
import { NodeTest } from '../NodeHelper';

/**
 * Test suite for the wait_for_digits node configuration.
 */
describe('wait_for_digits node config', () => {
  const helper = new NodeTest(wait_for_digits, 'wait_for_digits');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(wait_for_digits.name).to.equal('Wait for Digits');
    });

    it('has correct type', () => {
      expect(wait_for_digits.type).to.equal('wait_for_digits');
    });

    it('has correct group', () => {
      expect(wait_for_digits.group).to.exist;
    });

    it('is a simple node config without form or layout', () => {
      expect(wait_for_digits.form).to.be.undefined;
      expect(wait_for_digits.layout).to.be.undefined;
      expect(wait_for_digits.toFormData).to.be.undefined;
      expect(wait_for_digits.fromFormData).to.be.undefined;
    });
  });

  describe('node scenarios', () => {
    it('renders basic digits wait', async () => {
      await helper.testNode(
        {
          uuid: 'test-digits-node-1',
          actions: [],
          router: {
            type: 'switch',
            wait: {
              type: 'msg',
              hint: {
                type: 'digits',
                count: 4
              }
            },
            result_name: 'digits',
            categories: [
              {
                uuid: 'digits-cat-1',
                name: 'Has Number',
                exit_uuid: 'digits-exit-1'
              },
              {
                uuid: 'digits-cat-2',
                name: 'Other',
                exit_uuid: 'digits-exit-2'
              }
            ]
          },
          exits: [
            { uuid: 'digits-exit-1', destination_uuid: null },
            { uuid: 'digits-exit-2', destination_uuid: null }
          ]
        } as Node,
        { type: 'wait_for_digits' },
        'basic-digits-wait'
      );
    });

    it('renders single digit with timeout', async () => {
      await helper.testNode(
        {
          uuid: 'test-digits-node-2',
          actions: [],
          router: {
            type: 'switch',
            wait: {
              type: 'msg',
              hint: {
                type: 'digits',
                count: 1
              },
              timeout: {
                category_uuid: 'timeout-cat',
                seconds: 30
              }
            },
            result_name: 'pin_digit',
            categories: [
              {
                uuid: 'digits-cat-1',
                name: 'Has Number',
                exit_uuid: 'digits-exit-1'
              },
              {
                uuid: 'timeout-cat',
                name: 'No Response',
                exit_uuid: 'timeout-exit'
              },
              {
                uuid: 'digits-cat-2',
                name: 'Other',
                exit_uuid: 'digits-exit-2'
              }
            ]
          },
          exits: [
            { uuid: 'digits-exit-1', destination_uuid: null },
            { uuid: 'timeout-exit', destination_uuid: null },
            { uuid: 'digits-exit-2', destination_uuid: null }
          ]
        } as Node,
        { type: 'wait_for_digits' },
        'single-digit-with-timeout'
      );
    });

    it('renders phone number collection', async () => {
      await helper.testNode(
        {
          uuid: 'test-digits-node-3',
          actions: [],
          router: {
            type: 'switch',
            wait: {
              type: 'msg',
              hint: {
                type: 'digits',
                count: 10
              }
            },
            result_name: 'phone_number',
            categories: [
              {
                uuid: 'phone-cat-1',
                name: 'Valid Phone',
                exit_uuid: 'phone-exit-1'
              },
              {
                uuid: 'phone-cat-2',
                name: 'Invalid',
                exit_uuid: 'phone-exit-2'
              },
              { uuid: 'phone-cat-3', name: 'Other', exit_uuid: 'phone-exit-3' }
            ]
          },
          exits: [
            { uuid: 'phone-exit-1', destination_uuid: null },
            { uuid: 'phone-exit-2', destination_uuid: null },
            { uuid: 'phone-exit-3', destination_uuid: null }
          ]
        } as Node,
        { type: 'wait_for_digits' },
        'phone-number-collection'
      );
    });

    it('renders verification code', async () => {
      await helper.testNode(
        {
          uuid: 'test-digits-node-4',
          actions: [],
          router: {
            type: 'switch',
            wait: {
              type: 'msg',
              hint: {
                type: 'digits',
                count: 6
              }
            },
            result_name: 'verification_code',
            categories: [
              {
                uuid: 'code-cat-1',
                name: 'Valid Code',
                exit_uuid: 'code-exit-1'
              },
              { uuid: 'code-cat-2', name: 'Other', exit_uuid: 'code-exit-2' }
            ]
          },
          exits: [
            { uuid: 'code-exit-1', destination_uuid: null },
            { uuid: 'code-exit-2', destination_uuid: null }
          ]
        } as Node,
        { type: 'wait_for_digits' },
        'verification-code'
      );
    });
  });
});
