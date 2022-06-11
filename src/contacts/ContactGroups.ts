import { css, html, TemplateResult } from 'lit';
import { Group } from '../interfaces';
import { ContactStoreElement } from './ContactStoreElement';

export class ContactGroups extends ContactStoreElement {
  static get styles() {
    return css`
      .groups {
        display: flex;
        flex-wrap: wrap;
      }

      temba-label {
        margin: 0.3em;
      }
    `;
  }

  public render(): TemplateResult {
    return html`${this.data
      ? html`
          <div class="groups">
            ${this.data.groups.map((group: Group) => {
              return html`
                <temba-label
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
        `
      : null}`;
  }
}
