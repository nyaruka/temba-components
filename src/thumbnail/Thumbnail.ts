import { css, html } from 'lit';
import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';
import { getClasses } from '../utils';
import { Lightbox } from '../lightbox/Lightbox';
import { styleMap } from 'lit-html/directives/style-map.js';

export class Thumbnail extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: inline;
      }

      .zooming.wrapper {
        padding: 0 !important;
        border-radius: 0;
      }

      .zooming .thumb {
        border-radius: 0;
      }

      .wrapper {
        padding: var(--thumb-padding, 0.4em);
        background: #fff;
        border-radius: var(--curvature);
        box-shadow: var(--widget-box-shadow);
      }

      .thumb {
      }
    `;
  }

  @property({ type: String })
  url: string;

  @property({ type: String })
  label: string;

  @property({ type: Boolean })
  zoom = true;

  @property({ type: Boolean })
  zooming = false;

  public handleClick() {
    window.setTimeout(() => {
      const lightbox = document.querySelector('temba-lightbox') as Lightbox;
      lightbox.showElement(this);
    }, 0);
  }

  public render() {
    if (this.zooming) {
      return html`
        <div
          class="${getClasses({ wrapper: true })}"
          style=${styleMap({
            background: 'red',
            borderRadius: '0',
            boxShadow: 'var(--widget-box-shadow)'
          })}
        >
          <div
            class="thumb"
            style=${styleMap({
              backgroundImage: `url(${this.url})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              maxHeight: 'var(--thumb-size, 4em)',
              height: 'var(--thumb-size, 4em)',
              width: 'var(--thumb-size, 4em)',
              borderRadius: '0',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '400',
              color: '#bbb'
            })}
          >
            ${this.label}
          </div>
        </div>
      `;
    } else {
      return html`
      <div class="${getClasses({ wrapper: true })}" style=${styleMap({
        padding: 'var(--thumb-padding, 0.4em)',
        background: '#fff',
        borderRadius: 'var(--curvature)',
        boxShadow: 'var(--widget-box-shadow)'
      })}">

          <div class="thumb" style=${styleMap({
            backgroundImage: `url(${this.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            maxHeight: 'var(--thumb-size, 4em)',
            height: 'var(--thumb-size, 4em)',
            width: 'var(--thumb-size, 4em)',
            borderRadius: 'var(--curvature)',

            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '400',
            color: '#bbb'
          })}>
            ${this.label}
            </div>
      </div>
    `;
    }
  }
}
