import { expect } from '@open-wc/testing';
import { FieldRenderer } from '../src/form/FieldRenderer';
import {
  TextFieldConfig,
  TextareaFieldConfig,
  SelectFieldConfig
} from '../src/flow/types';

describe('FieldRenderer', () => {
  describe('renderField', () => {
    it('should render text field with evaluated flag without errors', () => {
      const config: TextFieldConfig = {
        type: 'text',
        label: 'Test Field',
        evaluated: true,
        placeholder: 'Enter text'
      };

      expect(() => {
        FieldRenderer.renderField('testField', config, 'test value', {
          errors: [],
          showLabel: true,
          onChange: () => {}
        });
      }).to.not.throw;
    });

    it('should render text field without evaluated flag without errors', () => {
      const config: TextFieldConfig = {
        type: 'text',
        label: 'Test Field',
        evaluated: false,
        placeholder: 'Enter text'
      };

      expect(() => {
        FieldRenderer.renderField('testField', config, 'test value', {
          errors: [],
          showLabel: true,
          onChange: () => {}
        });
      }).to.not.throw;
    });

    it('should render textarea field with evaluated flag without errors', () => {
      const config: TextareaFieldConfig = {
        type: 'textarea',
        label: 'Test Textarea',
        evaluated: true,
        placeholder: 'Enter text',
        rows: 5
      };

      expect(() => {
        FieldRenderer.renderField('testField', config, 'test value', {
          errors: [],
          showLabel: true,
          onChange: () => {}
        });
      }).to.not.throw;
    });

    it('should render textarea field without evaluated flag without errors', () => {
      const config: TextareaFieldConfig = {
        type: 'textarea',
        label: 'Test Textarea',
        evaluated: false,
        placeholder: 'Enter text',
        rows: 5
      };

      expect(() => {
        FieldRenderer.renderField('testField', config, 'test value', {
          errors: [],
          showLabel: true,
          onChange: () => {}
        });
      }).to.not.throw;
    });

    it('should render select field without errors', () => {
      const config: SelectFieldConfig = {
        type: 'select',
        label: 'Test Select',
        options: ['Option 1', 'Option 2'],
        multi: true,
        searchable: true
      };

      expect(() => {
        FieldRenderer.renderField('testField', config, ['Option 1'], {
          errors: [],
          showLabel: true,
          onChange: () => {}
        });
      }).to.not.throw;
    });

    it('should handle all field types without errors', () => {
      const configs = [
        { type: 'text', label: 'Text' } as TextFieldConfig,
        { type: 'textarea', label: 'Textarea' } as TextareaFieldConfig,
        { type: 'select', label: 'Select', options: [] } as SelectFieldConfig,
        { type: 'checkbox', label: 'Checkbox' },
        { type: 'key-value', label: 'KeyValue' },
        { type: 'array', label: 'Array', itemConfig: {} },
        { type: 'message-editor', label: 'MessageEditor' }
      ];

      configs.forEach((config, index) => {
        expect(() => {
          FieldRenderer.renderField(`field${index}`, config as any, null, {
            errors: [],
            showLabel: true,
            onChange: () => {}
          });
        }).to.not.throw;
      });
    });
  });
});
