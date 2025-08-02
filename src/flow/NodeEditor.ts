import { html, TemplateResult, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { Node, NodeUI, Action } from '../store/flow-definition';
import {
  ValidationResult,
  NodeConfig,
  PropertyConfig,
  NODE_CONFIG,
  ACTION_CONFIG,
  getDefaultComponentProps,
  TextInputAttributes,
  CompletionAttributes,
  CheckboxAttributes,
  SelectAttributes
} from './config';
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
    } else if (this.node) {
      // Node editing mode - use node config
      const nodeConfig = this.getNodeConfig();
      if (nodeConfig?.toFormData) {
        this.formData = nodeConfig.toFormData(this.node);
      } else {
        this.formData = { ...this.node };
      }
    }
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

    // Determine whether to use node or action saving based on context
    // If we have a node with a router, always use node saving (even if action is set)
    // because router configuration is handled at the node level
    if (this.node && this.node.router) {
      // Node editing mode with router - use formDataToNode
      const updatedNode = this.formDataToNode();
      this.fireCustomEvent(CustomEventType.NodeSaved, {
        node: updatedNode
      });
    } else if (this.action) {
      // Pure action editing mode (no router)
      const updatedAction = this.formDataToAction();
      this.fireCustomEvent(CustomEventType.ActionSaved, {
        action: updatedAction
      });
    } else if (this.node) {
      // Node editing mode without router
      const updatedNode = this.formDataToNode();
      this.fireCustomEvent(CustomEventType.NodeSaved, {
        node: updatedNode
      });
    }
  }

  private handleCancel(): void {
    this.fireCustomEvent(CustomEventType.NodeEditCancelled, {});
  }

  private validateForm(): ValidationResult {
    const errors: { [key: string]: string } = {};

    if (this.action) {
      // Action validation - follow ActionEditor's pattern exactly
      const actionConfig = ACTION_CONFIG[this.action.type];

      // Convert form data back to action for validation
      let actionForValidation: Action;

      if (actionConfig?.fromFormData) {
        actionForValidation = actionConfig.fromFormData(this.formData);
      } else {
        // Provide default 1:1 mapping when no transformation is provided
        actionForValidation = {
          ...this.action,
          ...this.formData
        } as Action;
      }

      // Get the form configuration (use provided form or generate default)
      let formConfig = actionConfig?.form;
      if (!formConfig && this.action) {
        formConfig = this.generateDefaultFormConfig();
      }

      // Basic validation based on form field configs
      if (formConfig) {
        Object.entries(formConfig).forEach(([fieldName, fieldConfig]) => {
          const value = this.formData[fieldName];
          const propConfig = fieldConfig as PropertyConfig;

          // Check required fields (don't skip based on visibility like ActionEditor)
          if (
            propConfig.required &&
            (!value || (Array.isArray(value) && value.length === 0))
          ) {
            errors[fieldName] = `${propConfig.label || fieldName} is required`;
          }

          // Check minLength
          if (
            typeof value === 'string' &&
            propConfig.minLength &&
            value.length < propConfig.minLength
          ) {
            errors[fieldName] = `${
              propConfig.label || fieldName
            } must be at least ${propConfig.minLength} characters`;
          }

          // Check maxLength
          if (
            typeof value === 'string' &&
            propConfig.maxLength &&
            value.length > propConfig.maxLength
          ) {
            errors[fieldName] = `${
              propConfig.label || fieldName
            } must be no more than ${propConfig.maxLength} characters`;
          }
        });
      }

      // Run custom validation if available and merge results
      if (actionConfig?.validate) {
        const customValidation = actionConfig.validate(actionForValidation);
        // Merge custom validation errors with basic form validation errors
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

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  private formDataToNode(): Node {
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
            return actionConfig.fromFormData(this.formData);
          } else {
            // Default transformation - merge form data with original action
            return { ...action, ...this.formData };
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
        updatedNode = nodeConfig.fromFormData(this.formData, updatedNode);
      } else {
        // Default router handling
        updatedNode.router = { ...this.node.router };

        // Apply form data to router fields if they exist
        if (this.formData.result_name !== undefined) {
          updatedNode.router.result_name = this.formData.result_name;
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
      Object.keys(this.formData).forEach((key) => {
        if (
          key !== 'uuid' &&
          key !== 'actions' &&
          key !== 'exits' &&
          key !== 'router'
        ) {
          (updatedNode as any)[key] = this.formData[key];
        }
      });
    }

    return updatedNode;
  }

  private formDataToAction(): Action {
    if (!this.action) throw new Error('No action to update');

    // Use action config transformation if available
    const actionConfig = ACTION_CONFIG[this.action.type];
    if (actionConfig?.fromFormData) {
      return actionConfig.fromFormData(this.formData);
    } else {
      // Provide default 1:1 mapping when no transformation is provided
      return { ...this.action, ...this.formData };
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

  private renderProperty(
    propertyName: string,
    propertyConfig: PropertyConfig
  ): TemplateResult {
    // Check visibility condition
    if (propertyConfig.conditions?.visible) {
      try {
        const isVisible = propertyConfig.conditions.visible(this.formData);
        if (!isVisible) {
          return html``;
        }
      } catch (error) {
        console.error(`Error checking visibility for ${propertyName}:`, error);
        // If there's an error, show the field by default
      }
    }

    const { label, helpText, required, widget } = propertyConfig;
    const value = this.formData[propertyName];
    const propertyErrors = this.errors[propertyName]
      ? [this.errors[propertyName]]
      : [];
    const component = widget?.type || 'temba-textinput';
    const attributes = widget?.attributes || {};
    const name = propertyName;

    // Check disabled condition
    const isDisabled = propertyConfig.conditions?.disabled
      ? propertyConfig.conditions.disabled(this.formData)
      : false;

    let fieldHtml: TemplateResult;

    switch (component) {
      case 'temba-textinput': {
        const textAttrs = attributes as TextInputAttributes;
        fieldHtml = html`<temba-textinput
          name="${name}"
          label="${label || ''}"
          help_text="${helpText || ''}"
          ?required="${required}"
          .errors="${propertyErrors}"
          .value="${value || ''}"
          type="${textAttrs.type || 'text'}"
          ?textarea="${textAttrs.textarea}"
          placeholder="${textAttrs.placeholder || ''}"
          ?disabled="${isDisabled}"
          @input="${(e: Event) => this.handleFormFieldChange(propertyName, e)}"
        ></temba-textinput>`;
        break;
      }

      case 'temba-completion': {
        const completionAttrs = attributes as CompletionAttributes;
        fieldHtml = html`<temba-completion
          name="${name}"
          label="${label || ''}"
          help_text="${helpText || ''}"
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
          help_text="${helpText}"
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
          propertyConfig.widget?.attributes &&
          'multi' in propertyConfig.widget.attributes
            ? propertyConfig.widget.attributes.multi
            : false;
        fieldHtml = html`<temba-select
          name="${name}"
          label=${label || ''}
          help_text="${helpText}"
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

  private renderActionForm(): TemplateResult {
    if (!this.action) {
      return html`<div>No action to edit</div>`;
    }

    const config = ACTION_CONFIG[this.action.type];

    if (!config) {
      return html`
        <div>
          No configuration available for action type: ${this.action.type}
        </div>
      `;
    }

    // Use 'form' configuration if available
    let formConfig = config.form;

    // If no form config is provided, generate a default one based on action properties
    if (!formConfig && this.action) {
      formConfig = this.generateDefaultFormConfig();
    }

    if (!formConfig) {
      return html` <div>No form configuration available</div> `;
    }

    return html`
      ${Object.entries(formConfig).map(([fieldName, fieldConfig]) =>
        this.renderProperty(fieldName, fieldConfig as PropertyConfig)
      )}
    `;
  }

  private generateDefaultFormConfig(): { [key: string]: PropertyConfig } {
    if (!this.action) return {};

    const formConfig: { [key: string]: PropertyConfig } = {};

    // Generate default form fields for all action properties except type and uuid
    Object.keys(this.action).forEach((key) => {
      if (key !== 'type' && key !== 'uuid') {
        const value = this.action![key as keyof typeof this.action];
        const defaultProps = getDefaultComponentProps(value);

        formConfig[key] = {
          label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
          ...defaultProps
        };
      }
    });

    return formConfig;
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
          ${this.renderActionForm()}
          ${nodeConfig.router?.configurable ? this.renderRouterSection() : null}
        </div>
      </temba-dialog>
    `;
  }
}
