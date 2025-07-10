import { __decorate } from "tslib";
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { colorHash, extractInitials } from '../utils';
import { DEFAULT_AVATAR } from '../webchat/assets';
import { RapidElement } from '../RapidElement';
export const getFullName = (user) => {
    return user.name || [user.first_name, user.last_name].join(' ');
};
export class TembaUser extends RapidElement {
    constructor() {
        super(...arguments);
        this.bgimage = null;
        this.bgcolor = '#e6e6e6';
        this.initials = '';
    }
    updated(changed) {
        super.updated(changed);
        if (changed.has('system') && this.system) {
            this.bgimage = `url('${DEFAULT_AVATAR}') center / contain no-repeat`;
        }
        if (changed.has('name')) {
            if (this.name) {
                this.bgcolor = colorHash.hex(this.name);
                this.initials = extractInitials(this.name);
            }
            else {
                this.bgcolor = '#e6e6e6';
                this.initials = '';
            }
        }
        if (changed.has('avatar')) {
            if (this.avatar) {
                this.bgimage = `url('${this.avatar}') center / contain no-repeat`;
            }
            else if (!this.system) {
                this.bgimage = null;
            }
        }
    }
    render() {
        return html `<div class="wrapper">
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
              font-size: 0.8em;
              margin-right: 0.75em;
              box-shadow: inset 0 0 0 3px rgba(0, 0, 0, 0.1);
              background:${this.bgimage || this.bgcolor};"
      >
        ${this.initials && !this.bgimage
            ? html ` <div
              style="border: 0px solid red; display:flex; flex-direction: column; align-items:center;flex-grow:1"
            >
              <div style="border:0px solid blue;">${this.initials}</div>
            </div>`
            : null}
      </div>
      ${this.showName
            ? html `<div
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
TembaUser.styles = css `
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
__decorate([
    property({ type: Number })
], TembaUser.prototype, "scale", void 0);
__decorate([
    property({ type: Boolean })
], TembaUser.prototype, "showName", void 0);
__decorate([
    property({ type: Boolean })
], TembaUser.prototype, "system", void 0);
__decorate([
    property({ type: String, attribute: false })
], TembaUser.prototype, "bgimage", void 0);
__decorate([
    property({ type: String, attribute: false })
], TembaUser.prototype, "bgcolor", void 0);
__decorate([
    property({ type: String, attribute: false })
], TembaUser.prototype, "initials", void 0);
__decorate([
    property({ type: String })
], TembaUser.prototype, "name", void 0);
__decorate([
    property({ type: String })
], TembaUser.prototype, "email", void 0);
__decorate([
    property({ type: String })
], TembaUser.prototype, "avatar", void 0);
//# sourceMappingURL=TembaUser.js.map