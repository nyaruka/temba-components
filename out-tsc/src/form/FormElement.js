import { __decorate } from "tslib";
import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';
/**
 * FormElement is a component that appends a hidden input (outside of
 * its own shadow) with its value to be included in forms.
 */
export class FormElement extends RapidElement {
    constructor() {
        super();
        this.name = '';
        this.value = null;
        this.inputRoot = this;
        this.disabled = false;
        this.internals = this.attachInternals();
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('value')) {
            this.internals.setFormValue(this.value);
        }
    }
    get form() {
        return this.internals.form;
    }
    setValue(value) {
        this.value = this.serializeValue(value);
    }
    getDeserializedValue() {
        return JSON.parse(this.value);
    }
    serializeValue(value) {
        return JSON.stringify(value);
    }
}
FormElement.formAssociated = true;
__decorate([
    property({ type: String })
], FormElement.prototype, "name", void 0);
__decorate([
    property({ type: String, attribute: 'help_text' })
], FormElement.prototype, "helpText", void 0);
__decorate([
    property({ type: Boolean, attribute: 'help_always' })
], FormElement.prototype, "helpAlways", void 0);
__decorate([
    property({ type: Boolean, attribute: 'widget_only' })
], FormElement.prototype, "widgetOnly", void 0);
__decorate([
    property({ type: Boolean, attribute: 'hide_label' })
], FormElement.prototype, "hideLabel", void 0);
__decorate([
    property({ type: String })
], FormElement.prototype, "label", void 0);
__decorate([
    property({ type: Array })
], FormElement.prototype, "errors", void 0);
__decorate([
    property({ type: String })
], FormElement.prototype, "value", void 0);
__decorate([
    property({ attribute: false })
], FormElement.prototype, "inputRoot", void 0);
__decorate([
    property({ type: Boolean })
], FormElement.prototype, "disabled", void 0);
//# sourceMappingURL=FormElement.js.map