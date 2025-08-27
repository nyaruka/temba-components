import { expect } from '@open-wc/testing';
import { ContactFormAdapter } from '../src/flow/forms/set_contact_adapter';
import {
  set_contact,
  ContactUpdateFormData
} from '../src/flow/forms/set_contact';
import {
  SetContactName,
  SetContactLanguage,
  SetContactChannel,
  SetContactStatus,
  SetContactField
} from '../src/store/flow-definition';

describe('Contact Form Adapter', () => {
  describe('actionToFormData', () => {
    it('converts SetContactName to form data', () => {
      const action: SetContactName = {
        uuid: 'test-1',
        type: 'set_contact_name',
        name: 'John Doe'
      };

      const formData = ContactFormAdapter.actionToFormData(action);

      expect(formData.uuid).to.equal('test-1');
      expect(formData.property).to.equal('name');
      expect(formData.value).to.equal('John Doe');
    });

    it('converts SetContactLanguage to form data', () => {
      const action: SetContactLanguage = {
        uuid: 'test-2',
        type: 'set_contact_language',
        language: 'eng'
      };

      const formData = ContactFormAdapter.actionToFormData(action);

      expect(formData.uuid).to.equal('test-2');
      expect(formData.property).to.equal('language');
      expect(formData.language).to.equal('eng');
    });

    it('converts SetContactChannel to form data', () => {
      const action: SetContactChannel = {
        uuid: 'test-3',
        type: 'set_contact_channel',
        channel: { uuid: 'chan-1', name: 'WhatsApp Channel' }
      };

      const formData = ContactFormAdapter.actionToFormData(action);

      expect(formData.uuid).to.equal('test-3');
      expect(formData.property).to.equal('channel');
      expect(formData.channel).to.deep.equal({
        uuid: 'chan-1',
        name: 'WhatsApp Channel'
      });
    });

    it('converts SetContactStatus to form data', () => {
      const action: SetContactStatus = {
        uuid: 'test-4',
        type: 'set_contact_status',
        status: 'active'
      };

      const formData = ContactFormAdapter.actionToFormData(action);

      expect(formData.uuid).to.equal('test-4');
      expect(formData.property).to.equal('status');
      expect(formData.status).to.equal('active');
    });

    it('converts SetContactField to form data', () => {
      const action: SetContactField = {
        uuid: 'test-5',
        type: 'set_contact_field',
        field: { uuid: 'field-1', name: 'Age' },
        value: '25'
      };

      const formData = ContactFormAdapter.actionToFormData(action);

      expect(formData.uuid).to.equal('test-5');
      expect(formData.property).to.equal('field');
      expect(formData.field).to.deep.equal({ uuid: 'field-1', name: 'Age' });
      expect(formData.field_value).to.equal('25');
    });

    it('throws error for unsupported action type', () => {
      const action = {
        uuid: 'test-6',
        type: 'unsupported_action'
      } as any;

      expect(() => ContactFormAdapter.actionToFormData(action)).to.throw(
        'Unsupported action type: unsupported_action'
      );
    });
  });

  describe('formDataToAction', () => {
    it('converts name form data to SetContactName', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-1',
        property: 'name',
        value: 'Jane Doe'
      };

      const action = ContactFormAdapter.formDataToAction(
        formData
      ) as SetContactName;

      expect(action.uuid).to.equal('test-1');
      expect(action.type).to.equal('set_contact_name');
      expect(action.name).to.equal('Jane Doe');
    });

    it('converts language form data to SetContactLanguage', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-2',
        property: 'language',
        language: 'spa'
      };

      const action = ContactFormAdapter.formDataToAction(
        formData
      ) as SetContactLanguage;

      expect(action.uuid).to.equal('test-2');
      expect(action.type).to.equal('set_contact_language');
      expect(action.language).to.equal('spa');
    });

    it('converts channel form data to SetContactChannel', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-3',
        property: 'channel',
        channel: { uuid: 'chan-2', name: 'SMS Channel' }
      };

      const action = ContactFormAdapter.formDataToAction(
        formData
      ) as SetContactChannel;

      expect(action.uuid).to.equal('test-3');
      expect(action.type).to.equal('set_contact_channel');
      expect(action.channel).to.deep.equal({
        uuid: 'chan-2',
        name: 'SMS Channel'
      });
    });

    it('converts status form data to SetContactStatus', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-4',
        property: 'status',
        status: 'blocked'
      };

      const action = ContactFormAdapter.formDataToAction(
        formData
      ) as SetContactStatus;

      expect(action.uuid).to.equal('test-4');
      expect(action.type).to.equal('set_contact_status');
      expect(action.status).to.equal('blocked');
    });

    it('converts field form data to SetContactField', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-5',
        property: 'field',
        field: { uuid: 'field-2', name: 'Gender' },
        field_value: 'Female'
      };

      const action = ContactFormAdapter.formDataToAction(
        formData
      ) as SetContactField;

      expect(action.uuid).to.equal('test-5');
      expect(action.type).to.equal('set_contact_field');
      expect(action.field).to.deep.equal({ uuid: 'field-2', name: 'Gender' });
      expect(action.value).to.equal('Female');
    });

    it('throws error for missing channel', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-3',
        property: 'channel'
      };

      expect(() => ContactFormAdapter.formDataToAction(formData)).to.throw(
        'Channel is required for channel property'
      );
    });

    it('throws error for missing status', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-4',
        property: 'status'
      };

      expect(() => ContactFormAdapter.formDataToAction(formData)).to.throw(
        'Status is required for status property'
      );
    });

    it('throws error for missing field', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-5',
        property: 'field'
      };

      expect(() => ContactFormAdapter.formDataToAction(formData)).to.throw(
        'Field is required for field property'
      );
    });

    it('throws error for unsupported property type', () => {
      const formData = {
        uuid: 'test-6',
        property: 'unsupported'
      } as any;

      expect(() => ContactFormAdapter.formDataToAction(formData)).to.throw(
        'Unsupported property type: unsupported'
      );
    });
  });

  describe('roundtrip conversion', () => {
    it('maintains data integrity for name action', () => {
      const originalAction: SetContactName = {
        uuid: 'test-1',
        type: 'set_contact_name',
        name: 'Test User'
      };

      const formData = ContactFormAdapter.actionToFormData(originalAction);
      const convertedAction = ContactFormAdapter.formDataToAction(formData);

      expect(convertedAction).to.deep.equal(originalAction);
    });

    it('maintains data integrity for field action', () => {
      const originalAction: SetContactField = {
        uuid: 'test-5',
        type: 'set_contact_field',
        field: { uuid: 'field-1', name: 'Location' },
        value: 'New York'
      };

      const formData = ContactFormAdapter.actionToFormData(originalAction);
      const convertedAction = ContactFormAdapter.formDataToAction(formData);

      expect(convertedAction).to.deep.equal(originalAction);
    });
  });
});

describe('Contact Form Configuration', () => {
  describe('validation', () => {
    it('validates required property', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-1',
        property: 'name'
      };

      // Remove property to test validation
      delete (formData as any).property;

      const result = set_contact.validate!(formData);
      expect(result.valid).to.be.false;
      expect(result.errors.property).to.equal('Property is required');
    });

    it('validates name property requires value', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-1',
        property: 'name'
      };

      const result = set_contact.validate!(formData);
      expect(result.valid).to.be.false;
      expect(result.errors.value).to.equal('Name value is required');
    });

    it('validates field property requires field and value', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-1',
        property: 'field'
      };

      const result = set_contact.validate!(formData);
      expect(result.valid).to.be.false;
      expect(result.errors.field).to.equal('Field selection is required');
      expect(result.errors.field_value).to.equal('Field value is required');
    });

    it('validates valid name form data', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-1',
        property: 'name',
        value: 'Valid Name'
      };

      const result = set_contact.validate!(formData);
      expect(result.valid).to.be.true;
      expect(Object.keys(result.errors)).to.have.length(0);
    });
  });

  describe('sanitization', () => {
    it('trims whitespace from value', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-1',
        property: 'name',
        value: '  Test Name  '
      };

      set_contact.sanitize!(formData);
      expect(formData.value).to.equal('Test Name');
    });

    it('trims whitespace from field_value', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-1',
        property: 'field',
        field_value: '  Test Value  '
      };

      set_contact.sanitize!(formData);
      expect(formData.field_value).to.equal('Test Value');
    });

    it('handles undefined values gracefully', () => {
      const formData: ContactUpdateFormData = {
        uuid: 'test-1',
        property: 'name'
      };

      expect(() => set_contact.sanitize!(formData)).to.not.throw();
    });
  });
});
