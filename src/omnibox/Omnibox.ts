import {
  customElement,
  TemplateResult,
  html,
  css,
  property,
} from "lit-element";
import RapidElement from "../RapidElement";
import { styleMap } from "lit-html/directives/style-map.js";
import "fa-icons";

enum OmniType {
  Group = "group",
  Contact = "contact",
  Urn = "urn",
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
  color: "var(--color-text-dark)",
  padding: "0px 6px",
  fontSize: "12px",
};

@customElement("temba-omnibox")
export default class Omnibox extends RapidElement {
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
  groups: boolean = false;

  @property({ type: Boolean })
  contacts: boolean = false;

  @property({ type: Boolean })
  urns: boolean = false;

  @property({ type: Array })
  value: OmniOption[] = [];

  @property({ type: Array })
  errors: string[];

  @property()
  placeholder: string = "Select recipients";

  /** An option in the drop down */
  private renderOption(option: OmniOption, selected: boolean): TemplateResult {
    return html`
      <div style="display:flex;">
        <div style="margin-right: 8px">
          ${this.getIcon(option, true, 14, "")}
        </div>
        <div style="flex: 1">${option.name}</div>
        <div
          style="background: rgba(50, 50, 50, 0.15); margin-left: 5px; display: flex; align-items: center; border-radius: 4px"
        >
          ${this.getPostName(option, selected)}
        </div>
      </div>
    `;
  }

  private getPostName(
    option: OmniOption,
    selected: boolean = false
  ): TemplateResult {
    const style = { ...postNameStyle };

    if (option.urn && option.type === OmniType.Contact) {
      if (option.urn !== option.name) {
        return html` <div style=${styleMap(style)}>${option.urn}</div> `;
      }
    }

    if (option.type === OmniType.Group) {
      return html` <div style=${styleMap(style)}>${option.count}</div> `;
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
          ${this.getIcon(option, false, 12, "")}
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

  private getIcon(
    option: OmniOption,
    asOption: boolean,
    size: number = 14,
    styles: any
  ): TemplateResult {
    if (option.type === OmniType.Group) {
      return html`
        <fa-icon
          class="fas user-friends"
          size="${size}px"
          style="margin-bottom: -2px;"
          path-prefix="/sitestatic"
        />
      `;
    }

    if (option.type === OmniType.Contact) {
      const style = asOption ? "margin: 0 1px;" : "margin-bottom: 0px;";

      return html`
        <fa-icon
          class="fas user"
          size="${size - 3}px"
          style="${style}"
          path-prefix="/sitestatic"
        />
      `;
    }
  }

  private getEndpoint() {
    const endpoint = this.endpoint;
    let types = "&types=";
    if (this.groups) {
      types += "g";
    }

    if (this.contacts) {
      types += "c";
    }

    if (this.urns) {
      types += "u";
    }

    return endpoint + types;
  }

  /** If we support urns, let them enter an arbitrary number */
  private createArbitraryOption(input: string): any {
    if (this.urns) {
      const num = parseFloat(input);
      if (!isNaN(num) && isFinite(num)) {
        return { id: "tel:" + input, name: input, type: "urn" };
      }
    }
  }

  public render(): TemplateResult {
    return html`
      <temba-select
        name=${this.name}
        endpoint=${this.getEndpoint()}
        placeholder=${this.placeholder}
        queryParam="search"
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
