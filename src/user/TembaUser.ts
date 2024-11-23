import { PropertyValueMap, TemplateResult, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { User } from '../interfaces';
import { colorHash, extractInitials } from '../utils';
import { EndpointMonitorElement } from '../store/EndpointMonitorElement';
import { DEFAULT_AVATAR } from '../webchat/assets';

export class TembaUser extends EndpointMonitorElement {
  public static styles = css`
    :host {
      display: flex;
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

  @property({ type: String })
  email: string;

  @property({ type: Number })
  scale: number;

  @property({ type: Boolean })
  name: boolean;

  @property({ type: Boolean })
  system: boolean;

  @property({ type: String, attribute: false })
  background: string = '#e6e6e6';

  @property({ type: String, attribute: false })
  initials: string = '';

  @property({ type: String })
  fullname: string;

  @property({ type: Object, attribute: false })
  data: User;

  prepareData(data: any) {
    if (data.length > 0) {
      return data[0];
    }

    this.fullname = this.email;
    return null;
  }

  public updated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changed);

    if (changed.has('email') && this.email) {
      this.url = `/api/v2/users.json?email=${this.email}`;
    }

    if (changed.has('system') && this.system) {
      this.background = `url('${DEFAULT_AVATAR}') center / contain no-repeat`;
    }

    if (changed.has('data') && this.data) {
      if (this.data.first_name && this.data.last_name) {
        this.fullname = [this.data.first_name, this.data.last_name].join(' ');
        this.background = colorHash.hex(this.fullname);
        this.initials = extractInitials(this.fullname);
      }

      if (this.data.avatar) {
        this.background = `url('${this.data.avatar}') center / contain no-repeat`;
        this.initials = '';
      }
    }

    if (changed.has('fullname') && this.fullname && !this.data) {
      this.background = colorHash.hex(this.fullname);
      this.initials = extractInitials(this.fullname);
    }
  }

  public render(): TemplateResult {
    return html`<div class="wrapper">
      <div
        class="avatar-circle"
        style="
              transform:scale(${this.scale || 1});
              display: flex;
              height: 30px;
              width: 30px;
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
        ${this.initials
          ? html` <div
              style="border: 0px solid red; display:flex; flex-direction: column; align-items:center;flex-grow:1"
            >
              <div style="border:0px solid blue;">${this.initials}</div>
            </div>`
          : null}
      </div>
      ${this.name
        ? html`<div
            class="name"
            style="margin: 0px ${this.scale - 0.5}em;font-size:${this.scale +
            0.2}em"
          >
            ${this.fullname}
          </div>`
        : null}
    </div>`;
  }
}
