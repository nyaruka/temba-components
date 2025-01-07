import { PropertyValueMap, TemplateResult, css, html } from 'lit';
import { property } from 'lit/decorators.js';

import { colorHash, extractInitials } from '../utils';

import { DEFAULT_AVATAR } from '../webchat/assets';
import { RapidElement } from '../RapidElement';

export const getFullName = (user: {
  name?: string;
  first_name?: string;
  last_name?: string;
}) => {
  return user.name || [user.first_name, user.last_name].join(' ');
};

export class TembaUser extends RapidElement {
  public static styles = css`
    :host {
      display: flex;
      transform: scale(var(--temba-scale, 1));
      box-sizing: border-box;
    }

    .wrapper {
      display: flex;
      flex-direction: row;
      align-items: center;
      flex-grow: 1;
    }

    .name {
      flex-grow: 1;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `;

  @property({ type: Number })
  scale: number;

  @property({ type: Boolean })
  showName: boolean;

  @property({ type: Boolean })
  system: boolean;

  @property({ type: String, attribute: false })
  background: string = '#e6e6e6';

  @property({ type: String, attribute: false })
  initials: string = '';

  @property({ type: String })
  name: string;

  @property({ type: String })
  email: string;

  @property({ type: String })
  avatar: string;

  public updated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changed);

    if (changed.has('system') && this.system) {
      this.background = `url('${DEFAULT_AVATAR}') center / contain no-repeat`;
    }

    if (changed.has('name') && this.name) {
      this.background = colorHash.hex(this.name);
      this.initials = extractInitials(this.name);
    }

    if (changed.has('avatar') && this.avatar) {
      this.background = `url('${this.avatar}') center / contain no-repeat`;
    }
  }

  public render(): TemplateResult {
    return html`<div class="wrapper">
      <div
        class="avatar-circle"
        style="
              transform:scale(${this.scale || 1});
              display: flex;
              min-height: 26px;
              min-width: 26px;
              flex-direction: row;
              align-items: center;
              color: #fff;
              border-radius: 100%;
              font-weight: 400;
              overflow: hidden;
              font-size: 12px;
              box-shadow: inset 0 0 0 3px rgba(0, 0, 0, 0.1);
              background:${this.background}"
      >
        ${this.initials && !this.avatar
          ? html` <div
              style="border: 0px solid red; display:flex; flex-direction: column; align-items:center;flex-grow:1"
            >
              <div style="border:0px solid blue;">${this.initials}</div>
            </div>`
          : null}
      </div>
      ${this.showName
        ? html`<div
            class="name"
            style="margin: 0px ${this.scale - 0.5}em;font-size:${this.scale +
            0.2}em"
          >
            ${this.name}
          </div>`
        : null}
    </div>`;
  }
}
