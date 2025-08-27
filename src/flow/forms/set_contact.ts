import { ActionConfig, COLORS, ValidationResult } from '../types';
import { NamedObject } from '../../store/flow-definition';

// Form data structure for unified contact update form
export interface ContactUpdateFormData {
  uuid: string;
  property: 'name' | 'language' | 'channel' | 'status' | 'field';
  value?: string;
  field?: NamedObject;
  field_value?: string;  // Value for field property
  channel?: NamedObject;
  language?: string;
  status?: 'active' | 'archived' | 'stopped' | 'blocked';
}

// Get contact fields from workspace configuration
const getContactFields = (): Array<{ value: string; label: string }> => {
  // TODO: This should dynamically load from workspace configuration
  // For now, return a basic set for testing
  return [
    { value: 'age', label: 'Age' },
    { value: 'gender', label: 'Gender' },
    { value: 'occupation', label: 'Occupation' },
    { value: 'location', label: 'Location' }
  ];
};

export const set_contact: ActionConfig = {
  name: 'Update Contact',
  color: COLORS.update,
  form: {
    property: {
      type: 'select',
      label: 'Property',
      required: true,
      searchable: false,
      clearable: false,
      options: [
        { value: 'name', label: 'Name' },
        { value: 'language', label: 'Language' },
        { value: 'channel', label: 'Channel' },
        { value: 'status', label: 'Status' },
        { value: 'field', label: 'Field' }
      ]
    },
    value: {
      type: 'text',
      label: 'Value',
      placeholder: 'Enter value...',
      required: true,
      evaluated: true,
      conditions: {
        visible: (formData: ContactUpdateFormData) => 
          formData.property === 'name'
      }
    },
    field: {
      type: 'select',
      label: 'Field',
      required: true,
      searchable: true,
      clearable: false,
      options: getContactFields(),
      conditions: {
        visible: (formData: ContactUpdateFormData) => 
          formData.property === 'field'
      }
    },
    field_value: {
      type: 'text',
      label: 'Field Value',
      placeholder: 'Enter field value...',
      required: true,
      evaluated: true,
      conditions: {
        visible: (formData: ContactUpdateFormData) => 
          formData.property === 'field'
      }
    },
    status: {
      type: 'select',
      label: 'Status',
      required: true,
      searchable: false,
      clearable: false,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'archived', label: 'Archived' },
        { value: 'stopped', label: 'Stopped' },
        { value: 'blocked', label: 'Blocked' }
      ],
      conditions: {
        visible: (formData: ContactUpdateFormData) => 
          formData.property === 'status'
      }
    },
    channel: {
      type: 'select',
      label: 'Channel',
      required: true,
      searchable: true,
      clearable: false,
      endpoint: '/api/v2/channels.json',
      valueKey: 'uuid',
      nameKey: 'name',
      conditions: {
        visible: (formData: ContactUpdateFormData) => 
          formData.property === 'channel'
      }
    },
    language: {
      type: 'select',
      label: 'Language',
      required: true,
      searchable: true,
      clearable: false,
      endpoint: '/api/v2/languages.json',
      valueKey: 'iso',
      nameKey: 'name',
      conditions: {
        visible: (formData: ContactUpdateFormData) => 
          formData.property === 'language'
      }
    }
  },
  layout: [
    'property',
    {
      type: 'group',
      label: 'Value Configuration',
      items: ['value', 'field', 'field_value', 'status', 'channel', 'language']
    }
  ],
  validate: (formData: ContactUpdateFormData): ValidationResult => {
    const errors: { [key: string]: string } = {};

    if (!formData.property) {
      errors.property = 'Property is required';
    } else {
      switch (formData.property) {
        case 'name':
          if (!formData.value || formData.value.trim() === '') {
            errors.value = 'Name value is required';
          }
          break;
        case 'field':
          if (!formData.field) {
            errors.field = 'Field selection is required';
          }
          if (!formData.field_value || formData.field_value.trim() === '') {
            errors.field_value = 'Field value is required';
          }
          break;
        case 'status':
          if (!formData.status) {
            errors.status = 'Status selection is required';
          }
          break;
        case 'channel':
          if (!formData.channel) {
            errors.channel = 'Channel selection is required';
          }
          break;
        case 'language':
          if (!formData.language) {
            errors.language = 'Language selection is required';
          }
          break;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },
  sanitize: (formData: ContactUpdateFormData): void => {
    if (formData.value && typeof formData.value === 'string') {
      formData.value = formData.value.trim();
    }
    if (formData.field_value && typeof formData.field_value === 'string') {
      formData.field_value = formData.field_value.trim();
    }
  }
};