import { html, TemplateResult } from 'lit';
import {
  FieldConfig,
  SelectFieldConfig,
  TextFieldConfig,
  TextareaFieldConfig,
  CheckboxFieldConfig,
  MessageEditorFieldConfig
} from '../flow/types';

export interface FieldRenderOptions {
  name?: string;
  value: any;
  errors?: string[];
  showLabel?: boolean;
  showHelpText?: boolean;
  flavor?: string;
  onFieldChange: (fieldName: string, value: any, event: Event) => void;
  // Allow passing additional properties like attachments for message editor
  [key: string]: any;
}

/**
 * Shared field rendering utility for consistent field rendering across components
 */
export class FieldRenderer {
  /**
   * Applies smart select transformations to convert string arrays to select option format
   */
  static applySmartSelectTransformation(
    value: any,
    config: SelectFieldConfig
  ): any {
    if (!FieldRenderer.shouldApplySmartSelectTransformation(config)) {
      return value;
    }

    if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'string'
    ) {
      // Transform string array to select options format
      return value.map((item: string) => ({
        name: item,
        value: item
      }));
    }

    return value;
  }

  /**
   * Reverses smart select transformations to convert select option format back to string array
   */
  static reverseSmartSelectTransformation(
    value: any,
    config: SelectFieldConfig
  ): any {
    if (!FieldRenderer.shouldApplySmartSelectTransformation(config)) {
      return value;
    }

    if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'object' &&
      'value' in value[0]
    ) {
      // Transform select options format back to string array
      return value.map((item: any) => item.value || item.name || item);
    }

    return value;
  }

  /**
   * Determines if a select field should have smart transformations applied
   */
  static shouldApplySmartSelectTransformation(
    config: SelectFieldConfig
  ): boolean {
    return config.type === 'select' && (config.multi || config.tags);
  }

  /**
   * Renders a field based on its configuration
   */
  static renderField(
    fieldName: string,
    config: FieldConfig,
    options: FieldRenderOptions
  ): TemplateResult {
    const {
      name = fieldName,
      value,
      errors = [],
      showLabel = true,
      showHelpText = true,
      flavor = 'small',
      onFieldChange
    } = options;

    const handleChange = (e: Event) => {
      let extractedValue = FieldRenderer.extractValue(e);

      // Apply reverse smart transformations only for select fields that should have them
      if (config.type === 'select') {
        const selectConfig = config as SelectFieldConfig;
        if (FieldRenderer.shouldApplySmartSelectTransformation(selectConfig)) {
          extractedValue = FieldRenderer.reverseSmartSelectTransformation(
            extractedValue,
            selectConfig
          );
        }
      }

      onFieldChange(fieldName, extractedValue, e);
    };

    const fieldContent = FieldRenderer.renderFieldContent(
      fieldName,
      config,
      value,
      errors,
      handleChange,
      { name, showLabel, showHelpText, flavor }
    );

    return fieldContent;
  }

  /**
   * Extracts the correct value from form field events
   */
  static extractValue(event: Event): any {
    const target = event.target as any;

    // Handle different component types
    if (target.tagName === 'TEMBA-CHECKBOX') {
      return target.checked;
    } else if (target.tagName === 'TEMBA-SELECT') {
      // For temba-select, extract the correct value based on type
      if (target.multi || target.emails || target.tags) {
        return target.values || [];
      } else {
        // Single select: extract value from first selected option
        const values = target.values || [];
        return values.length > 0 && values[0]
          ? values[0].value !== undefined
            ? values[0].value
            : values[0]
          : '';
      }
    } else if (target.values !== undefined) {
      return target.values;
    } else {
      return target.value;
    }
  }

  /**
   * Helper method to render text-based fields (text and textarea) with optional evaluation support
   */
  private static renderTextComponent(
    config: TextFieldConfig | TextareaFieldConfig,
    value: any,
    errors: string[],
    onChange: (e: Event) => void,
    options: {
      name: string;
      showLabel: boolean;
      showHelpText: boolean;
      flavor: string;
    },
    isTextarea: boolean
  ): TemplateResult {
    const { name, showLabel, showHelpText } = options;
    const textareaConfig = config as TextareaFieldConfig;

    // Calculate styles for textarea
    const minHeightStyle =
      isTextarea && textareaConfig.minHeight
        ? `--textarea-min-height: ${textareaConfig.minHeight}px;`
        : '';

    // Common attributes for both components
    const commonAttrs = {
      name,
      label: showLabel ? config.label || '' : '',
      required: config.required,
      errors,
      value: value || '',
      placeholder: config.placeholder || '',
      helpText: showHelpText ? config.helpText || '' : ''
    };

    if (config.evaluated) {
      // Use temba-completion for evaluated fields
      return html`<temba-completion
        name="${commonAttrs.name}"
        label="${commonAttrs.label}"
        ?required="${commonAttrs.required}"
        .errors="${commonAttrs.errors}"
        .value="${commonAttrs.value}"
        placeholder="${commonAttrs.placeholder}"
        ?textarea="${isTextarea}"
        expressions="session"
        style="${minHeightStyle}"
        .helpText="${commonAttrs.helpText}"
        @input="${onChange}"
      ></temba-completion>`;
    } else {
      // Use temba-textinput for non-evaluated fields
      return html`<temba-textinput
        name="${commonAttrs.name}"
        label="${commonAttrs.label}"
        ?required="${commonAttrs.required}"
        .errors="${commonAttrs.errors}"
        .value="${commonAttrs.value}"
        placeholder="${commonAttrs.placeholder}"
        ?textarea="${isTextarea}"
        .rows="${isTextarea ? textareaConfig.rows || 3 : undefined}"
        style="${minHeightStyle}"
        .helpText="${commonAttrs.helpText}"
        @input="${onChange}"
      ></temba-textinput>`;
    }
  }

  /**
   * Renders the actual field content based on type
   */
  private static renderFieldContent(
    fieldName: string,
    config: FieldConfig,
    value: any,
    errors: string[],
    onChange: (e: Event) => void,
    options: {
      name: string;
      showLabel: boolean;
      showHelpText: boolean;
      flavor: string;
    }
  ): TemplateResult {
    const { name, showLabel, showHelpText, flavor } = options;

    switch (config.type) {
      case 'text':
        return FieldRenderer.renderTextComponent(
          config,
          value,
          errors,
          onChange,
          options,
          false
        );

      case 'textarea':
        return FieldRenderer.renderTextComponent(
          config,
          value,
          errors,
          onChange,
          options,
          true
        );

      case 'select': {
        const selectConfig = config as SelectFieldConfig;

        // Apply smart transformations only for fields that should have them
        const transformedValue =
          FieldRenderer.shouldApplySmartSelectTransformation(selectConfig)
            ? FieldRenderer.applySmartSelectTransformation(value, selectConfig)
            : value;

        // For multi-select fields (including tags), use .values property
        // For single-select fields, use .value property
        const isMultiSelect =
          selectConfig.multi || selectConfig.tags || selectConfig.emails;

        if (isMultiSelect) {
          return html`<temba-select
            name="${name}"
            label="${showLabel ? config.label || '' : ''}"
            ?required="${config.required}"
            .errors="${errors}"
            .values="${transformedValue || []}"
            ?multi="${selectConfig.multi}"
            ?searchable="${selectConfig.searchable}"
            ?tags="${selectConfig.tags}"
            ?emails="${selectConfig.emails}"
            ?clearable="${selectConfig.clearable}"
            placeholder="${selectConfig.placeholder || ''}"
            maxItems="${selectConfig.maxItems || 0}"
            valueKey="${selectConfig.valueKey || 'value'}"
            nameKey="${selectConfig.nameKey || 'name'}"
            endpoint="${selectConfig.endpoint || ''}"
            .helpText="${showHelpText ? config.helpText || '' : ''}"
            flavor="${selectConfig.flavor || flavor}"
            @change="${onChange}"
          >
            ${selectConfig.options?.map((option: any) => {
              if (typeof option === 'string') {
                return html`<temba-option
                  name="${option}"
                  value="${option}"
                ></temba-option>`;
              } else {
                return html`<temba-option
                  name="${option.label || option.name}"
                  value="${option.value}"
                ></temba-option>`;
              }
            })}
          </temba-select>`;
        } else {
          // For single-select, convert the value to the proper option format
          let singleSelectValue;
          if (transformedValue && selectConfig.options) {
            const matchingOption = selectConfig.options.find((option: any) => {
              const optionValue =
                typeof option === 'string' ? option : option.value;
              return optionValue === transformedValue;
            });
            if (matchingOption) {
              if (typeof matchingOption === 'string') {
                singleSelectValue = [
                  { name: matchingOption, value: matchingOption }
                ];
              } else {
                // Convert label to name for temba-select component
                singleSelectValue = [
                  {
                    name:
                      matchingOption.label ||
                      (matchingOption as any).name ||
                      matchingOption.value,
                    value: matchingOption.value
                  }
                ];
              }
            } else {
              singleSelectValue = [];
            }
          } else {
            singleSelectValue = [];
          }

          return html`<temba-select
            name="${name}"
            label="${showLabel ? config.label || '' : ''}"
            ?required="${config.required}"
            .errors="${errors}"
            .values="${singleSelectValue}"
            ?multi="${selectConfig.multi}"
            ?searchable="${selectConfig.searchable}"
            ?tags="${selectConfig.tags}"
            ?emails="${selectConfig.emails}"
            ?clearable="${selectConfig.clearable}"
            placeholder="${selectConfig.placeholder || ''}"
            maxItems="${selectConfig.maxItems || 0}"
            valueKey="${selectConfig.valueKey || 'value'}"
            nameKey="${selectConfig.nameKey || 'name'}"
            endpoint="${selectConfig.endpoint || ''}"
            .helpText="${showHelpText ? config.helpText || '' : ''}"
            flavor="${selectConfig.flavor || flavor}"
            @change="${onChange}"
          >
            ${selectConfig.options?.map((option: any) => {
              if (typeof option === 'string') {
                return html`<temba-option
                  name="${option}"
                  value="${option}"
                ></temba-option>`;
              } else {
                return html`<temba-option
                  name="${option.label || option.name}"
                  value="${option.value}"
                ></temba-option>`;
              }
            })}
          </temba-select>`;
        }
      }

      case 'key-value':
        return html`<div class="form-field field">
          ${showLabel
            ? html`<label>${config.label}${config.required ? ' *' : ''}</label>`
            : ''}
          <temba-key-value-editor
            name="${name}"
            .value="${value || []}"
            .sortable="${config.sortable}"
            .keyPlaceholder="${config.keyPlaceholder || 'Key'}"
            .valuePlaceholder="${config.valuePlaceholder || 'Value'}"
            .minRows="${config.minRows || 0}"
            @change="${(e: CustomEvent) => {
              onChange(e as Event);
            }}"
          ></temba-key-value-editor>
          ${errors.length
            ? html`<div class="field-errors">${errors.join(', ')}</div>`
            : ''}
          ${showHelpText && config.helpText
            ? html`<div class="help-text help-always">${config.helpText}</div>`
            : ''}
        </div>`;

      case 'array':
        return html`<div class="form-field field">
          ${showLabel
            ? html`<label>${config.label}${config.required ? ' *' : ''}</label>`
            : ''}
          <temba-array-editor
            .value="${value || []}"
            .itemConfig="${config.itemConfig}"
            .sortable="${config.sortable}"
            .itemLabel="${config.itemLabel || 'Item'}"
            .minItems="${config.minItems || 0}"
            .maxItems="${config.maxItems || 0}"
            .onItemChange="${config.onItemChange}"
            .isEmptyItemFn="${config.isEmptyItem}"
            @change="${onChange}"
          ></temba-array-editor>
          ${errors.length
            ? html`<div class="field-errors">${errors.join(', ')}</div>`
            : ''}
          ${showHelpText && config.helpText
            ? html`<div class="help-text help-always">${config.helpText}</div>`
            : ''}
        </div>`;

      case 'checkbox': {
        const checkboxConfig = config as CheckboxFieldConfig;
        return html`<div class="form-field">
          <temba-checkbox
            name="${name}"
            label="${showLabel ? config.label || '' : ''}"
            .helpText="${showHelpText ? config.helpText || '' : ''}"
            ?required="${config.required}"
            .errors="${errors}"
            ?checked="${value || false}"
            size="${checkboxConfig.size || 1.2}"
            animateChange="${checkboxConfig.animateChange || 'pulse'}"
            @change="${onChange}"
          ></temba-checkbox>
          ${errors.length
            ? html`<div class="field-errors">${errors.join(', ')}</div>`
            : ''}
        </div>`;
      }

      case 'message-editor': {
        const messageConfig = config as MessageEditorFieldConfig;
        return html`<temba-message-editor
          name="${name}"
          label="${showLabel ? config.label || '' : ''}"
          ?required="${config.required}"
          .errors="${errors}"
          .value="${value || ''}"
          .attachments="${(options as any).attachments || []}"
          placeholder="${messageConfig.placeholder || ''}"
          .helpText="${showHelpText ? config.helpText || '' : ''}"
          ?autogrow="${messageConfig.autogrow}"
          ?gsm="${messageConfig.gsm}"
          ?disableCompletion="${messageConfig.disableCompletion}"
          counter="${messageConfig.counter || ''}"
          accept="${messageConfig.accept || ''}"
          endpoint="${messageConfig.endpoint || ''}"
          max-attachments="${messageConfig.maxAttachments || 3}"
          minHeight="${messageConfig.minHeight || 60}"
          @change="${onChange}"
        ></temba-message-editor>`;
      }

      default:
        return html`<span
          >Unsupported field type: ${(config as any).type}</span
        >`;
    }
  }
}
