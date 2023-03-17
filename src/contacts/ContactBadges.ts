import { css, html, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { Group } from '../interfaces';
import { debounce, getClasses } from '../utils';
import { Icon } from '../vectoricon';
import { ContactStoreElement } from './ContactStoreElement';

const STATUS = {
  stopped: { name: 'Stopped' },
  blocked: { name: 'Blocked' },
  archived: { name: 'Archived' },
};

export class ContactBadges extends ContactStoreElement {
  static get styles() {
    return css`
      .wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      temba-label {
        margin: 0.3em;
      }

      .expanded .badges {
        max-height: inherit;
      }

      .expanded .show-button {
        opacity: 1;
        margin-bottom: 0em;
        margin-top: -0.5em;
      }

      .expanded .show-line {
        width: 98%;
        opacity: 1;
      }

      .badges {
        display: flex;
        overflow: hidden;
        flex-wrap: wrap;
        max-height: 2.2em;
        align-self: flex-start;
      }

      .show-button {
        transition: all var(--transition-speed) ease-in-out
          var(--transition-speed);
        opacity: 0;
        display: flex;
        padding: 0em 1em;
        margin-top: -0.8em;
        cursor: pointer;
        --icon-color-circle: #fff;
        margin-bottom: -1.5em;
      }

      .show-line {
        height: 1px;
        width: 100%;
        background: rgba(0, 0, 0, 0.05);
        margin-top: 1em;
        width: 0px;
        transition: width calc(var(--transition-speed) * 2) linear
          var(--transition-speed);
      }

      .has-more .show-line {
        width: 98%;
      }

      .has-more .show-button {
        opacity: 1;
        margin-bottom: 0em;
        margin-top: -0.5em;
      }

      .show-button temba-icon {
        border-radius: 9999px;
      }
    `;
  }

  @property({ type: Boolean })
  hasMore = false;

  @property({ type: Boolean })
  expanded = false;

  private handleResized() {
    if (this.shadowRoot) {
      const badges = this.shadowRoot.querySelector('.badges');
      if (badges) {
        this.hasMore = badges.scrollHeight > badges.clientHeight;
      }
    }
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('data')) {
      if (!changedProperties.get('data')) {
        const badges = this.shadowRoot.querySelector('.badges');
        new ResizeObserver(
          debounce(this.handleResized.bind(this), 200)
        ).observe(badges);
      }
    }
  }

  public render(): TemplateResult {
    if (this.data) {
      const status = STATUS[this.data.status];
      return html`
        <div
          class=${getClasses({
            wrapper: true,
            'has-more': this.hasMore,
            expanded: this.expanded,
          })}
        >
          <div class="badges">
            ${status && this.data.status !== 'active'
              ? html`
                  <temba-label
                    icon="icon.contact_${this.data.status}"
                    onclick="goto(event)"
                    href="/contact/${status.name.toLowerCase()}/"
                    secondary
                    clickable
                    shadow
                  >
                    ${status.name}
                  </temba-label>
                `
              : null}
            ${this.data.flow
              ? html`
                  <temba-label
                    icon="flow"
                    onclick="goto(event)"
                    href="/contact/?search=flow+%3D+${encodeURIComponent(
                      '"' + this.data.flow.name + '"'
                    )}"
                    clickable
                    primary
                    shadow
                  >
                    ${this.data.flow.name}
                  </temba-label>
                `
              : null}
            ${this.data.language
              ? html`
                  <temba-label
                    icon=${Icon.language}
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
                  icon=${group.is_dynamic ? Icon.group_smart : Icon.group}
                  clickable
                  shadow
                >
                  ${group.name}
                </temba-label>
              `;
            })}
          </div>
          <div class="show-line"></div>

          <div class="show-button">
            <temba-icon
              @click=${() => {
                this.expanded = !this.expanded;
              }}
              circled
              name=${!this.expanded ? Icon.down : Icon.up}
              animateChange="spin"
            ></temba-icon>
          </div>
        </div>
      `;
    } else {
      return null;
    }
  }
}
