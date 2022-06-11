import { css, html, TemplateResult } from 'lit';
import { Group } from '../interfaces';
import { ContactStoreElement } from './ContactStoreElement';

const STATUS = {
  S: { name: 'Stopped', icon: 'x-octagon' },
  B: { name: 'Blocked', icon: 'slash' },
  V: { name: 'Archived', icon: 'archive' },
};

export class ContactBadges extends ContactStoreElement {
  static get styles() {
    return css`
      temba-label {
        margin: 0.3em;
      }

      .badges {
        display: flex;
        flex-wrap: wrap;
      }

      .flow {
      }
    `;
  }

  public render(): TemplateResult {
    if (this.data) {
      console.log(this.data);

      const status = STATUS[this.data.status];

      return html`
        <div class="badges">
          ${status && this.data.status !== 'A'
            ? html`
                <temba-label
                  class="status"
                  icon="${status.icon}"
                  onclick="goto(event)"
                  href="/contact/${status.name.toLowerCase()}"
                  clickable
                  secondary
                  shadow
                >
                  ${status.name}
                </temba-label>
              `
            : null}
          ${this.data.flow
            ? html`
                <temba-label
                  class="flow"
                  icon="flow"
                  onclick="goto(event)"
                  href="/contact/?search=flow+%3D+${encodeURIComponent(
                    '"' + this.data.flow.name + '"'
                  )}"
                  clickable
                  tertiary
                  shadow
                >
                  ${this.data.flow.name}
                </temba-label>
              `
            : null}
          ${this.data.language
            ? html`
                <temba-label
                  class="language"
                  icon="globe"
                  onclick="goto(event)"
                  href="/contact/?search=language+%3D+${encodeURIComponent(
                    '"' + this.data.language + '"'
                  )}"
                  clickable
                  primary
                  shadow
                >
                  ${this.store.getLanguageName(this.data.language)}
                </temba-label>
              `
            : null}
          ${this.data.groups.map((group: Group) => {
            return html`
              <temba-label
                class="group"
                onclick="goto(event)"
                href="/contact/filter/${group.uuid}/"
                icon=${group.is_dynamic ? 'atom' : 'users'}
                clickable
                light
                shadow
              >
                ${group.name}
              </temba-label>
            `;
          })}
        </div>
      `;
    } else {
      return null;
    }
  }
}
