import { 
  Action, 
  SetContactName, 
  SetContactLanguage, 
  SetContactChannel, 
  SetContactStatus, 
  SetContactField 
} from '../../store/flow-definition';
import { ContactUpdateFormData } from './set_contact';

/**
 * Adapter for converting between unified contact form data and specific action types
 */
export class ContactFormAdapter {
  /**
   * Convert any contact action to unified form data
   */
  static actionToFormData(action: Action): ContactUpdateFormData {
    const baseFormData: ContactUpdateFormData = {
      uuid: action.uuid,
      property: 'name' // default
    };

    switch (action.type) {
      case 'set_contact_name': {
        const nameAction = action as SetContactName;
        return {
          ...baseFormData,
          property: 'name',
          value: nameAction.name
        };
      }

      case 'set_contact_language': {
        const languageAction = action as SetContactLanguage;
        return {
          ...baseFormData,
          property: 'language',
          language: languageAction.language
        };
      }

      case 'set_contact_channel': {
        const channelAction = action as SetContactChannel;
        return {
          ...baseFormData,
          property: 'channel',
          channel: channelAction.channel
        };
      }

      case 'set_contact_status': {
        const statusAction = action as SetContactStatus;
        return {
          ...baseFormData,
          property: 'status',
          status: statusAction.status
        };
      }

      case 'set_contact_field': {
        const fieldAction = action as SetContactField;
        return {
          ...baseFormData,
          property: 'field',
          field: fieldAction.field,
          field_value: fieldAction.value
        };
      }

      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Convert unified form data back to appropriate action type
   */
  static formDataToAction(formData: ContactUpdateFormData): Action {
    const baseAction = {
      uuid: formData.uuid
    };

    switch (formData.property) {
      case 'name':
        return {
          ...baseAction,
          type: 'set_contact_name',
          name: formData.value || ''
        } as SetContactName;

      case 'language':
        return {
          ...baseAction,
          type: 'set_contact_language',
          language: formData.language || ''
        } as SetContactLanguage;

      case 'channel':
        if (!formData.channel) {
          throw new Error('Channel is required for channel property');
        }
        return {
          ...baseAction,
          type: 'set_contact_channel',
          channel: formData.channel
        } as SetContactChannel;

      case 'status':
        if (!formData.status) {
          throw new Error('Status is required for status property');
        }
        return {
          ...baseAction,
          type: 'set_contact_status',
          status: formData.status
        } as SetContactStatus;

      case 'field':
        if (!formData.field) {
          throw new Error('Field is required for field property');
        }
        return {
          ...baseAction,
          type: 'set_contact_field',
          field: formData.field,
          value: formData.field_value || ''
        } as SetContactField;

      default:
        throw new Error(`Unsupported property type: ${formData.property}`);
    }
  }
}