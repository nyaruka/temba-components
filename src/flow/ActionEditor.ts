import { html, TemplateResult, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { Action } from '../store/flow-definition';
import {
  ValidationResult,
  PropertyConfig,
  getDefaultComponent,
  getDefaultComponentProps,
  EDITOR_CONFIG,
  CheckboxAttributes,
  CompletionAttributes,
  TextInputAttributes,
  SelectAttributes
} from './config';
import { FormElement } from '../form/FormElement';
import { CustomEventType } from '../interfaces';

export interface ActionEditorConfig {
  actionType: string;
  action: Action;
  nodeUuid: string;
  onSave: (updatedAction: Action) => void;
  onCancel: () => void;
}

export class ActionEditor extends RapidElement {
  static get styles() {
    return css`
      .action-editor-form {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        min-width: 400px;
        padding-bottom: 40px;
      }

      .form-field {
        display: flex;
        flex-direction: column;
      }

      .form-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
      }
    `;
  }

  @property({ type: Object })
  action: Action | null = null;

  @property({ type: String })
  nodeUuid: string = '';

  @state()
  private formData: { [key: string]: any } = {};

  @state()
  private errors: { [key: string]: string } = {};

  @state()
  private isOpen: boolean = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.action) {
      this.openDialog();
    }
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);

    if (changedProperties.has('action')) {
      if (this.action) {
        this.openDialog();
      } else {
        this.closeDialog();
      }
    }
  }

  private openDialog(): void {
    this.initializeFormData();
    this.errors = {};
    this.isOpen = true;
  }

  private closeDialog(): void {
    this.isOpen = false;
    this.formData = {};
    this.errors = {};
  }

  public open(config: ActionEditorConfig): void {
    this.action = config.action;
    this.nodeUuid = config.nodeUuid;
    this.openDialog();
  }

  public close(): void {
    this.closeDialog();
    this.action = null;
  }

  private initializeFormData(): void {
    if (!this.action) return;

    const config = this.getActionConfig();
    
    // Use new form-level transformation if available
    if (config?.toFormValue) {
      this.formData = config.toFormValue(this.action);
    } else {
      // Fall back to legacy per-property transformations or 1:1 mapping
      this.formData = { ...this.action };

      // Apply legacy per-property transformation functions
      if (config?.properties) {
        Object.entries(config.properties).forEach(
          ([propertyName, propertyConfig]) => {
            if ((propertyConfig as PropertyConfig).toFormValue && this.action) {
              const actionValue = this.action[propertyName as keyof Action];
              this.formData[propertyName] = (propertyConfig as PropertyConfig)
                .toFormValue!(actionValue);
            }
          }
        );
      }
    }
  }

  private getActionConfig() {
    if (!this.action) return null;
    return EDITOR_CONFIG[this.action.type] || null;
  }

  private getHeaderColor(): string {
    if (!this.action) return '#666666';
    const config = this.getActionConfig();
    return config?.color || '#666666';
  }

  private handleDialogButtonClick(event: CustomEvent): void {
    const button = event.detail.button;

    if (button.name === 'Save') {
      this.handleSave();
    } else if (button.name === 'Cancel') {
      this.handleCancel();
    }
  }

  private handleSave(): void {
    if (!this.action) return;

    // Validate the form
    const validation = this.validateForm();
    if (!validation.valid) {
      this.errors = validation.errors;
      return;
    }

    // Apply transformation functions to convert form data back to action data
    const config = this.getActionConfig();
    let updatedAction: Action;

    // Use new form-level transformation if available
    if (config?.fromFormValue) {
      updatedAction = config.fromFormValue(this.formData);
    } else {
      // Fall back to legacy per-property transformations or 1:1 mapping
      const transformedFormData = { ...this.formData };

      if (config?.properties) {
        Object.entries(config.properties).forEach(
          ([propertyName, propertyConfig]) => {
            if ((propertyConfig as PropertyConfig).fromFormValue) {
              const formValue = this.formData[propertyName];
              transformedFormData[propertyName] = (
                propertyConfig as PropertyConfig
              ).fromFormValue!(formValue);
            }
          }
        );
      }

      // Create updated action
      updatedAction = {
        ...this.action,
        ...transformedFormData
      };
    }

    // Fire save event
    this.fireCustomEvent(CustomEventType.ActionSaved, {
      action: updatedAction
    });
    this.closeDialog();
  }

  private handleCancel(): void {
    this.fireCustomEvent(CustomEventType.ActionEditCanceled, {});
    this.closeDialog();
  }

  private validateForm(): ValidationResult {
    const config = this.getActionConfig();

    // Convert form data back to action for validation
    let actionForValidation: Action;
    
    if (config?.fromFormValue) {
      actionForValidation = config.fromFormValue(this.formData);
    } else {
      // Fall back to legacy per-property transformations or 1:1 mapping
      const transformedFormData = { ...this.formData };

      if (config?.properties) {
        Object.entries(config.properties).forEach(
          ([propertyName, propertyConfig]) => {
            if ((propertyConfig as PropertyConfig).fromFormValue) {
              const formValue = this.formData[propertyName];
              transformedFormData[propertyName] = (
                propertyConfig as PropertyConfig
              ).fromFormValue!(formValue);
            }
          }
        );
      }

      actionForValidation = {
        ...this.action,
        ...transformedFormData
      } as Action;
    }

    // Run custom validation if available
    if (config?.validate) {
      return config.validate(actionForValidation);
    }

    // Basic validation based on form field configs
    const errors: { [key: string]: string } = {};

    // Get the form configuration (prefer 'form' over 'properties')
    const formConfig = config?.form || config?.properties;

    if (formConfig) {
      Object.entries(formConfig).forEach(
        ([fieldName, fieldConfig]) => {
          const value = this.formData[fieldName];
          const propConfig = fieldConfig as PropertyConfig;

          if (
            propConfig.required &&
            (!value || (Array.isArray(value) && value.length === 0))
          ) {
            errors[fieldName] = `${
              propConfig.label || fieldName
            } is required`;
          }

          if (
            typeof value === 'string' &&
            propConfig.minLength &&
            value.length < propConfig.minLength
          ) {
            errors[fieldName] = `${
              propConfig.label || fieldName
            } must be at least ${propConfig.minLength} characters`;
          }

          if (
            typeof value === 'string' &&
            propConfig.maxLength &&
            value.length > propConfig.maxLength
          ) {
            errors[fieldName] = `${
              propConfig.label || fieldName
            } must be no more than ${propConfig.maxLength} characters`;
          }
        }
      );
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  private handleFormFieldChange(propertyName: string, event: Event): void {
    const target = event.target as FormElement;
    let value = target.value;

    // Handle different component types
    if (target.tagName === 'TEMBA-CHECKBOX') {
      value = (target as any).checked;
    } else if (
      target.tagName === 'TEMBA-SELECT' &&
      ((target as any).multi || (target as any).emails || (target as any).tags)
    ) {
      value = (target as any).values || [];
    }

    this.formData = {
      ...this.formData,
      [propertyName]: value
    };

    // Clear error for this field if it exists
    if (this.errors[propertyName]) {
      this.errors = {
        ...this.errors,
        [propertyName]: ''
      };
      delete this.errors[propertyName];
    }
  }

  private renderProperty(
    propertyName: string,
    propertyConfig: PropertyConfig
  ): TemplateResult {
    const value = this.formData[propertyName];
    const config = propertyConfig;
    const component = config.widget?.type || getDefaultComponent(value);
    const defaultProps = getDefaultComponentProps(value);
    const attributes = config.widget?.attributes || {};
    const propertyErrors = this.errors[propertyName]
      ? [this.errors[propertyName]]
      : [];

    // Evaluate conditional behavior
    const conditions = config.conditions;
    const isVisible = conditions?.visible
      ? conditions.visible(this.formData)
      : true;
    const isDynamicRequired = conditions?.required
      ? conditions.required(this.formData)
      : null;
    const isDisabled = conditions?.disabled
      ? conditions.disabled(this.formData)
      : false;

    // Don't render if not visible
    if (!isVisible) {
      return html``;
    }

    // Common properties for all form elements
    const name = propertyName;
    const label = config.label;
    const help_text = config.helpText;
    // Use dynamic required if available, otherwise fall back to config required
    const required =
      isDynamicRequired !== null ? isDynamicRequired : config.required;

    let fieldHtml: TemplateResult;

    switch (component) {
      case 'temba-textinput': {
        const textInputAttrs = attributes as TextInputAttributes;
        fieldHtml = html`<temba-textinput
          name="${name}"
          label="${label}"
          help_text="${help_text}"
          ?required="${required}"
          .errors="${propertyErrors}"
          .value="${value || ''}"
          type="${textInputAttrs.type || 'text'}"
          ?textarea="${textInputAttrs.textarea}"
          placeholder="${textInputAttrs.placeholder || ''}"
          ?disabled="${isDisabled}"
          @input="${(e: Event) => this.handleFormFieldChange(propertyName, e)}"
        ></temba-textinput>`;
        break;
      }

      case 'temba-completion': {
        const completionAttrs = attributes as CompletionAttributes;
        fieldHtml = html`<temba-completion
          name="${name}"
          label="${label}"
          help_text="${help_text}"
          ?required="${required}"
          .errors="${propertyErrors}"
          .value="${value || ''}"
          ?textarea="${completionAttrs.textarea}"
          expressions="${completionAttrs.expressions || ''}"
          placeholder="${completionAttrs.placeholder || ''}"
          .minHeight="${completionAttrs.minHeight}"
          ?disabled="${isDisabled}"
          @input="${(e: Event) => this.handleFormFieldChange(propertyName, e)}"
        ></temba-completion>`;
        break;
      }

      case 'temba-checkbox': {
        const checkboxAttrs = attributes as CheckboxAttributes;
        fieldHtml = html`<temba-checkbox
          name="${name}"
          label="${label}"
          help_text="${help_text}"
          ?required="${required}"
          .errors="${propertyErrors}"
          ?checked="${value}"
          size="${checkboxAttrs.size || 1.2}"
          ?disabled="${isDisabled || checkboxAttrs.disabled}"
          animateChange="${checkboxAttrs.animateChange || 'pulse'}"
          @change="${(e: Event) => this.handleFormFieldChange(propertyName, e)}"
        ></temba-checkbox> `;
        break;
      }

      case 'temba-select': {
        const selectAttrs = attributes as SelectAttributes;
        const defaultMulti =
          defaultProps.widget?.attributes &&
          'multi' in defaultProps.widget.attributes
            ? defaultProps.widget.attributes.multi
            : false;
        fieldHtml = html`<temba-select
          name="${name}"
          label=${label || ''}
          help_text="${help_text}"
          ?required="${required}"
          .errors="${propertyErrors}"
          .values="${value || (selectAttrs.multi || defaultMulti ? [] : '')}"
          ?multi="${selectAttrs.multi || defaultMulti}"
          ?searchable="${selectAttrs.searchable}"
          ?tags="${selectAttrs.tags}"
          ?emails="${selectAttrs.emails}"
          valueKey="${selectAttrs.valueKey || 'value'}"
          nameKey="${selectAttrs.nameKey || 'name'}"
          maxItems="${selectAttrs.maxItems || 0}"
          maxItemsText="${selectAttrs.maxItemsText}"
          placeholder="${selectAttrs.placeholder || ''}"
          endpoint="${selectAttrs.endpoint || ''}"
          ?disabled="${isDisabled}"
          @change="${(e: Event) => this.handleFormFieldChange(propertyName, e)}"
        >
          ${selectAttrs.options?.map(
            (option: any) =>
              html`<temba-option
                name="${option.name}"
                value="${option.value}"
              ></temba-option>`
          )}
        </temba-select>`;
        break;
      }

      default:
        fieldHtml = html`<div>Unsupported component: ${component}</div>`;
    }

    return html` <div class="form-field">${fieldHtml}</div> `;
  }

  private renderForm(): TemplateResult {
    const config = this.getActionConfig();

    if (!config || !this.action) {
      return html`
        <div class="action-editor-form">
          <div>
            No configuration available for action type:
            ${this.action?.type || 'unknown'}
          </div>
        </div>
      `;
    }

    // Use 'form' configuration if available, otherwise fall back to 'properties'
    const formConfig = config.form || config.properties;
    
    if (!formConfig) {
      return html`
        <div class="action-editor-form">
          <div>No form configuration available</div>
        </div>
      `;
    }

    return html`
      <div class="action-editor-form">
        ${Object.entries(formConfig).map(
          ([fieldName, fieldConfig]) =>
            this.renderProperty(fieldName, fieldConfig as PropertyConfig)
        )}
      </div>
    `;
  }

  public render(): TemplateResult {
    if (!this.isOpen) {
      return html``;
    }

    const config = this.getActionConfig();
    const headerColor = this.getHeaderColor();

    return html`
      <temba-dialog
        .open="${this.isOpen}"
        .header="${config?.name || 'Edit Action'}"
        primaryButtonName="Save"
        cancelButtonName="Cancel"
        size="medium"
        @temba-button-clicked="${this.handleDialogButtonClick}"
        @temba-dialog-hidden="${this.handleCancel}"
        style="--header-bg: ${headerColor}"
      >
        ${this.renderForm()}
      </temba-dialog>
    `;
  }
}
