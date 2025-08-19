import { html, TemplateResult, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { Node, NodeUI, Action } from '../store/flow-definition';
import {
  ValidationResult,
  NodeConfig,
  NODE_CONFIG,
  ACTION_CONFIG,
  FieldConfig,
  ActionConfig
} from './config';
import {
  SelectFieldConfig,
  LayoutItem,
  RowLayoutConfig,
  GroupLayoutConfig
} from './types';
import { CustomEventType } from '../interfaces';
import { generateUUID } from '../utils';
import { FieldRenderer } from '../form/FieldRenderer';

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

        --color-bubble-bg: rgba(255, 255, 255, 0.8);
        --color-bubble-border: #999;
        --color-bubble-text: #777;
      }

      .form-field {
        display: flex;
        flex-direction: column;
      }

      .form-field label {
      }

      .field-errors {
        color: var(--color-error, tomato);
        font-size: 12px;
        margin-left: 5px;
        margin-top: 15px;
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

      .form-row {
        display: grid;
        gap: 1rem;
        align-items: end;
      }

      .form-group {
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        overflow: hidden;
      }

      .form-group.has-errors {
        border-color: var(--color-error, tomato);
      }

      .form-group.has-bubble {
        border-width: 1px;
        border-color: var(--color-bubble-border, #aaa);
      }

      .form-group-header {
        background: #f8f9fa;
        padding: 8px 10px;
        border-bottom: 1px solid #e0e0e0;

        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
      }

      .form-group.has-bubble .form-group-header {
      }

      .collapsed .form-group-header {
        border: none;
      }

      .form-group-header:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      .form-group-header.collapsible:hover {
        background: #f1f3f4;
      }

      .form-group-info {
        flex: 1;
      }

      .form-group-title {
        font-weight: 500;
        color: var(--color-label, #777);
        font-size: 14px;
        display: flex;
      }

      .form-group-help {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
      }

      .form-group-toggle {
        color: #666;
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
      }

      .form-group-toggle.collapsed {
        transform: rotate(-90deg);
      }

      .form-group-content {
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        overflow: hidden;
        transition: all 0.2s ease-in-out;

        opacity: 1;
      }

      .form-group-content.collapsed {
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        opacity: 0;
      }

      .group-toggle-icon {
        color: #666;
        transition: transform 0.3s ease, opacity 0.3s ease;
        cursor: pointer;
        transform: rotate(0deg);
        opacity: 1;
      }

      .group-toggle-icon.faded {
        opacity: 0;
      }

      .group-toggle-icon.expanded {
        transform: rotate(90deg);
      }

      .group-toggle-icon.collapsed {
        transform: rotate(0deg);
      }

      .group-toggle-icon:hover {
        color: #333;
      }

      .group-error-icon {
        color: var(--color-error, tomato);
        margin-right: 8px;
      }

      .group-count-bubble {
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        padding: 4px;
        min-width: 12px;
        min-height: 12px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        line-height: 0px;
        opacity: 1;
        transition: opacity 0.3s ease;
        background: var(--color-bubble-bg, #fff);
        border: 1px solid var(--color-bubble-border, #777);
        color: var(--color-bubble-text, #000);
      }

      .group-count-bubble.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .group-checkmark-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 1;
        transition: opacity 0.3s ease;
        border-radius: 50%;
        color: var(--color-bubble-text, #000);
        background: var(--color-bubble-bg, #fff);
        border: 1px solid var(--color-bubble-border, #777);
        padding: 0.2em;
      }

      .group-checkmark-icon.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .group-toggle-container {
        position: relative;
        display: flex;
        align-items: center;
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
  private originalFormData: any = {};

  @state()
  private errors: { [key: string]: string } = {};

  @state()
  private groupCollapseState: { [key: string]: boolean } = {};

  @state()
  private groupHoverState: { [key: string]: boolean } = {};

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
    this.groupCollapseState = {};
    this.groupHoverState = {};
  }

  private initializeFormData(): void {
    if (this.action) {
      // Action editing mode - use action config
      const actionConfig = ACTION_CONFIG[this.action.type];

      if (actionConfig?.toFormData) {
        this.formData = actionConfig.toFormData(this.action);
      } else {
        this.formData = { ...this.action };
        // Apply smart transformations for select fields that expect {name, value} format
        this.applySmartSelectTransformations(actionConfig);
      }

      // Convert Record objects to array format for key-value editors
      this.processFormDataForEditing();

      // Store a copy of the original form data for computed field comparisons
      this.originalFormData = JSON.parse(JSON.stringify(this.formData));
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

      // Store a copy of the original form data for computed field comparisons
      this.originalFormData = JSON.parse(JSON.stringify(this.formData));
    }

    // enforce immutability of formData
    Object.keys(this.formData).forEach((key) => {
      const value = this.formData[key];
      if (Array.isArray(value)) {
        this.formData[key] = [...value];
      } else if (value && typeof value === 'object') {
        // If it's an object, ensure we don't mutate the original
        this.formData[key] = { ...value };
      }
    });
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

  private applySmartSelectTransformations(actionConfig: ActionConfig): void {
    if (!actionConfig) return;

    const fields = actionConfig.form;
    if (!fields) return;

    Object.entries(fields).forEach(([fieldName, fieldConfig]) => {
      if (this.shouldApplySmartSelectTransformation(fieldName, fieldConfig)) {
        const value = this.formData[fieldName];
        if (
          Array.isArray(value) &&
          value.length > 0 &&
          typeof value[0] === 'string'
        ) {
          // Transform string array to select options format
          this.formData[fieldName] = value.map((item: string) => ({
            name: item,
            value: item
          }));
        }
      }
    });
  }

  private shouldApplySmartSelectTransformation(
    fieldName: string,
    fieldConfig: any
  ): boolean {
    const selectConfig = fieldConfig as SelectFieldConfig;
    return (
      (fieldConfig.type === 'select' &&
        (selectConfig.multi || selectConfig.tags) &&
        // Don't transform if already has explicit transformations
        !this.action) ||
      !ACTION_CONFIG[this.action.type]?.toFormData
    );
  }

  private isKeyValueField(fieldName: string): boolean {
    // Check if this field is configured as a key-value type
    if (this.action) {
      const actionConfig = ACTION_CONFIG[this.action.type];
      const fields = actionConfig?.form;
      return fields?.[fieldName]?.type === 'key-value';
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

      // Expand any groups that contain validation errors
      this.expandGroupsWithErrors(validation.errors);

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
      if (actionConfig?.form) {
        Object.entries(actionConfig?.form).forEach(
          ([fieldName, fieldConfig]) => {
            const value = this.formData[fieldName];

            // Check required fields
            if (
              (fieldConfig as any).required &&
              (!value || (Array.isArray(value) && value.length === 0))
            ) {
              errors[fieldName] = `${
                (fieldConfig as any).label || fieldName
              } is required.`;
            }

            // Check minLength for text fields
            if (
              typeof value === 'string' &&
              (fieldConfig as any).minLength &&
              value.length < (fieldConfig as any).minLength
            ) {
              errors[fieldName] = `${
                (fieldConfig as any).label || fieldName
              } must be at least ${(fieldConfig as any).minLength} characters`;
            }

            // Check maxLength for text fields
            if (
              typeof value === 'string' &&
              (fieldConfig as any).maxLength &&
              value.length > (fieldConfig as any).maxLength
            ) {
              errors[fieldName] = `${
                (fieldConfig as any).label || fieldName
              } must be no more than ${
                (fieldConfig as any).maxLength
              } characters`;
            }
          }
        );
      }

      // Run custom validation if available
      if (actionConfig?.validate) {
        // Convert form data back to action for validation
        let actionForValidation: Action;

        if (actionConfig.sanitize) {
          actionConfig.sanitize(this.formData);
        }

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
          errors[fieldName] = `Please resolve validation errors to continue`;
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
      // Apply smart select transformations in reverse and provide default 1:1 mapping
      const processedFormData = this.reverseSmartSelectTransformations(
        formData,
        actionConfig
      );
      return { ...this.action, ...processedFormData };
    }
  }

  private reverseSmartSelectTransformations(
    formData: any,
    actionConfig: ActionConfig
  ): any {
    if (!actionConfig || !actionConfig.form) return formData;
    const processed = { ...formData };

    Object.entries(actionConfig.form).forEach(([fieldName, fieldConfig]) => {
      if (this.shouldApplySmartSelectTransformation(fieldName, fieldConfig)) {
        const value = processed[fieldName];
        if (
          Array.isArray(value) &&
          value.length > 0 &&
          typeof value[0] === 'object' &&
          'value' in value[0]
        ) {
          // Transform select options format back to string array
          processed[fieldName] = value.map(
            (item: any) => item.value || item.name || item
          );
        }
      }
    });

    return processed;
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

    // Check for computed values in dependent fields
    this.updateComputedFields(propertyName);

    // Re-evaluate group collapse states that depend on form data
    this.updateGroupCollapseStates();

    // Trigger re-render to handle conditional field visibility
    this.requestUpdate();
  }

  private updateGroupCollapseStates(): void {
    if (!this.action) return;

    const config = ACTION_CONFIG[this.action.type];
    if (!config?.layout) return;

    this.updateGroupCollapseStatesRecursive(config.layout);
  }

  private updateGroupCollapseStatesRecursive(items: LayoutItem[]): void {
    items.forEach((item) => {
      if (typeof item === 'object' && item.type === 'group') {
        const { label, collapsed, collapsible } = item;

        // Only update if the group is collapsible and has a function-based collapsed property
        if (collapsible && typeof collapsed === 'function') {
          const newCollapsedState = collapsed(this.formData);

          // Only update if the state has changed to avoid unnecessary re-renders
          if (this.groupCollapseState[label] !== newCollapsedState) {
            this.groupCollapseState = {
              ...this.groupCollapseState,
              [label]: newCollapsedState
            };
          }
        }

        // Recursively check nested items
        this.updateGroupCollapseStatesRecursive(item.items);
      } else if (typeof item === 'object' && item.type === 'row') {
        // Recursively check items in rows
        this.updateGroupCollapseStatesRecursive(item.items);
      }
    });
  }

  private updateComputedFields(changedFieldName: string): void {
    if (!this.action) return;

    const config = ACTION_CONFIG[this.action.type];
    if (!config?.form) return;

    // Check all fields to see if any depend on the changed field
    Object.entries(config.form).forEach(([fieldName, fieldConfig]) => {
      if (fieldConfig.dependsOn?.includes(changedFieldName)) {
        if (fieldConfig.computeValue) {
          const currentValue = this.formData[fieldName];

          const computedValue = fieldConfig.computeValue(
            this.formData,
            currentValue,
            this.originalFormData
          );

          // Update the form data with the computed value
          this.formData = {
            ...this.formData,
            [fieldName]: computedValue
          };
        }
      }
    });
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

    // Build container style with maxWidth if specified
    const containerStyle = config.maxWidth
      ? `max-width: ${config.maxWidth};`
      : '';

    const fieldContent = this.renderFieldContent(
      fieldName,
      config,
      value,
      errors
    );

    // Wrap in container with style if maxWidth is specified
    if (containerStyle) {
      return html`<div style="${containerStyle}">${fieldContent}</div>`;
    }

    return fieldContent;
  }

  private renderFieldContent(
    fieldName: string,
    config: FieldConfig,
    value: any,
    errors: string[]
  ): TemplateResult {
    // Use FieldRenderer for consistent field rendering
    return FieldRenderer.renderField(fieldName, config, value, {
      errors,
      onChange: (e: Event) => {
        // Handle different change event types
        if (fieldName && config.type === 'key-value') {
          // Special handling for key-value editor
          const customEvent = e as CustomEvent;
          if (customEvent.detail) {
            this.handleNewFieldChange(fieldName, customEvent.detail.value);
          }
        } else if (fieldName && config.type === 'array') {
          // Special handling for array editor
          this.handleNewFieldChange(fieldName, (e.target as any).value);
        } else if (fieldName && config.type === 'message-editor') {
          // Special handling for message editor
          this.handleMessageEditorChange(fieldName, e);
        } else {
          // Default handling for most field types
          this.handleFormFieldChange(fieldName, e);
        }
      },
      showLabel: true,
      additionalData: {
        attachments: this.formData.attachments || []
      }
    });
  }

  private handleGroupToggle(groupLabel: string): void {
    this.groupCollapseState = {
      ...this.groupCollapseState,
      [groupLabel]: !this.groupCollapseState[groupLabel]
    };
  }

  private handleGroupMouseEnter(groupLabel: string): void {
    this.groupHoverState = {
      ...this.groupHoverState,
      [groupLabel]: true
    };
  }

  private handleGroupMouseLeave(groupLabel: string): void {
    this.groupHoverState = {
      ...this.groupHoverState,
      [groupLabel]: false
    };
  }

  private expandGroupsWithErrors(errors: { [key: string]: string }): void {
    if (!this.action) return;

    const config = ACTION_CONFIG[this.action.type];
    if (!config?.layout) return;

    const errorFields = new Set(Object.keys(errors));
    this.expandGroupsWithErrorsRecursive(config.layout, errorFields);
  }

  private expandGroupsWithErrorsRecursive(
    items: LayoutItem[],
    errorFields: Set<string>
  ): void {
    items.forEach((item) => {
      if (typeof item === 'object' && item.type === 'group') {
        const fieldsInGroup = this.collectFieldsFromItems(item.items);
        const groupHasErrors = fieldsInGroup.some((fieldName) =>
          errorFields.has(fieldName)
        );

        if (groupHasErrors) {
          // Expand this group
          this.groupCollapseState = {
            ...this.groupCollapseState,
            [item.label]: false
          };
        }

        // Recursively check nested items
        this.expandGroupsWithErrorsRecursive(item.items, errorFields);
      } else if (typeof item === 'object' && item.type === 'row') {
        // Recursively check items in rows
        this.expandGroupsWithErrorsRecursive(item.items, errorFields);
      }
    });
  }

  private renderLayoutItem(
    item: LayoutItem,
    config: ActionConfig,
    renderedFields: Set<string>
  ): TemplateResult {
    if (typeof item === 'string') {
      // String shorthand for field
      return this.renderLayoutItem(
        { type: 'field', field: item },
        config,
        renderedFields
      );
    }

    switch (item.type) {
      case 'field':
        if (config.form![item.field] && !renderedFields.has(item.field)) {
          renderedFields.add(item.field);
          return this.renderNewField(
            item.field,
            config.form![item.field] as FieldConfig,
            this.formData[item.field]
          );
        }
        return html``;

      case 'row':
        return this.renderRow(item, config, renderedFields);

      case 'group':
        return this.renderGroup(item, config, renderedFields);

      default:
        return html``;
    }
  }

  private renderRow(
    rowConfig: RowLayoutConfig,
    config: ActionConfig,
    renderedFields: Set<string>
  ): TemplateResult {
    const { items, gap = '1rem' } = rowConfig;

    // Collect all fields from this row for width calculations
    const fieldsInRow = this.collectFieldsFromItems(items);
    const validFields = fieldsInRow.filter(
      (fieldName) => config.form?.[fieldName]
    );

    if (validFields.length === 0) {
      return html``;
    }

    // Calculate grid template columns based on field maxWidth constraints
    const columns = validFields.map((fieldName) => {
      const fieldConfig = config.form![fieldName];
      return fieldConfig.maxWidth || '1fr';
    });

    return html`
      <div
        class="form-row"
        style="display: grid; grid-template-columns: ${columns.join(
          ' '
        )}; gap: ${gap};"
      >
        ${items.map((item) =>
          this.renderLayoutItem(item, config, renderedFields)
        )}
      </div>
    `;
  }

  private renderGroup(
    groupConfig: GroupLayoutConfig,
    config: ActionConfig,
    renderedFields: Set<string>
  ): TemplateResult {
    const {
      label,
      items,
      collapsible = false,
      collapsed = false,
      helpText,
      getGroupValueCount
    } = groupConfig;

    // Initialize collapse state if not set
    if (collapsible && !(label in this.groupCollapseState)) {
      // Evaluate collapsed property - can be boolean or function
      const initialCollapsed =
        typeof collapsed === 'function' ? collapsed(this.formData) : collapsed;

      this.groupCollapseState = {
        ...this.groupCollapseState,
        [label]: initialCollapsed
      };
    }

    const isCollapsed = collapsible
      ? this.groupCollapseState[label] ??
        (typeof collapsed === 'function' ? collapsed(this.formData) : collapsed)
      : false;

    // Check if any field in this group has errors
    const fieldsInGroup = this.collectFieldsFromItems(items);
    const groupHasErrors = fieldsInGroup.some(
      (fieldName) => this.errors[fieldName]
    );

    // Calculate count for bubble display
    let valueCount = 0;
    let showBubble = false;
    let showCheckmark = false;
    let hasValue = false;
    const isHovered = this.groupHoverState[label] ?? false;

    if (getGroupValueCount && collapsible) {
      try {
        const result = getGroupValueCount(this.formData);

        if (typeof result === 'boolean') {
          // Boolean result - show checkmark when true
          showCheckmark = result && isCollapsed && !isHovered;
          hasValue = result;
        } else if (typeof result === 'number') {
          // Numeric result - show count bubble
          valueCount = result;
          showBubble = valueCount > 0 && isCollapsed && !isHovered;
          hasValue = valueCount > 0;
        }
      } catch (error) {
        console.error(
          `Error calculating group value count for ${label}:`,
          error
        );
      }
    }

    return html`
      <div
        class="form-group ${collapsible ? 'collapsible' : ''} ${groupHasErrors
          ? 'has-errors'
          : ''} ${isCollapsed ? 'collapsed' : 'expanded'} ${hasValue
          ? 'has-bubble'
          : ''}"
      >
        <div
          class="form-group-header ${collapsible ? 'clickable' : ''}"
          @click=${collapsible
            ? () => this.handleGroupToggle(label)
            : undefined}
          @mouseenter=${collapsible
            ? () => this.handleGroupMouseEnter(label)
            : undefined}
          @mouseleave=${collapsible
            ? () => this.handleGroupMouseLeave(label)
            : undefined}
        >
          <div class="form-group-info">
            <div class="form-group-title">${label}</div>
            ${helpText
              ? html`<div class="form-group-help">${helpText}</div>`
              : ''}
          </div>
          ${groupHasErrors
            ? html`<temba-icon
                name="alert_warning"
                class="group-error-icon"
                size="1.5"
              ></temba-icon>`
            : ''}
          ${collapsible && !groupHasErrors
            ? html`<div class="group-toggle-container">
                <temba-icon
                  name="arrow_right"
                  size="1.5"
                  class="group-toggle-icon ${isCollapsed
                    ? 'collapsed'
                    : 'expanded'} ${showBubble || showCheckmark ? 'faded' : ''}"
                ></temba-icon>
                ${showCheckmark
                  ? html`<temba-icon
                      name="check"
                      size="1"
                      class="group-checkmark-icon"
                    ></temba-icon>`
                  : showBubble
                  ? html`<div
                      class="group-count-bubble ${!showBubble ? 'hidden' : ''}"
                    >
                      ${valueCount}
                    </div>`
                  : ''}
              </div>`
            : ''}
        </div>
        <div
          class="form-group-content ${isCollapsed ? 'collapsed' : 'expanded'}"
        >
          ${items.map((item) =>
            this.renderLayoutItem(item, config, renderedFields)
          )}
        </div>
      </div>
    `;
  }

  private collectFieldsFromItems(items: LayoutItem[]): string[] {
    const fields: string[] = [];

    items.forEach((item) => {
      if (typeof item === 'string') {
        fields.push(item);
      } else if (item.type === 'field') {
        fields.push(item.field);
      } else if (item.type === 'row') {
        fields.push(...this.collectFieldsFromItems(item.items));
      } else if (item.type === 'group') {
        fields.push(...this.collectFieldsFromItems(item.items));
      }
    });

    return fields;
  }

  private renderFieldRow(
    rowConfig: RowLayoutConfig,
    config: ActionConfig
  ): TemplateResult {
    // This method is deprecated - use renderRow instead
    return this.renderRow(rowConfig, config, new Set());
  }

  private renderFieldGroup(
    groupConfig: GroupLayoutConfig,
    config: ActionConfig
  ): TemplateResult {
    // This method is deprecated - use renderGroup instead
    return this.renderGroup(groupConfig, config, new Set());
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

    // Re-evaluate group collapse states that depend on form data
    this.updateGroupCollapseStates();

    // Trigger re-render
    this.requestUpdate();
  }
  private handleMessageEditorChange(fieldName: string, event: Event): void {
    const target = event.target as any;

    // Update both text and attachments from the message editor
    this.formData = {
      ...this.formData,
      [fieldName]: target.value,
      attachments: target.attachments || []
    };

    // Clear any existing errors for both fields
    if (this.errors[fieldName]) {
      const newErrors = { ...this.errors };
      delete newErrors[fieldName];
      delete newErrors.attachments;
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
    if (config.form) {
      // If layout is specified, use it
      if (config.layout) {
        const renderedFields = new Set<string>();

        return html`
          ${config.layout.map((item) =>
            this.renderLayoutItem(item, config, renderedFields)
          )}
          ${
            /* Render any fields not explicitly placed in layout */
            Object.entries(config.form).map(([fieldName, fieldConfig]) => {
              if (!renderedFields.has(fieldName)) {
                return this.renderNewField(
                  fieldName,
                  fieldConfig as FieldConfig,
                  this.formData[fieldName]
                );
              }
              return html``;
            })
          }
        `;
      } else {
        // Default rendering without layout
        return html`
          ${Object.entries(config.form).map(([fieldName, fieldConfig]) =>
            this.renderNewField(
              fieldName,
              fieldConfig as FieldConfig,
              this.formData[fieldName]
            )
          )}
        `;
      }
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
