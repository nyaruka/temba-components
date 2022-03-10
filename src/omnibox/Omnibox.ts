import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { styleMap } from 'lit-html/directives/style-map';
import { RapidElement } from '../RapidElement';
import { Select } from '../select/Select';

enum OmniType {
  Group = 'group',
  Contact = 'contact',
  Urn = 'urn',
}

interface OmniOption {
  id: string;
  name: string;
  type: OmniType;
  urn?: string;
  count?: number;
  contact?: string;
  scheme?: string;
}

const postNameStyle = {
  color: 'var(--color-text-dark)',
  padding: '0px 6px',
  fontSize: '12px',
};

export class Omnibox extends RapidElement {
  static get styles() {
    return css`
      temba-select:focus {
        outline: none;
        box-shadow: none;
      }

      :host {
      }
    `;
  }

  @property()
  endpoint: string;

  @property()
  name: string;

  @property({ type: Boolean })
  groups = false;

  @property({ type: Boolean })
  contacts = false;

  @property({ type: Boolean })
  urns = false;

  @property({ type: Array })
  value: OmniOption[] = [];

  @property({ type: Array })
  errors: string[];

  @property()
  placeholder = 'Select recipients';

  @property({ type: Boolean })
  disabled = false;

  @property({ type: String, attribute: 'help_text' })
  helpText: string;

  @property({ type: Boolean, attribute: 'help_always' })
  helpAlways: boolean;

  @property({ type: Boolean, attribute: 'widget_only' })
  widgetOnly: boolean;

  @property({ type: Boolean, attribute: 'hide_label' })
  hideLabel: boolean;

  @property({ type: String })
  label: string;

  /** An option in the drop down */
  private renderOption(option: OmniOption): TemplateResult {
    return html`
      <div style="display:flex;">
        <div style="margin-right: 8px">${this.getIcon(option)}</div>
        <div style="flex: 1">${option.name}</div>
        <div
          style="background: rgba(50, 50, 50, 0.15); margin-left: 5px; display: flex; align-items: center; border-radius: 4px"
        >
          ${this.getPostName(option)}
        </div>
      </div>
    `;
  }

  private getPostName(option: OmniOption): TemplateResult {
    const style = { ...postNameStyle };

    if (option.urn && option.type === OmniType.Contact) {
      if (option.urn !== option.name) {
        return html` <div style=${styleMap(style)}>${option.urn}</div> `;
      }
    }

    if (option.type === OmniType.Group) {
      return html`
        <div style=${styleMap(style)}>${option.count.toLocaleString()}</div>
      `;
    }

    return null;
  }

  /** Selection in the multi-select select box */
  private renderSelection(option: OmniOption): TemplateResult {
    return html`
      <div
        style="flex:1 1 auto; display: flex; align-items: stretch; color: var(--color-text-dark); font-size: 12px;"
      >
        <div style="align-self: center; padding: 0px 7px; color: #bbb">
          ${this.getIcon(option)}
        </div>
        <div
          class="name"
          style="align-self: center; padding: 0px; font-size: 12px;"
        >
          ${option.name}
        </div>
        <div
          style="background: rgba(100, 100, 100, 0.05); border-left: 1px solid rgba(100, 100, 100, 0.1); margin-left: 12px; display: flex; align-items: center"
        >
          ${this.getPostName(option)}
        </div>
      </div>
    `;
  }

  private getIcon(option: OmniOption): TemplateResult {
    if (option.type === OmniType.Group) {
      return html` <temba-icon name="users" /> `;
    }

    if (option.type === OmniType.Contact) {
      return html` <temba-icon name="user" /> `;
    }
  }

  private getEndpoint() {
    const endpoint = this.endpoint;
    let types = '&types=';
    if (this.groups) {
      types += 'g';
    }

    if (this.contacts) {
      types += 'c';
    }

    if (this.urns) {
      types += 'u';
    }

    return endpoint + types;
  }

  /** If we support urns, let them enter an arbitrary number */
  private createArbitraryOption(input: string): any {
    if (this.urns) {
      const num = parseFloat(input);
      if (!isNaN(num) && isFinite(num)) {
        return { id: 'tel:' + input, name: input, type: 'urn' };
      }
    }
  }

  public getValues(): any[] {
    const select = this.shadowRoot.querySelector('temba-select') as Select;
    return select.values;
  }

  public render(): TemplateResult {
    return html`
      <temba-select
        name=${this.name}
        endpoint=${this.getEndpoint()}
        placeholder=${this.placeholder}
        queryParam="search"
        .label=${this.label}
        .helpText=${this.helpText}
        .widgetOnly=${this.widgetOnly}
        ?disabled=${this.disabled}
        .errors=${this.errors}
        .values=${this.value}
        .renderOption=${this.renderOption.bind(this)}
        .renderSelectedItem=${this.renderSelection.bind(this)}
        .createArbitraryOption=${this.createArbitraryOption.bind(this)}
        .inputRoot=${this}
        searchable
        searchOnFocus
        multi
      ></temba-select>
    `;
  }
}
