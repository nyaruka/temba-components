import { html, TemplateResult } from 'lit';
import {
  FieldConfig,
  TextFieldConfig,
  TextareaFieldConfig,
  SelectFieldConfig,
  CheckboxFieldConfig,
  MessageEditorFieldConfig,
  KeyValueFieldConfig,
  ArrayFieldConfig
} from '../flow/types';

/**
 * FieldRenderer provides a consistent way to render field configurations
 * into web components across different contexts (NodeEditor, ArrayEditor, etc.)
 */
export class FieldRenderer {
  /**
   * Renders a field based on its configuration
   * @param fieldName - The name of the field
   * @param config - The field configuration
   * @param value - The current value of the field
   * @param context - Additional context for rendering
   * @returns A TemplateResult for the rendered field
   */
  static renderField(
    fieldName: string,
    config: FieldConfig,
    value: any,
    context: FieldRenderContext = {}
  ): TemplateResult {
    /*const {
      errors = [],
      onChange,
      showLabel = true,
      flavor,
      extraClasses = '',
      style = ''
    } = context;*/
    switch (config.type) {
      case 'text':
        return FieldRenderer.renderTextInput(fieldName, config, value, context);

      case 'textarea':
        return FieldRenderer.renderTextarea(
          fieldName,
          config as TextareaFieldConfig,
          value,
          context
        );

      case 'select':
        return FieldRenderer.renderSelect(
          fieldName,
          config as SelectFieldConfig,
          value,
          context
        );

      case 'checkbox':
        return FieldRenderer.renderCheckbox(
          fieldName,
          config as CheckboxFieldConfig,
          value,
          context
        );

      case 'key-value':
        return FieldRenderer.renderKeyValue(
          fieldName,
          config as KeyValueFieldConfig,
          value,
          context
        );

      case 'array':
        return FieldRenderer.renderArray(
          fieldName,
          config as ArrayFieldConfig,
          value,
          context
        );

      case 'message-editor':
        return FieldRenderer.renderMessageEditor(
          fieldName,
          config as MessageEditorFieldConfig,
          value,
          context
        );

      default:
        return html`<div>Unsupported field type: ${(config as any).type}</div>`;
    }
  }

  private static renderTextInput(
    fieldName: string,
    config: TextFieldConfig,
    value: any,
    context: FieldRenderContext
  ): TemplateResult {
    const {
      errors = [],
      onChange,
      showLabel = true,
      extraClasses,
      style
    } = context;

    // If field supports expression evaluation, use temba-completion
    if (config.evaluated) {
      return html`<temba-completion
        name="${fieldName}"
        label="${showLabel ? config.label : ''}"
        ?required="${config.required}"
        .errors="${errors}"
        .value="${value || ''}"
        placeholder="${config.placeholder || ''}"
        expressions="session"
        .helpText="${config.helpText || ''}"
        class="${extraClasses}"
        style="${style}"
        @input="${onChange || (() => {})}"
      ></temba-completion>`;
    }

    return html`<temba-textinput
      name="${fieldName}"
      label="${showLabel ? config.label : ''}"
      ?required="${config.required}"
      .errors="${errors}"
      .value="${value || ''}"
      placeholder="${config.placeholder || ''}"
      .helpText="${config.helpText || ''}"
      class="${extraClasses}"
      style="${style}"
      @input="${onChange || (() => {})}"
    ></temba-textinput>`;
  }

  private static renderTextarea(
    fieldName: string,
    config: TextareaFieldConfig,
    value: any,
    context: FieldRenderContext
  ): TemplateResult {
    const {
      errors = [],
      onChange,
      showLabel = true,
      extraClasses,
      style
    } = context;

    const minHeightStyle = config.minHeight
      ? `--textarea-min-height: ${config.minHeight}px;`
      : '';
    const combinedStyle = `${minHeightStyle}${style}`;

    // If field supports expression evaluation, use temba-completion
    if (config.evaluated) {
      return html`<temba-completion
        name="${fieldName}"
        label="${showLabel ? config.label : ''}"
        ?required="${config.required}"
        .errors="${errors}"
        .value="${value || ''}"
        placeholder="${config.placeholder || ''}"
        textarea
        expressions="session"
        .helpText="${config.helpText || ''}"
        class="${extraClasses}"
        style="${combinedStyle}"
        @input="${onChange || (() => {})}"
      ></temba-completion>`;
    }

    return html`<temba-textinput
      name="${fieldName}"
      label="${showLabel ? config.label : ''}"
      ?required="${config.required}"
      .errors="${errors}"
      .value="${value || ''}"
      placeholder="${config.placeholder || ''}"
      textarea
      .rows="${config.rows || 3}"
      .helpText="${config.helpText || ''}"
      class="${extraClasses}"
      style="${combinedStyle}"
      @input="${onChange || (() => {})}"
    ></temba-textinput>`;
  }

  private static renderSelect(
    fieldName: string,
    config: SelectFieldConfig,
    value: any,
    context: FieldRenderContext
  ): TemplateResult {
    const {
      errors = [],
      onChange,
      showLabel = true,
      flavor,
      extraClasses,
      style
    } = context;

    // Ensure proper value handling for multi vs single select
    let normalizedValue = (() => {
      if (config.multi) {
        // Multi-select: ensure we have an array and convert strings to option objects
        const valueArray = Array.isArray(value) ? value : value ? [value] : [];
        return valueArray.map((val) => {
          if (typeof val === 'string') {
            // Convert string values to option objects
            return { name: val, value: val };
          }
          return val;
        });
      } else {
        // Single select: use the value as-is
        return value || '';
      }
    })();

    // Get options - use dynamic options if available, otherwise use static options
    const optionsToRender = config.getDynamicOptions
      ? config.getDynamicOptions()
      : config.options;

    if (
      normalizedValue &&
      typeof normalizedValue !== 'string' &&
      !Array.isArray(normalizedValue)
    ) {
      normalizedValue = [normalizedValue];
    }

    const isArray = Array.isArray(value);
    return html`<temba-select
      name="${fieldName}"
      label="${showLabel ? config.label : ''}"
      ?required="${config.required}"
      .errors="${errors}"
      value="${isArray ? '' : normalizedValue}"
      .values="${!isArray ? normalizedValue : undefined}"
      ?multi="${config.multi}"
      ?searchable="${config.searchable}"
      ?tags="${config.tags}"
      ?emails="${config.emails}"
      ?clearable="${config.clearable || false}"
      placeholder="${config.placeholder || ''}"
      maxItems="${config.maxItems || 0}"
      valueKey="${config.valueKey || 'value'}"
      nameKey="${config.nameKey || 'name'}"
      endpoint="${config.endpoint || ''}"
      .helpText="${config.helpText || ''}"
      flavor="${flavor || config.flavor || 'small'}"
      class="${extraClasses}"
      style="${style}"
      .getName=${config.getName}
      .createArbitraryOption=${config.createArbitraryOption}
      .getOptions=${config.getOptions}
      ?allowCreate="${config.allowCreate || false}"
      @change="${onChange || (() => {})}"
    >
      ${optionsToRender?.map((option: any) => {
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

  private static renderCheckbox(
    fieldName: string,
    config: CheckboxFieldConfig,
    value: any,
    context: FieldRenderContext
  ): TemplateResult {
    const { errors = [], onChange, extraClasses, style } = context;

    return html`<div class="form-field">
      <temba-checkbox
        name="${fieldName}"
        label="${config.label}"
        .helpText="${config.helpText || ''}"
        ?required="${config.required}"
        .errors="${errors}"
        ?checked="${value || false}"
        size="${config.size || 1.2}"
        animateChange="${config.animateChange || 'pulse'}"
        class="${extraClasses}"
        style="${style}"
        @change="${onChange || (() => {})}"
      ></temba-checkbox>
      ${errors.length
        ? html`<div class="field-errors">${errors.join(', ')}</div>`
        : ''}
    </div>`;
  }

  private static renderKeyValue(
    fieldName: string,
    config: KeyValueFieldConfig,
    value: any,
    context: FieldRenderContext
  ): TemplateResult {
    const {
      errors = [],
      onChange,
      showLabel = true,
      extraClasses,
      style
    } = context;

    return html`<div class="form-field">
      ${showLabel ? html`<label>${config.label}</label>` : ''}
      <temba-key-value-editor
        name="${fieldName}"
        .value="${value || []}"
        .sortable="${config.sortable}"
        .keyPlaceholder="${config.keyPlaceholder || 'Key'}"
        .valuePlaceholder="${config.valuePlaceholder || 'Value'}"
        .minRows="${config.minRows || 0}"
        class="${extraClasses}"
        style="${style}"
        @change="${onChange || (() => {})}"
      ></temba-key-value-editor>
      ${errors.length
        ? html`<div class="field-errors">${errors.join(', ')}</div>`
        : ''}
    </div>`;
  }

  private static renderArray(
    fieldName: string,
    config: ArrayFieldConfig,
    value: any,
    context: FieldRenderContext
  ): TemplateResult {
    const {
      errors = [],
      onChange,
      showLabel = true,
      extraClasses,
      style
    } = context;

    return html`<div class="form-field">
      <temba-array-editor
        name="${fieldName}"
        .label="${showLabel ? config.label : ''}"
        .value="${value || []}"
        .itemConfig="${config.itemConfig}"
        .sortable="${config.sortable}"
        .itemLabel="${config.itemLabel || 'Item'}"
        .minItems="${config.minItems || 0}"
        .maxItems="${config.maxItems || 0}"
        .onItemChange="${config.onItemChange}"
        .isEmptyItemFn="${config.isEmptyItem}"
        class="${extraClasses}"
        style="${style}"
        @change="${onChange || (() => {})}"
      ></temba-array-editor>
      ${errors.length
        ? html`<div class="field-errors">${errors.join(', ')}</div>`
        : ''}
    </div>`;
  }

  private static renderMessageEditor(
    fieldName: string,
    config: MessageEditorFieldConfig,
    value: any,
    context: FieldRenderContext
  ): TemplateResult {
    const {
      errors = [],
      onChange,
      showLabel = true,
      extraClasses,
      style,
      additionalData = {}
    } = context;

    return html`<temba-message-editor
      name="${fieldName}"
      label="${showLabel ? config.label : ''}"
      ?required="${config.required}"
      .errors="${errors}"
      .value="${value || ''}"
      .attachments="${additionalData.attachments || []}"
      placeholder="${config.placeholder || ''}"
      .helpText="${config.helpText || ''}"
      ?autogrow="${config.autogrow}"
      ?gsm="${config.gsm}"
      ?disableCompletion="${config.disableCompletion}"
      counter="${config.counter || ''}"
      accept="${config.accept || ''}"
      endpoint="${config.endpoint || ''}"
      max-attachments="${config.maxAttachments || 3}"
      minHeight="${config.minHeight || 60}"
      class="${extraClasses}"
      style="${style}"
      @change="${onChange || (() => {})}"
    ></temba-message-editor>`;
  }
}

/**
 * Context object for field rendering that provides additional options
 */
export interface FieldRenderContext {
  /** Array of error messages for the field */
  errors?: string[];
  /** Change event handler */
  onChange?: (event: Event) => void;
  /** Whether to show the field label */
  showLabel?: boolean;
  /** Flavor for components that support it (like temba-select) */
  flavor?: string;
  /** Additional CSS classes to apply */
  extraClasses?: string;
  /** Additional CSS styles to apply */
  style?: string;
  /** Additional data needed for specific field types */
  additionalData?: Record<string, any>;
}
