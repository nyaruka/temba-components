import { expect } from '@open-wc/testing';
import { split_by_random } from '../../src/flow/nodes/split_by_random';
import { Node } from '../../src/store/flow-definition';
import { NodeTest } from '../NodeHelper';

/**
 * Test suite for the split_by_random node configuration.
 */
describe('split_by_random node config', () => {
  const helper = new NodeTest(split_by_random, 'split_by_random');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(split_by_random.name).to.equal('Split by Random');
    });

    it('has correct type', () => {
      expect(split_by_random.type).to.equal('split_by_random');
    });

    it('has correct color', () => {
      expect(split_by_random.color).to.exist;
    });

    it('has router configuration', () => {
      expect(split_by_random.router).to.exist;
      expect(split_by_random.router.type).to.equal('random');
    });

    it('is a simple node config without form or layout', () => {
      expect(split_by_random.form).to.be.undefined;
      expect(split_by_random.layout).to.be.undefined;
      expect(split_by_random.toFormData).to.be.undefined;
      expect(split_by_random.fromFormData).to.be.undefined;
    });
  });

  describe('node scenarios', () => {
    helper.testNode(
      {
        uuid: 'test-random-node-1',
        actions: [],
        router: {
          type: 'random',
          categories: [
            {
              uuid: 'random-cat-1',
              name: 'Bucket A',
              exit_uuid: 'random-exit-1'
            },
            {
              uuid: 'random-cat-2',
              name: 'Bucket B',
              exit_uuid: 'random-exit-2'
            }
          ]
        },
        exits: [
          { uuid: 'random-exit-1', destination_uuid: null },
          { uuid: 'random-exit-2', destination_uuid: null }
        ]
      } as Node,
      { type: 'split_by_random' },
      'two-bucket-split'
    );

    helper.testNode(
      {
        uuid: 'test-random-node-2',
        actions: [],
        router: {
          type: 'random',
          categories: [
            {
              uuid: 'random-cat-1',
              name: 'Group A',
              exit_uuid: 'random-exit-1'
            },
            {
              uuid: 'random-cat-2',
              name: 'Group B',
              exit_uuid: 'random-exit-2'
            },
            {
              uuid: 'random-cat-3',
              name: 'Group C',
              exit_uuid: 'random-exit-3'
            }
          ]
        },
        exits: [
          { uuid: 'random-exit-1', destination_uuid: null },
          { uuid: 'random-exit-2', destination_uuid: null },
          { uuid: 'random-exit-3', destination_uuid: null }
        ]
      } as Node,
      { type: 'split_by_random' },
      'three-way-split'
    );

    helper.testNode(
      {
        uuid: 'test-random-node-3',
        actions: [],
        router: {
          type: 'random',
          categories: [
            {
              uuid: 'random-cat-1',
              name: 'Treatment',
              exit_uuid: 'random-exit-1'
            },
            {
              uuid: 'random-cat-2',
              name: 'Control',
              exit_uuid: 'random-exit-2'
            },
            {
              uuid: 'random-cat-3',
              name: 'Variant A',
              exit_uuid: 'random-exit-3'
            },
            {
              uuid: 'random-cat-4',
              name: 'Variant B',
              exit_uuid: 'random-exit-4'
            },
            {
              uuid: 'random-cat-5',
              name: 'Holdout',
              exit_uuid: 'random-exit-5'
            }
          ]
        },
        exits: [
          { uuid: 'random-exit-1', destination_uuid: null },
          { uuid: 'random-exit-2', destination_uuid: null },
          { uuid: 'random-exit-3', destination_uuid: null },
          { uuid: 'random-exit-4', destination_uuid: null },
          { uuid: 'random-exit-5', destination_uuid: null }
        ]
      } as Node,
      { type: 'split_by_random' },
      'ab-test-multiple-variants'
    );

    helper.testNode(
      {
        uuid: 'test-random-node-4',
        actions: [],
        router: {
          type: 'random',
          categories: [
            {
              uuid: 'random-cat-1',
              name: 'Sample Group',
              exit_uuid: 'random-exit-1'
            },
            {
              uuid: 'random-cat-2',
              name: 'Remaining Population',
              exit_uuid: 'random-exit-2'
            }
          ]
        },
        exits: [
          { uuid: 'random-exit-1', destination_uuid: null },
          { uuid: 'random-exit-2', destination_uuid: null }
        ]
      } as Node,
      { type: 'split_by_random' },
      'sampling-split'
    );
  });
});
