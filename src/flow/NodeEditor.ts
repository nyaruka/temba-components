import { html, TemplateResult, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { Node, NodeUI, Action } from '../store/flow-definition';
import {
  ValidationResult,
  NodeConfig,
  NODE_CONFIG,
  ACTION_CONFIG,
  FieldConfig
} from './config';
import {
  SelectFieldConfig,
  CheckboxFieldConfig,
  TextareaFieldConfig
} from './types';
import { CustomEventType } from '../interfaces';
import { generateUUID } from '../utils';

export class NodeEditor extends RapidElement {
  static get styles() {
    return css`
      .node-editor-form {
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

      .form-field label {
        font-weight: 500;
        margin-bottom: 6px;
        color: #333;
        font-size: 14px;
      }

      .field-errors {
        color: #dc2626;
        font-size: 12px;
        margin-top: 4px;
      }

      .form-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
      }

      .action-section {
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 15px;
        margin: 10px 0;
      }

      .action-section h3 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 14px;
        font-weight: 600;
      }

      .router-section {
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 15px;
        margin: 10px 0;
      }

      .router-section h3 {
        margin: 0 0 10px 0;
        color: #333;
        font-size: 14px;
        font-weight: 600;
      }
    `;
  }

  @property({ type: Object })
  action?: Action;

  @property({ type: Object })
  node?: Node;

  @property({ type: Object })
  nodeUI?: NodeUI;

  @property({ type: Boolean })
  isOpen: boolean = false;

  @state()
  private formData: any = {};

  @state()
  private errors: { [key: string]: string } = {};

  connectedCallback(): void {
    super.connectedCallback();
    this.initializeFormData();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);
    if (changedProperties.has('node') || changedProperties.has('action')) {
      if (this.node || this.action) {
        this.openDialog();
      } else {
        this.isOpen = false;
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

  private initializeFormData(): void {
    if (this.action) {
      // Action editing mode - use action config
      const actionConfig = ACTION_CONFIG[this.action.type];

      if (actionConfig?.toFormData) {
        this.formData = actionConfig.toFormData(this.action);
      } else {
        this.formData = { ...this.action };
      }

      // Convert Record objects to array format for key-value editors
      this.processFormDataForEditing();
    } else if (this.node) {
      // Node editing mode - use node config
      const nodeConfig = this.getNodeConfig();
      if (nodeConfig?.toFormData) {
        this.formData = nodeConfig.toFormData(this.node);
      } else {
        this.formData = { ...this.node };
      }

      // Convert Record objects to array format for key-value editors
      this.processFormDataForEditing();
    }
  }

  private processFormDataForEditing(): void {
    const processed = { ...this.formData };

    // Convert Record objects to key-value arrays for key-value editors
    Object.keys(processed).forEach((key) => {
      const value = processed[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Check if this field should be a key-value editor
        const isKeyValueField = this.isKeyValueField(key);
        if (isKeyValueField) {
          // Convert Record to array format
          processed[key] = Object.entries(value).map(([k, v]) => ({
            key: k,
            value: v
          }));
        }
      }
    });

    this.formData = processed;
  }

  private isKeyValueField(fieldName: string): boolean {
    // Check if this field is configured as a key-value type
    if (this.action) {
      const actionConfig = ACTION_CONFIG[this.action.type];
      return actionConfig?.fields?.[fieldName]?.type === 'key-value';
    }
    return false;
  }

  private getNodeConfig(): NodeConfig | null {
    if (!this.nodeUI) return null;
    // Get node config based on the nodeUI's type
    return this.nodeUI.type ? NODE_CONFIG[this.nodeUI.type] : null;
  }

  private getHeaderColor(): string {
    if (this.action) {
      // Action editing mode
      const actionConfig = ACTION_CONFIG[this.action.type];
      return actionConfig?.color || '#666666';
    } else if (this.node) {
      // Node editing mode
      const nodeConfig = this.getNodeConfig();
      return nodeConfig?.color || '#666666';
    }
    return '#666666';
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
    // Validate the form
    const validation = this.validateForm();
    if (!validation.valid) {
      this.errors = validation.errors;
      return;
    }

    // Process form data to convert key-value arrays to Records before saving
    const processedFormData = this.processFormDataForSave();

    // Determine whether to use node or action saving based on context
    // If we have a node with a router, always use node saving (even if action is set)
    // because router configuration is handled at the node level
    if (this.node && this.node.router) {
      // Node editing mode with router - use formDataToNode
      const updatedNode = this.formDataToNode(processedFormData);
      this.fireCustomEvent(CustomEventType.NodeSaved, {
        node: updatedNode
      });
    } else if (this.action) {
      // Pure action editing mode (no router)
      const updatedAction = this.formDataToAction(processedFormData);
      this.fireCustomEvent(CustomEventType.ActionSaved, {
        action: updatedAction
      });
    } else if (this.node) {
      // Node editing mode without router
      const updatedNode = this.formDataToNode(processedFormData);
      this.fireCustomEvent(CustomEventType.NodeSaved, {
        node: updatedNode
      });
    }
  }

  private processFormDataForSave(): any {
    const processed = { ...this.formData };

    // Convert key-value arrays to Records
    Object.keys(processed).forEach((key) => {
      const value = processed[key];
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object' &&
        'key' in value[0] &&
        'value' in value[0]
      ) {
        // This is a key-value array, convert to Record
        const record: Record<string, string> = {};
        value.forEach(({ key: k, value: v }) => {
          if (k.trim() !== '' || v.trim() !== '') {
            record[k] = v;
          }
        });
        processed[key] = record;
      } else if (Array.isArray(value) && value.length === 0) {
        // Empty key-value array should become empty object
        const isKeyValueField = this.isKeyValueField(key);
        if (isKeyValueField) {
          processed[key] = {};
        }
      }
    });

    return processed;
  }

  private handleCancel(): void {
    this.fireCustomEvent(CustomEventType.NodeEditCancelled, {});
  }

  private validateForm(): ValidationResult {
    const errors: { [key: string]: string } = {};

    if (this.action) {
      // Action validation using fields configuration
      const actionConfig = ACTION_CONFIG[this.action.type];

      // Check if new field configuration system is available
      if (actionConfig?.fields) {
        Object.entries(actionConfig.fields).forEach(
          ([fieldName, fieldConfig]) => {
            const value = this.formData[fieldName];

            // Check required fields
            if (
              fieldConfig.required &&
              (!value || (Array.isArray(value) && value.length === 0))
            ) {
              errors[fieldName] = `${
                fieldConfig.label || fieldName
              } is required`;
            }

            // Check minLength for text fields
            if (
              typeof value === 'string' &&
              fieldConfig.minLength &&
              value.length < fieldConfig.minLength
            ) {
              errors[fieldName] = `${
                fieldConfig.label || fieldName
              } must be at least ${fieldConfig.minLength} characters`;
            }

            // Check maxLength for text fields
            if (
              typeof value === 'string' &&
              fieldConfig.maxLength &&
              value.length > fieldConfig.maxLength
            ) {
              errors[fieldName] = `${
                fieldConfig.label || fieldName
              } must be no more than ${fieldConfig.maxLength} characters`;
            }
          }
        );
      }

      // Run custom validation if available
      if (actionConfig?.validate) {
        // Convert form data back to action for validation
        let actionForValidation: Action;
        if (actionConfig.fromFormData) {
          actionForValidation = actionConfig.fromFormData(this.formData);
        } else {
          actionForValidation = { ...this.action, ...this.formData } as Action;
        }

        const customValidation = actionConfig.validate(actionForValidation);
        Object.assign(errors, customValidation.errors);
      }
    } else if (this.node) {
      // Node validation
      const nodeConfig = this.getNodeConfig();

      // Check required fields from node properties
      if (nodeConfig?.properties) {
        Object.entries(nodeConfig.properties).forEach(
          ([fieldName, fieldConfig]) => {
            const value = this.formData[fieldName];

            // Check required fields
            if (
              fieldConfig.required &&
              (!value || (Array.isArray(value) && value.length === 0))
            ) {
              errors[fieldName] = `${
                fieldConfig.label || fieldName
              } is required`;
            }
          }
        );
      }
    }

    // Validate key-value fields for unique keys
    this.validateKeyValueUniqueness(errors);

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  private validateKeyValueUniqueness(errors: { [key: string]: string }): void {
    // The individual key-value editors will show validation errors on duplicate keys and empty keys with values
    // We just need to prevent form submission when there are validation issues
    Object.entries(this.formData).forEach(([fieldName, value]) => {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object' &&
        'key' in value[0] &&
        'value' in value[0]
      ) {
        // This is a key-value array
        let hasValidationErrors = false;

        // Check for empty keys with values
        value.forEach(({ key, value: itemValue }: any) => {
          if (key.trim() === '' && itemValue.trim() !== '') {
            hasValidationErrors = true;
          }
        });

        // Check for duplicate keys (only non-empty ones)
        const keys = value
          .filter(({ key }: any) => key.trim() !== '') // Only check non-empty keys
          .map(({ key }: any) => key.trim());

        const uniqueKeys = new Set(keys);

        if (keys.length !== uniqueKeys.size) {
          hasValidationErrors = true;
        }

        if (hasValidationErrors) {
          errors[fieldName] = `Please resolve validation errors before saving`;
        }
      }
    });
  }

  private formDataToNode(formData: any = this.formData): Node {
    if (!this.node) throw new Error('No node to update');
    let updatedNode: Node = { ...this.node };

    // Handle actions using action config transformations if available
    if (this.node.actions && this.node.actions.length > 0) {
      updatedNode.actions = this.node.actions.map((action) => {
        // If we're editing a specific action, only transform that one
        if (this.action && action.uuid === this.action.uuid) {
          const actionConfig = ACTION_CONFIG[action.type];
          if (actionConfig?.fromFormData) {
            // Use action-specific form data transformation
            return actionConfig.fromFormData(formData);
          } else {
            // Default transformation - merge form data with original action
            return { ...action, ...formData };
          }
        } else {
          // Keep other actions unchanged
          return action;
        }
      });
    }

    // Handle router configuration using node config
    if (this.node.router) {
      const nodeConfig = this.getNodeConfig();

      if (nodeConfig?.fromFormData) {
        // Use node-specific form data transformation
        updatedNode = nodeConfig.fromFormData(formData, updatedNode);
      } else {
        // Default router handling
        updatedNode.router = { ...this.node.router };

        // Apply form data to router fields if they exist
        if (formData.result_name !== undefined) {
          updatedNode.router.result_name = formData.result_name;
        }

        // Handle preconfigured rules from node config
        if (nodeConfig?.router?.rules) {
          // Build a complete new set of categories and exits based on node config
          const existingCategories = updatedNode.router.categories || [];
          const existingExits = updatedNode.exits || [];

          const newCategories: any[] = [];
          const newExits: any[] = [];

          // Group rules by category name to handle multiple rules pointing to the same category
          const categoryNameToRules = new Map<
            string,
            typeof nodeConfig.router.rules
          >();
          nodeConfig.router.rules.forEach((rule) => {
            if (!categoryNameToRules.has(rule.categoryName)) {
              categoryNameToRules.set(rule.categoryName, []);
            }
            categoryNameToRules.get(rule.categoryName)!.push(rule);
          });

          // Create categories for all unique category names
          categoryNameToRules.forEach((rules, categoryName) => {
            // Check if category already exists to preserve its UUID and exit_uuid
            const existingCategory = existingCategories.find(
              (cat) => cat.name === categoryName
            );

            if (existingCategory) {
              // Preserve existing category and its associated exit
              newCategories.push(existingCategory);
              const associatedExit = existingExits.find(
                (exit) => exit.uuid === existingCategory.exit_uuid
              );
              if (associatedExit) {
                newExits.push(associatedExit);
              }
            } else {
              // Create new category and exit
              const categoryUuid = generateUUID();
              const exitUuid = generateUUID();

              newCategories.push({
                uuid: categoryUuid,
                name: categoryName,
                exit_uuid: exitUuid
              });

              newExits.push({
                uuid: exitUuid,
                destination_uuid: null
              });
            }
          });

          // Add default category if specified
          if (nodeConfig.router.defaultCategory) {
            // Check if default category already exists in our new list
            const existingDefault = newCategories.find(
              (cat) => cat.name === nodeConfig.router.defaultCategory
            );

            if (!existingDefault) {
              // Check if it exists in the original categories
              const originalDefault = existingCategories.find(
                (cat) => cat.name === nodeConfig.router.defaultCategory
              );

              if (originalDefault) {
                // Preserve existing default category and its exit
                newCategories.push(originalDefault);
                const associatedExit = existingExits.find(
                  (exit) => exit.uuid === originalDefault.exit_uuid
                );
                if (associatedExit) {
                  newExits.push(associatedExit);
                }
              } else {
                // Create new default category and exit
                const categoryUuid = generateUUID();
                const exitUuid = generateUUID();

                newCategories.push({
                  uuid: categoryUuid,
                  name: nodeConfig.router.defaultCategory,
                  exit_uuid: exitUuid
                });

                newExits.push({
                  uuid: exitUuid,
                  destination_uuid: null
                });
              }
            }
          }

          // Replace the entire categories and exits lists with our complete new sets
          updatedNode.router.categories = newCategories;
          updatedNode.exits = newExits;
        }
      }
    } else {
      // If no router, just apply form data to node properties
      Object.keys(formData).forEach((key) => {
        if (
          key !== 'uuid' &&
          key !== 'actions' &&
          key !== 'exits' &&
          key !== 'router'
        ) {
          (updatedNode as any)[key] = formData[key];
        }
      });
    }

    return updatedNode;
  }

  private formDataToAction(formData: any = this.formData): Action {
    if (!this.action) throw new Error('No action to update');

    // Use action config transformation if available
    const actionConfig = ACTION_CONFIG[this.action.type];
    if (actionConfig?.fromFormData) {
      return actionConfig.fromFormData(formData);
    } else {
      // Provide default 1:1 mapping when no transformation is provided
      return { ...this.action, ...formData };
    }
  }

  private handleFormFieldChange(propertyName: string, event: Event): void {
    const target = event.target as any;
    let value: any;

    // Handle different component types like ActionEditor does
    if (target.tagName === 'TEMBA-CHECKBOX') {
      value = target.checked;
    } else if (
      target.tagName === 'TEMBA-SELECT' &&
      (target.multi || target.emails || target.tags)
    ) {
      value = target.values || [];
    } else if (target.values !== undefined) {
      value = target.values;
    } else {
      value = target.value;
    }

    this.formData = {
      ...this.formData,
      [propertyName]: value
    };

    // Clear any existing error for this field
    if (this.errors[propertyName]) {
      const newErrors = { ...this.errors };
      delete newErrors[propertyName];
      this.errors = newErrors;
    }

    // Trigger re-render to handle conditional field visibility
    this.requestUpdate();
  }

  private renderNewField(
    fieldName: string,
    config: FieldConfig,
    value: any
  ): TemplateResult {
    // Check visibility condition
    if (config.conditions?.visible) {
      try {
        const isVisible = config.conditions.visible(this.formData);
        if (!isVisible) {
          return html``;
        }
      } catch (error) {
        console.error(`Error checking visibility for ${fieldName}:`, error);
        // If there's an error, show the field by default
      }
    }

    const errors = this.errors[fieldName] ? [this.errors[fieldName]] : [];

    switch (config.type) {
      case 'text':
        return html`<temba-textinput
          name="${fieldName}"
          label="${config.label}"
          ?required="${config.required}"
          .errors="${errors}"
          .value="${value || ''}"
          placeholder="${config.placeholder || ''}"
          .helpText="${config.helpText || ''}"
          @input="${(e: Event) => this.handleFormFieldChange(fieldName, e)}"
        ></temba-textinput>`;

      case 'textarea': {
        const textareaConfig = config as TextareaFieldConfig;
        const minHeightStyle = textareaConfig.minHeight
          ? `--textarea-min-height: ${textareaConfig.minHeight}px;`
          : '';

        if (config.evaluated) {
          return html`<temba-completion
            name="${fieldName}"
            label="${config.label}"
            ?required="${config.required}"
            .errors="${errors}"
            .value="${value || ''}"
            placeholder="${config.placeholder || ''}"
            textarea
            expressions="session"
            style="${minHeightStyle}"
            .helpText="${config.helpText || ''}"
            @input="${(e: Event) => this.handleFormFieldChange(fieldName, e)}"
          ></temba-completion>`;
        } else {
          return html`<temba-textinput
            name="${fieldName}"
            label="${config.label}"
            ?required="${config.required}"
            .errors="${errors}"
            .value="${value || ''}"
            placeholder="${config.placeholder || ''}"
            textarea
            .rows="${textareaConfig.rows || 3}"
            style="${minHeightStyle}"
            .helpText="${config.helpText || ''}"
            @input="${(e: Event) => this.handleFormFieldChange(fieldName, e)}"
          ></temba-textinput>`;
        }
      }

      case 'select': {
        const selectConfig = config as SelectFieldConfig;
        return html`<temba-select
          name="${fieldName}"
          label="${config.label}"
          ?required="${config.required}"
          .errors="${errors}"
          .values="${value || (selectConfig.multi ? [] : '')}"
          ?multi="${selectConfig.multi}"
          ?searchable="${selectConfig.searchable}"
          ?tags="${selectConfig.tags}"
          ?emails="${selectConfig.emails}"
          placeholder="${selectConfig.placeholder || ''}"
          maxItems="${selectConfig.maxItems || 0}"
          valueKey="${selectConfig.valueKey || 'value'}"
          nameKey="${selectConfig.nameKey || 'name'}"
          endpoint="${selectConfig.endpoint || ''}"
          .helpText="${config.helpText || ''}"
          @change="${(e: Event) => this.handleFormFieldChange(fieldName, e)}"
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

      case 'key-value':
        return html`<div class="form-field">
          <label>${config.label}${config.required ? ' *' : ''}</label>
          <temba-key-value-editor
            name="${fieldName}"
            .value="${value || []}"
            .sortable="${config.sortable}"
            .keyPlaceholder="${config.keyPlaceholder || 'Key'}"
            .valuePlaceholder="${config.valuePlaceholder || 'Value'}"
            .minRows="${config.minRows || 0}"
            @change="${(e: CustomEvent) => {
              if (e.detail) {
                this.handleNewFieldChange(fieldName, e.detail.value);
              }
            }}"
          ></temba-key-value-editor>
          ${errors.length
            ? html`<div class="field-errors">${errors.join(', ')}</div>`
            : ''}
        </div>`;

      case 'array':
        return html`<div class="form-field">
          <label>${config.label}${config.required ? ' *' : ''}</label>
          <temba-array-editor
            .value="${value || []}"
            .itemConfig="${config.itemConfig}"
            .sortable="${config.sortable}"
            .itemLabel="${config.itemLabel || 'Item'}"
            .minItems="${config.minItems || 0}"
            .onItemChange="${config.onItemChange}"
            @change="${(e: CustomEvent) =>
              this.handleNewFieldChange(fieldName, e.detail.value)}"
          ></temba-array-editor>
          ${errors.length
            ? html`<div class="field-errors">${errors.join(', ')}</div>`
            : ''}
        </div>`;

      case 'checkbox': {
        const checkboxConfig = config as CheckboxFieldConfig;
        return html`<div class="form-field">
          <temba-checkbox
            name="${fieldName}"
            label="${config.label}"
            .helpText="${config.helpText || ''}"
            ?required="${config.required}"
            .errors="${errors}"
            ?checked="${value || false}"
            size="${checkboxConfig.size || 1.2}"
            animateChange="${checkboxConfig.animateChange || 'pulse'}"
            @change="${(e: Event) => this.handleFormFieldChange(fieldName, e)}"
          ></temba-checkbox>
          ${errors.length
            ? html`<div class="field-errors">${errors.join(', ')}</div>`
            : ''}
        </div>`;
      }

      default:
        return html`<div>Unsupported field type: ${(config as any).type}</div>`;
    }
  }

  private handleNewFieldChange(fieldName: string, value: any) {
    this.formData = {
      ...this.formData,
      [fieldName]: value
    };

    // Clear any existing error for this field
    if (this.errors[fieldName]) {
      const newErrors = { ...this.errors };
      delete newErrors[fieldName];
      this.errors = newErrors;
    }

    // Trigger re-render
    this.requestUpdate();
  }

  private renderFields(): TemplateResult {
    if (!this.action) {
      return html` <div>No action selected</div> `;
    }

    const config = ACTION_CONFIG[this.action.type];
    if (!config) {
      return html` <div>No configuration available for this action</div> `;
    }

    // Use the new fields configuration system
    if (config.fields) {
      return html`
        ${Object.entries(config.fields).map(([fieldName, fieldConfig]) =>
          this.renderNewField(
            fieldName,
            fieldConfig as FieldConfig,
            this.formData[fieldName]
          )
        )}
      `;
    }

    return html` <div>No form configuration available</div> `;
  }

  private renderActionSection(): TemplateResult {
    if (!this.node || this.node.actions.length === 0) {
      return html``;
    }

    const nodeConfig = this.getNodeConfig();

    // If node has an action config, defer to ActionEditor
    if (nodeConfig?.action) {
      const action = this.node.actions[0]; // Assume single action for now

      return html`
        <div class="action-section">
          <h3>Action Configuration</h3>
          <div class="action-preview">
            <p><strong>Type:</strong> ${action.type}</p>
            <p><em>Action details will be editable here</em></p>
          </div>
        </div>
      `;
    }

    return html``;
  }

  private renderRouterSection(): TemplateResult {
    if (!this.node?.router) {
      return html``;
    }

    const nodeConfig = this.getNodeConfig();

    return html`
      <div class="router-section">
        <h3>Router Configuration</h3>
        ${nodeConfig?.router
          ? this.renderRouterConfig()
          : html`<p>Basic router (no advanced configuration)</p>`}
      </div>
    `;
  }

  private renderRouterConfig(): TemplateResult {
    const nodeConfig = this.getNodeConfig();
    if (!nodeConfig?.router) return html``;

    // Render router configuration based on node config
    // This is where you'd render rule and category editors
    return html`
      <div class="router-config">
        <p><strong>Type:</strong> ${nodeConfig.router.type}</p>
        ${nodeConfig.router.rules
          ? html`
              <div class="rules-section">
                <h4>Rules</h4>
                <!-- Future: Render rule editor based on nodeConfig.router.rules -->
                <p><em>Rule editing will be implemented here</em></p>
              </div>
            `
          : ''}
      </div>
    `;
  }

  render(): TemplateResult {
    if (!this.isOpen) {
      return html``;
    }

    const headerColor = this.getHeaderColor();
    const nodeConfig = this.getNodeConfig();
    const actionConfig = ACTION_CONFIG[this.action?.type];

    return html`
      <temba-dialog
        header="${actionConfig?.name || nodeConfig?.name || 'Edit'}"
        .open="${this.isOpen}"
        @temba-button-clicked=${this.handleDialogButtonClick}
        primaryButtonName="Save"
        cancelButtonName="Cancel"
        style="--header-bg: ${headerColor}"
      >
        <div class="node-editor-form">
          ${this.renderFields()}
          ${nodeConfig?.router?.configurable
            ? this.renderRouterSection()
            : null}
        </div>
      </temba-dialog>
    `;
  }
}
