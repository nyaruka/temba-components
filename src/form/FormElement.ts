import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';

/**
 * FormElement is a component that appends a hidden input (outside of
 * its own shadow) with its value to be included in forms.
 */
export class FormElement extends RapidElement {
  @property({ type: String })
  name = '';

  @property({ type: String, attribute: 'help_text' })
  helpText: string;

  @property({ type: Boolean, attribute: 'widget_only' })
  widgetOnly: boolean;

  @property({ type: Array })
  errors: string[];

  // Use @property with custom getter/setter to handle both attribute and programmatic access
  private _value: any = '';

  @property({ type: String })
  public get value() {
    return this._value;
  }

  public set value(value) {
    this._value = value;
  }

  @property({ attribute: false })
  inputRoot: HTMLElement = this;

  @property({ type: Boolean })
  disabled = false;
  static formAssociated = true;

  protected internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('value')) {
      this.internals.setFormValue(this.value);
    }
  }

  get form() {
    return this.internals.form;
  }

  public setValue(value: any) {
    this.value = this.serializeValue(value);
  }

  public getDeserializedValue(): any {
    if (!this.value || this.value === '') {
      return null;
    }
    return JSON.parse(this.value);
  }

  public serializeValue(value: any): string {
    return JSON.stringify(value);
  }
}
