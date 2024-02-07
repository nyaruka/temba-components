import { PropertyValueMap, TemplateResult, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { User } from '../interfaces';
import { StoreMonitorElement } from '../store/StoreMonitorElement';
import { colorHash, extractInitials } from '../utils';

export class TembaUser extends StoreMonitorElement {
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
  name: string;

  @property({ type: Object, attribute: false })
  user: User;

  @property({ type: String, attribute: false })
  background: string;

  @property({ type: String, attribute: false })
  initials: string;

  @property({ type: String, attribute: false })
  fullName: string;

  public updated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changed);
    if (changed.has('email')) {
      this.user = this.store.getUser(this.email);
      if (this.user) {
        this.fullName = [this.user.first_name, this.user.last_name].join(' ');
        if (this.user.avatar) {
          this.background = `url('${this.user.avatar}') center / contain no-repeat`;
          this.initials = '';
        } else {
          this.background = colorHash.hex(this.fullName);
          this.initials = extractInitials(this.fullName);
        }
      }
    }
  }

  public render(): TemplateResult {
    if (!this.user) {
      return null;
    }

    return html` <div class="wrapper">
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
            ${this.fullName}
          </div>`
        : null}
    </div>`;
  }
}
