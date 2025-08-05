import { expect } from '@open-wc/testing';
import { send_msg } from '../../src/flow/actions/send_msg';
import { SendMsg } from '../../src/store/flow-definition';
import { ActionTest } from '../ActionHelper';

/**
 * Test suite for the send_msg action configuration.
 */
describe('send_msg action config', () => {
  const helper = new ActionTest(send_msg, 'send_msg');

  describe('basic properties', () => {
    helper.testBasicProperties();

    it('has correct name', () => {
      expect(send_msg.name).to.equal('Send Message');
    });
  });

  describe('action scenarios', () => {
    helper.testAction(
      {
        uuid: 'test-action-1',
        type: 'send_msg',
        text: 'Hello world!',
        quick_replies: []
      } as SendMsg,
      'simple-text'
    );

    helper.testAction(
      {
        uuid: 'test-action-2',
        type: 'send_msg',
        text: 'Hello\nworld!\nHow are you?',
        quick_replies: []
      } as SendMsg,
      'text-with-linebreaks'
    );

    helper.testAction(
      {
        uuid: 'test-action-3',
        type: 'send_msg',
        text: 'Choose an option:',
        quick_replies: ['Yes', 'No', 'Maybe']
      } as SendMsg,
      'text-with-quick-replies'
    );

    helper.testAction(
      {
        uuid: 'test-action-4',
        type: 'send_msg',
        text: 'Rate our service:',
        quick_replies: [
          '⭐',
          '⭐⭐',
          '⭐⭐⭐',
          '⭐⭐⭐⭐',
          '⭐⭐⭐⭐⭐',
          'Not applicable'
        ]
      } as SendMsg,
      'text-with-many-quick-replies'
    );

    helper.testAction(
      {
        uuid: 'test-action-5',
        type: 'send_msg',
        text: 'Welcome to our service!\n\nPlease choose from the following options:\n- Option A: Basic plan\n- Option B: Premium plan\n- Option C: Enterprise plan',
        quick_replies: ['Basic', 'Premium', 'Enterprise']
      } as SendMsg,
      'multiline-text-with-replies'
    );

    helper.testAction(
      {
        uuid: 'test-action-6',
        type: 'send_msg',
        text: 'Which department would you like to contact?',
        quick_replies: [
          'Customer Support Department',
          'Technical Support Team',
          'Billing and Accounts Department',
          'Sales and Marketing Division'
        ]
      } as SendMsg,
      'long-quick-replies'
    );

    helper.testAction(
      {
        uuid: 'test-action-7',
        type: 'send_msg',
        text: 'This action definition is missing quick_replies altogether.'
      } as SendMsg,
      'text-without-quick-replies'
    );
  });

  describe('validation edge cases', () => {
    it('fails validation for empty text', () => {
      const action: SendMsg = {
        uuid: 'test-action',
        type: 'send_msg',
        text: '',
        quick_replies: []
      };

      const result = send_msg.validate(action);
      expect(result.valid).to.be.false;
      expect(result.errors.text).to.equal('Message text is required');
    });

    it('fails validation for whitespace-only text', () => {
      const action: SendMsg = {
        uuid: 'test-action',
        type: 'send_msg',
        text: '   \n\t  ',
        quick_replies: []
      };

      const result = send_msg.validate(action);
      expect(result.valid).to.be.false;
      expect(result.errors.text).to.equal('Message text is required');
    });
  });
});
