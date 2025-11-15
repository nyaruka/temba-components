import { html, TemplateResult, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { Node, NodeUI, Action, FlowDefinition } from '../store/flow-definition';
import {
  ValidationResult,
  NodeConfig,
  NODE_CONFIG,
  ACTION_CONFIG,
  FieldConfig,
  ActionConfig
} from './config';
import {
  LayoutItem,
  RowLayoutConfig,
  GroupLayoutConfig,
  FormData,
  ACTION_GROUP_METADATA,
  SPLIT_GROUP_METADATA
} from './types';
import { CustomEventType } from '../interfaces';
import { generateUUID } from '../utils';
import { FieldRenderer } from '../form/FieldRenderer';
import { renderMarkdownInline } from '../markdown';
import { AppState, fromStore, zustand } from '../store/AppState';
import { getStore } from '../store/Store';

export class NodeEditor extends RapidElement {
  static get styles() {
    return css`
      .node-editor-form {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        min-width: 400px;

        --color-bubble-bg: rgba(var(--primary-rgb), 0.7);
        --color-bubble-border: rgba(0, 0, 0, 0.2);
        --color-bubble-text: #fff;
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
        align-items: center;
      }

      .form-row-wrapper {
        display: flex;
        flex-direction: column;
      }

      .form-row-label {
        margin-bottom: 5px;
        margin-left: 4px;
        display: block;
        font-weight: 400;
        font-size: var(--label-size);
        letter-spacing: 0.05em;
        line-height: normal;
        color: var(--color-label, #777);
      }

      .form-row-help {
        font-size: 12px;
        color: #666;
        margin-top: 6px;
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
        border-width: 2px;
        border-color: rgba(var(--primary-rgb), 0.5);
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
        background: rgba(var(--primary-rgb), 0.1);
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

      .gutter-fields {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
      }

      .gutter-fields .form-row {
        margin: 0;
      }

      .gutter-fields temba-checkbox {
        align-self: flex-start;
      }

      .gutter-fields temba-select {
        min-width: 120px;
      }

      .optional-field-link {
        margin: 10px 0;
      }

      .optional-field-link a {
        color: var(--color-link-primary, #0066cc);
        text-decoration: none;
        font-size: 13px;
        cursor: pointer;
      }

      .optional-field-link a:hover {
        text-decoration: underline;
      }

      .original-value {
        background: #fff8dc;
        padding: 10px;
        border-radius: 4px;
        font-size: 13px;
        color: #666;
      }

      .original-value-content {
        color: #333;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .category-localization-table {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .category-localization-row {
        display: grid;
        grid-template-columns: 40% 60%;
      }

      .category-localization-row:last-child {
        border-bottom: none;
      }

      .original-name {
        padding: 10px 20px;
        background: #fff8dc;
        display: flex;
        align-items: center;
        border-radius: var(--curvature);
      }

      .localized-name {
        padding: 10px;
        display: flex;
        align-items: center;
      }

      .localized-name temba-textinput {
        width: 100%;
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
  private formData: FormData = {};

  @state()
  private originalFormData: FormData = {};

  @state()
  private errors: { [key: string]: string } = {};

  @state()
  private groupCollapseState: { [key: string]: boolean } = {};

  @state()
  private groupHoverState: { [key: string]: boolean } = {};

  @state()
  private revealedOptionalFields: Set<string> = new Set();

  @fromStore(zustand, (state: AppState) => state.languageCode)
  private languageCode!: string;

  @fromStore(zustand, (state: AppState) => state.isTranslating)
  private isTranslating!: boolean;

  @fromStore(zustand, (state: AppState) => state.flowDefinition)
  private flowDefinition!: FlowDefinition;

  connectedCallback(): void {
    super.connectedCallback();
    this.initializeFormData();
  }

  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    super.updated(changedProperties);
    if (
      changedProperties.has('node') ||
      changedProperties.has('action') ||
      changedProperties.has('nodeUI')
    ) {
      // For action editing, we only need the action
      if (this.action && (!this.node || !this.nodeUI)) {
        this.openDialog();
      }
      // For node editing, we need both node and nodeUI
      else if (this.node && this.nodeUI) {
        this.openDialog();
      }
      // If we don't have the required data, close the dialog
      else if (!this.action && (!this.node || !this.nodeUI)) {
        this.isOpen = false;
      }
    }
  }

  private openDialog(): void {
    this.initializeFormData();
    this.errors = {};
    this.isOpen = true;
  }

  private initializeFormData(): void {
    const nodeConfig = this.getNodeConfig();

    if ((!nodeConfig || nodeConfig.type === 'execute_actions') && this.action) {
      // Action editing mode - use action config
      const actionConfig = ACTION_CONFIG[this.action.type];

      // Check if we're in localization mode
      if (
        this.isTranslating &&
        actionConfig?.localizable &&
        actionConfig.toLocalizationFormData
      ) {
        // Get localized values for this action
        const localization =
          this.flowDefinition?.localization?.[this.languageCode]?.[
            this.action.uuid
          ] || {};

        this.formData = actionConfig.toLocalizationFormData(
          this.action,
          localization
        );
      } else if (actionConfig?.toFormData) {
        this.formData = actionConfig.toFormData(this.action);
      } else {
        this.formData = { ...this.action };
      }

      // Convert Record objects to array format for key-value editors
      this.processFormDataForEditing();

      // Store a copy of the original form data for computed field comparisons
      this.originalFormData = JSON.parse(JSON.stringify(this.formData));
    } else if (this.node) {
      // Node editing mode - use node config
      const nodeConfig = this.getNodeConfig();

      // Check if we're in localization mode for a node with localizable categories
      if (
        this.isTranslating &&
        nodeConfig?.localizable === 'categories' &&
        nodeConfig.toLocalizationFormData
      ) {
        // Get localized values for this node's categories
        const localization =
          this.flowDefinition?.localization?.[this.languageCode] || {};

        this.formData = nodeConfig.toLocalizationFormData(
          this.node,
          localization
        );
      } else if (nodeConfig?.toFormData) {
        this.formData = nodeConfig.toFormData(this.node, this.nodeUI);
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

    // Convert select fields to array format
    const config = this.getConfig();
    if (config?.form) {
      this.processSelectFields(processed, config.form);
    }

    this.formData = processed;
  }

  private processSelectFields(data: any, formConfig: any): void {
    Object.entries(formConfig).forEach(
      ([fieldName, fieldConfig]: [string, any]) => {
        const value = data[fieldName];

        // Handle top-level select fields
        if (fieldConfig.type === 'select' && value) {
          data[fieldName] = this.convertToSelectArray(value);
        }

        // Handle select fields within array items
        if (
          fieldConfig.type === 'array' &&
          Array.isArray(value) &&
          fieldConfig.itemConfig
        ) {
          value.forEach((item: any) => {
            this.processSelectFields(item, fieldConfig.itemConfig);
          });
        }
      }
    );
  }

  private convertToSelectArray(value: any): any[] {
    if (Array.isArray(value)) {
      return value.map((v) =>
        typeof v === 'string' ? { name: v, value: v } : v
      );
    } else if (typeof value === 'string') {
      return [{ name: value, value: value }];
    } else {
      return [value];
    }
  }

  private isKeyValueField(fieldName: string): boolean {
    // Check if this field is configured as a key-value type
    const config = this.getConfig();
    const fields = config?.form;
    return fields?.[fieldName]?.type === 'key-value';
  }

  private getConfig(): ActionConfig | NodeConfig | null {
    // If we have a node and nodeUI, check if we should use node config
    if (this.node && this.nodeUI) {
      const nodeConfig = this.getNodeConfig();

      // For execute_actions nodes, defer to action editing if an action is selected
      if (this.nodeUI.type === 'execute_actions' && this.action) {
        return ACTION_CONFIG[this.action.type] || null;
      }

      // For all other nodes with a config, use the node config
      if (nodeConfig) {
        return nodeConfig;
      }
    }

    // Fall back to action config if no node config or for pure action editing
    if (this.action) {
      return ACTION_CONFIG[this.action.type] || null;
    }

    return null;
  }

  private getNodeConfig(): NodeConfig | null {
    if (!this.nodeUI) return null;
    // Get node config based on the nodeUI's type
    return this.nodeUI.type ? NODE_CONFIG[this.nodeUI.type] : null;
  }

  private getHeaderColor(): string {
    const config = this.getConfig();
    return config?.group
      ? ACTION_GROUP_METADATA[config.group]?.color ||
          SPLIT_GROUP_METADATA[config.group]?.color
      : '#aaaaaa';
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

    // Check if we're in localization mode
    if (this.isTranslating) {
      // Handle action localization
      if (this.action) {
        const actionConfig = ACTION_CONFIG[this.action.type];

        if (
          actionConfig?.localizable &&
          actionConfig.fromLocalizationFormData
        ) {
          // Save to localization structure
          const localizationData = actionConfig.fromLocalizationFormData(
            processedFormData,
            this.action
          );

          // Update the flow definition's localization
          this.updateLocalization(
            this.languageCode,
            this.action.uuid,
            localizationData
          );

          // Close the dialog
          this.fireCustomEvent(CustomEventType.NodeEditCancelled, {});
          return;
        }
      }

      // Handle node localization (for router categories)
      if (this.node) {
        const nodeConfig = this.getNodeConfig();

        if (
          nodeConfig?.localizable === 'categories' &&
          nodeConfig.fromLocalizationFormData
        ) {
          // Get localization data for all categories
          const localizationData = nodeConfig.fromLocalizationFormData(
            processedFormData,
            this.node
          );

          // Update each category's localization
          Object.keys(localizationData).forEach((categoryUuid) => {
            this.updateLocalization(
              this.languageCode,
              categoryUuid,
              localizationData[categoryUuid]
            );
          });

          // Close the dialog
          this.fireCustomEvent(CustomEventType.NodeEditCancelled, {});
          return;
        }
      }
    }

    // Determine whether to use node or action saving based on context
    // If we have a node with a router, always use node saving (even if action is set)
    // because router configuration is handled at the node level
    if (this.node && this.node.router) {
      // Node editing mode with router - use formDataToNode
      const updatedNode = this.formDataToNode(processedFormData);

      // Generate UI config if the node config provides a toUIConfig function
      const nodeConfig = this.getNodeConfig();
      const uiConfig = nodeConfig?.toUIConfig
        ? nodeConfig.toUIConfig(processedFormData)
        : undefined;

      this.fireCustomEvent(CustomEventType.NodeSaved, {
        node: updatedNode,
        uiConfig
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

      // Generate UI config if the node config provides a toUIConfig function
      const nodeConfig = this.getNodeConfig();
      const uiConfig = nodeConfig?.toUIConfig
        ? nodeConfig.toUIConfig(processedFormData)
        : undefined;

      this.fireCustomEvent(CustomEventType.NodeSaved, {
        node: updatedNode,
        uiConfig
      });
    }
  }

  private updateLocalization(
    languageCode: string,
    actionUuid: string,
    localizationData: Record<string, any>
  ): void {
    // Use the store method to properly update localization with immer
    zustand
      .getState()
      .updateLocalization(languageCode, actionUuid, localizationData);
  }

  private processFormDataForSave(): FormData {
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
    const config = this.getConfig();

    if (config) {
      // Check if new field configuration system is available
      if (config.form) {
        Object.entries(config.form).forEach(([fieldName, fieldConfig]) => {
          const value = this.formData[fieldName];
          if (fieldConfig.type === 'select' && fieldConfig.allowCreate) {
            // check our values to see if any have arbitrary set
            let selected = this.formData[fieldName];
            selected = Array.isArray(selected)
              ? selected.find((v: any) => v.arbitrary)
              : null;

            if (selected && selected.arbitrary) {
              errors[fieldName] =
                'There was an error creating' + ' "' + selected.name + '"';
            }
          }

          // Check required fields (skip in localization mode since all fields are optional)
          if (
            !this.isTranslating &&
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
        });
      }

      // Universal validation for category arrays to check for reserved names
      this.validateCategoryNames(errors);

      // Run custom validation if available
      if (config.validate) {
        if (config.sanitize) {
          config.sanitize(this.formData);
        }

        let customValidation;
        if (this.action) {
          customValidation = config.validate({
            ...this.action,
            ...this.formData
          });
        } else {
          customValidation = config.validate(this.formData);
        }
        Object.assign(errors, customValidation.errors);
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

  private validateCategoryNames(errors: { [key: string]: string }): void {
    // Universal validation for category names across all node types
    // Prevents use of reserved category names that have special meaning in the system
    // Define reserved category names (case-insensitive)
    const reservedNames = [
      'other',
      'failure',
      'success',
      'all responses',
      'no response'
    ];

    // Check all form fields for category arrays
    Object.entries(this.formData).forEach(([fieldName, value]) => {
      if (Array.isArray(value) && fieldName === 'categories') {
        const categories = value.filter(
          (item: any) => item?.name && item.name.trim() !== ''
        );

        // Check for reserved names
        const reservedUsed = categories
          .filter((item: any) => {
            const lowerName = item.name.trim().toLowerCase();
            return reservedNames.includes(lowerName);
          })
          .map((item: any) => item.name.trim()); // Preserve original case

        if (reservedUsed.length > 0) {
          errors[
            fieldName
          ] = `Reserved category names cannot be used: ${reservedUsed.join(
            ', '
          )}`;
        }
      }
    });
  }

  private formDataToNode(formData: FormData = this.formData): Node {
    if (!this.node) throw new Error('No node to update');
    let updatedNode: Node = { ...this.node };

    // Check if node config has fromFormData - if so, it handles the entire transformation
    const nodeConfig = this.getNodeConfig();
    const nodeHasFromFormData = nodeConfig?.fromFormData !== undefined;

    // Handle actions using action config transformations if available
    // Skip this if the node has its own fromFormData (which handles actions itself)
    if (
      !nodeHasFromFormData &&
      this.node.actions &&
      this.node.actions.length > 0
    ) {
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
    if (nodeHasFromFormData) {
      // Use node-specific form data transformation
      // When a node has fromFormData, it's responsible for creating the entire
      // node structure including actions and router (regardless of whether router exists yet)
      updatedNode = nodeConfig.fromFormData!(formData, updatedNode);
    } else if (this.node.router) {
      // Default router handling when no nodeConfig.fromFormData
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

  private formDataToAction(formData: FormData = this.formData): Action {
    if (!this.action) throw new Error('No action to update');

    // Use action config transformation if available
    const actionConfig = ACTION_CONFIG[this.action.type];
    if (actionConfig?.fromFormData) {
      return actionConfig.fromFormData(formData);
    } else {
      // Default 1:1 mapping
      return { ...this.action, ...formData };
    }
  }

  private handleFormFieldChange(propertyName: string, event: Event): void {
    const target = event.target as any;
    let value: any;

    // Handle different component types like ActionEditor does
    if (target.tagName === 'TEMBA-CHECKBOX') {
      value = target.checked;
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
    const config = this.getConfig();
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
    const config = this.getConfig();
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

  /**
   * Helper method to check if a field is visible based on its conditions
   */
  private isFieldVisible(fieldName: string, config: FieldConfig): boolean {
    if (config.conditions?.visible) {
      try {
        return config.conditions.visible(this.formData);
      } catch (error) {
        console.error(`Error checking visibility for ${fieldName}:`, error);
        // If there's an error, show the field by default
        return true;
      }
    }
    return true;
  }

  private renderNewField(
    fieldName: string,
    config: FieldConfig,
    value: any
  ): TemplateResult {
    // Check visibility condition
    if (!this.isFieldVisible(fieldName, config)) {
      return html``;
    }

    const errors = this.errors[fieldName] ? [this.errors[fieldName]] : [];

    // Build container style with maxWidth if specified
    const containerStyle = config.maxWidth
      ? `max-width: ${config.maxWidth};`
      : '';

    // Render original value if in localization mode and action has the field
    const originalValueDisplay =
      this.isTranslating && this.action && fieldName in this.action
        ? this.renderOriginalValue(fieldName, this.action[fieldName])
        : html``;

    const fieldContent = this.renderFieldContent(
      fieldName,
      config,
      value,
      errors
    );

    const content = html` ${originalValueDisplay} ${fieldContent} `;

    // Wrap in container with style if maxWidth is specified
    if (containerStyle) {
      return html`<div style="${containerStyle}">${content}</div>`;
    }

    return content;
  }

  private renderOptionalField(
    fieldName: string,
    config: FieldConfig,
    value: any
  ): TemplateResult {
    // If the field has a value or has been revealed, show it
    const hasValue = value && value.toString().trim() !== '';
    const isRevealed = this.revealedOptionalFields.has(fieldName);

    if (hasValue || isRevealed) {
      // Render the field normally
      return this.renderNewField(fieldName, config, value);
    }

    // Show the "Save as..." link
    return html`
      <div class="optional-field-link">
        <a
          href="#"
          @click="${(e: Event) => {
            e.preventDefault();
            this.revealOptionalField(fieldName);
          }}"
        >
          ${config.optionalLink}
        </a>
      </div>
    `;
  }

  private revealOptionalField(fieldName: string): void {
    this.revealedOptionalFields = new Set([
      ...this.revealedOptionalFields,
      fieldName
    ]);
  }

  private renderCategoryLocalizationTable(): TemplateResult {
    const categories = this.formData.categories || {};
    const categoryEntries = Object.entries(categories);

    if (categoryEntries.length === 0) {
      return html`<div>No categories to localize</div>`;
    }

    const languageName =
      getStore().getLanguageName(this.languageCode) || this.languageCode;

    return html`
      <div class="category-localization-table">
        ${categoryEntries.map(
          ([categoryUuid, categoryData]: [string, any]) => html`
            <div class="category-localization-row">
              <div class="original-name">${categoryData.originalName}</div>
              <div class="localized-name">
                <temba-textinput
                  name="${categoryUuid}"
                  placeholder="${languageName} Translation"
                  value="${categoryData.localizedName || ''}"
                  @change=${(e: Event) =>
                    this.handleCategoryLocalizationChange(
                      categoryUuid,
                      (e.target as any).value
                    )}
                ></temba-textinput>
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  private handleCategoryLocalizationChange(
    categoryUuid: string,
    value: string
  ): void {
    // Update formData with new localized value
    if (!this.formData.categories) {
      this.formData.categories = {};
    }

    if (!this.formData.categories[categoryUuid]) {
      this.formData.categories[categoryUuid] = {};
    }

    this.formData.categories[categoryUuid].localizedName = value;

    // Trigger a re-render
    this.requestUpdate();
  }

  private renderOriginalValue(
    fieldName: string,
    originalValue: any
  ): TemplateResult {
    // Format the original value for display
    let displayValue = '';

    if (Array.isArray(originalValue)) {
      if (originalValue.length === 0) {
        return html``; // Don't show anything for empty arrays
      }
      // For arrays, join with commas
      displayValue = originalValue.join(', ');
    } else if (typeof originalValue === 'string') {
      displayValue = originalValue;
    } else if (originalValue) {
      displayValue = String(originalValue);
    }

    // Don't show if empty
    if (!displayValue || displayValue.trim() === '') {
      return html``;
    }

    return html`
      <div class="original-value">
        <div class="original-value-content">${displayValue}</div>
      </div>
    `;
  }

  private renderFieldContent(
    fieldName: string,
    config: FieldConfig,
    value: any,
    errors: string[]
  ): TemplateResult {
    // In localization mode, make all fields optional (not required)
    const fieldConfig = this.isTranslating
      ? { ...config, required: false }
      : config;

    // Use FieldRenderer for consistent field rendering
    return FieldRenderer.renderField(fieldName, fieldConfig, value, {
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
      formData: this.formData,
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
    const config = this.getConfig();
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
    config: ActionConfig | NodeConfig,
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
          const fieldConfig = config.form![item.field] as FieldConfig;

          // Handle optional link fields
          if (fieldConfig.optionalLink) {
            return this.renderOptionalField(
              item.field,
              fieldConfig,
              this.formData[item.field]
            );
          }

          return this.renderNewField(
            item.field,
            fieldConfig,
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
    config: ActionConfig | NodeConfig,
    renderedFields: Set<string>
  ): TemplateResult {
    const { items, gap = '1rem', label, helpText } = rowConfig;

    // Collect all fields from this row for width calculations
    const fieldsInRow = this.collectFieldsFromItems(items);
    const validFields = fieldsInRow.filter(
      (fieldName) => config.form?.[fieldName]
    );

    // Filter for visible fields only to handle conditional visibility
    const visibleFields = validFields.filter((fieldName) => {
      const fieldConfig = config.form![fieldName];
      return this.isFieldVisible(fieldName, fieldConfig);
    });

    if (visibleFields.length === 0) {
      return html``;
    }

    // Build a map of field flex styles
    // Fields with maxWidth get flex: 0 0 {maxWidth} (fixed)
    // Fields without maxWidth get flex: 1 1 0 (grow to fill space)
    const fieldFlexStyles = new Map<string, string>();
    visibleFields.forEach((fieldName) => {
      const fieldConfig = config.form![fieldName];
      if (fieldConfig.maxWidth) {
        // Fixed width field: no grow, no shrink, basis = maxWidth
        fieldFlexStyles.set(fieldName, `flex: 0 0 ${fieldConfig.maxWidth};`);
      } else {
        // Flexible field: grow to fill remaining space
        fieldFlexStyles.set(fieldName, `flex: 1 1 0;`);
      }
    });

    const rowContent = html`
      <div class="form-row" style="display: flex; gap: ${gap};">
        ${items.map((item) => {
          // Get the field name from the item
          const fieldName =
            typeof item === 'string'
              ? item
              : item.type === 'field'
              ? item.field
              : null;

          // Get flex style for this field if it's a visible field
          const flexStyle =
            fieldName && fieldFlexStyles.has(fieldName)
              ? fieldFlexStyles.get(fieldName)
              : '';

          const itemContent = this.renderLayoutItem(
            item,
            config,
            renderedFields
          );

          // Wrap in a div with flex style if we have a flex style
          return flexStyle
            ? html`<div style="${flexStyle}">${itemContent}</div>`
            : itemContent;
        })}
      </div>
    `;

    // If no label or helpText, return just the row content
    if (!label && !helpText) {
      return rowContent;
    }

    // Otherwise, wrap with label on top, content, then helpText below (matching field pattern)
    return html`
      <div class="form-row-wrapper">
        ${label ? html`<label class="form-row-label">${label}</label>` : ''}
        ${rowContent}
        ${helpText
          ? html`<div class="form-row-help">
              ${renderMarkdownInline(helpText)}
            </div>`
          : ''}
      </div>
    `;
  }

  private renderGroup(
    groupConfig: GroupLayoutConfig,
    config: ActionConfig | NodeConfig,
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
              ? html`<div class="form-group-help">
                  ${renderMarkdownInline(helpText)}
                </div>`
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
    config: ActionConfig | NodeConfig
  ): TemplateResult {
    // This method is deprecated - use renderRow instead
    return this.renderRow(rowConfig, config, new Set());
  }

  private renderFieldGroup(
    groupConfig: GroupLayoutConfig,
    config: ActionConfig | NodeConfig
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
    const config = this.getConfig();
    if (!config) {
      return html` <div>No configuration available</div> `;
    }

    // Special rendering for category localization
    if (
      this.isTranslating &&
      config.localizable === 'categories' &&
      this.formData.categories
    ) {
      return this.renderCategoryLocalizationTable();
    }

    // Use the new fields configuration system
    if (config.form) {
      // If layout is specified, use it
      if (config.layout) {
        const renderedFields = new Set<string>();

        // Also collect fields from gutter to avoid rendering them in main form
        const gutterFields = new Set<string>();
        if (config.gutter) {
          const gutterFieldNames = this.collectFieldsFromItems(config.gutter);
          gutterFieldNames.forEach((field) => gutterFields.add(field));
        }

        return html`
          ${config.layout.map((item) =>
            this.renderLayoutItem(item, config, renderedFields)
          )}
          ${
            /* Render any fields not explicitly placed in layout or gutter */
            Object.entries(config.form).map(([fieldName, fieldConfig]) => {
              if (
                !renderedFields.has(fieldName) &&
                !gutterFields.has(fieldName)
              ) {
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

    // Fallback for configs without form configuration
    if (this.action) {
      return html` <div>No form configuration available for this action</div> `;
    } else {
      return html` <div>No form configuration available for this node</div> `;
    }
  }

  private renderGutter(): TemplateResult {
    const config = this.getConfig();
    if (!config?.gutter || config.gutter.length === 0) {
      return html``;
    }

    // Don't show gutter when localizing categories
    if (this.isTranslating && config.localizable === 'categories') {
      return html``;
    }

    // Use the same layout rendering system for gutter fields
    const renderedFields = new Set<string>();

    return html`
      <div class="gutter-fields">
        ${config.gutter.map((item) =>
          this.renderLayoutItem(item, config, renderedFields)
        )}
      </div>
    `;
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

    const headerColor = this.isTranslating ? '#505050' : this.getHeaderColor();
    const headerTextColor = this.isTranslating ? '#fff' : '#fff';
    const config = this.getConfig();
    const dialogSize = config?.dialogSize || 'medium'; // Default to 'large' if not specified

    const languageName = this.isTranslating
      ? getStore().getLanguageName(this.languageCode) || this.languageCode
      : '';

    const headerText = this.isTranslating
      ? `${languageName} - ${config?.name || 'Edit'}`
      : config?.name || 'Edit';

    return html`
      <temba-dialog
        header="${headerText}"
        .open="${this.isOpen}"
        @temba-button-clicked=${this.handleDialogButtonClick}
        primaryButtonName="Save"
        cancelButtonName="Cancel"
        style="--header-bg: ${headerColor}; --header-text: ${headerTextColor};"
        size="${dialogSize}"
      >
        <div class="node-editor-form">
          ${this.renderFields()}
          ${this.getNodeConfig()?.router?.configurable
            ? this.renderRouterSection()
            : null}
        </div>

        <div slot="gutter">${this.renderGutter()}</div>
      </temba-dialog>
    `;
  }
}
