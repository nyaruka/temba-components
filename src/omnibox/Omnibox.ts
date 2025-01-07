import { TemplateResult, html, PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { Select, SelectOption } from '../select/Select';
import { Icon } from '../vectoricon';

enum OmniType {
  Group = 'group',
  Contact = 'contact'
}

export interface OmniOption extends SelectOption {
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
  fontSize: '12px'
};

export class Omnibox extends Select<OmniOption> {
  @property({ type: String })
  valueKey = 'uuid';

  @property({ type: Boolean })
  groups = false;

  @property({ type: Boolean })
  contacts = false;

  @property({ type: String })
  placeholder = 'Select recipients';

  @property({ type: Boolean })
  multi = true;

  @property({ type: Boolean })
  searchable = true;

  @property({ type: Boolean })
  searchOnFocus = true;

  @property({ type: Boolean })
  queryParam = 'search';

  public update(changes: PropertyValues): void {
    super.update(changes);

    if (
      (changes.has('groups') || changes.has('contacts')) &&
      (this.groups || this.contacts)
    ) {
      let types = '&types=';
      if (this.groups) {
        types += 'g';
      }

      if (this.contacts) {
        types += 'c';
      }

      this.endpoint = this.endpoint + types;
    }
  }

  /** An option in the drop down */
  public renderOptionDefault(option: OmniOption): TemplateResult {
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
        return html`<div style=${styleMap(style)}>${option.urn}</div>`;
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
  public renderSelectedItemDefault(option: OmniOption): TemplateResult {
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
      return html`<temba-icon name="${Icon.group}"></temba-icon>`;
    }

    if (option.type === OmniType.Contact) {
      return html`<temba-icon name="${Icon.contact}"></temba-icon>`;
    }
  }

  /*public getValues(): any[] {
    const select = this.shadowRoot.querySelector('temba-select') as Select<any>;
    return select.values;
  }*/

  /* 
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
        .inputRoot=${this}
        .isMatch=${this.isMatch}
        .infoText=${this.infoText}
        searchable
        searchOnFocus
        multi
        ><div slot="right">
          <slot name="right"></slot></div
      ></temba-select>
    `;
  }*/
}
