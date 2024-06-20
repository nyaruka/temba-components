import { PropertyValueMap, css, html } from 'lit';
import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';
import { getClasses } from '../utils';
import { Lightbox } from '../lightbox/Lightbox';
import { styleMap } from 'lit-html/directives/style-map.js';
import { WebChatIcon } from '../webchat';

enum ThumbnailContentType {
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  OTHER = 'other'
}

const ThumbnailIcons = {
  [ThumbnailContentType.IMAGE]: WebChatIcon.attachment_image,
  [ThumbnailContentType.AUDIO]: WebChatIcon.attachment_audio,
  [ThumbnailContentType.VIDEO]: WebChatIcon.attachment_video,
  [ThumbnailContentType.DOCUMENT]: WebChatIcon.attachment_document,
  [ThumbnailContentType.OTHER]: WebChatIcon.attachment
};

export class Thumbnail extends RapidElement {
  static get styles() {
    return css`
      :host {
        display: inline;
      }

      .wrapper {
        padding: var(--thumb-padding, 0.4em);
        background: var(--thumb-background, #fff);
        box-shadow: var(--widget-box-shadow);
        cursor: pointer;
        border-radius: calc(var(--curvature) * 1.5);
        border: 0px solid #f3f3f3;
      }

      .wrapper.zoom {
        border: none;
        padding: 0 !important;
        border-radius: 0 !important;
        overflow: hidden !important;
      }

      .zoom .thumb {
        border-radius: 0px !important;
        width: calc(var(--thumb-size, 4em) + 0.8em);
        height: calc(var(--thumb-size, 4em) + 0.8em);
        max-height: calc(var(--thumb-size, 4em) + 0.8em);
      }

      .thumb {
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        border-radius: var(--curvature);
        max-height: var(--thumb-size, 4em);
        height: var(--thumb-size, 4em);
        width: var(--thumb-size, 4em);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 400;
        color: var(--thumb-icon, #bbb);
      }

      .thumb.document,
      .thumb.audio,
      .thumb.video {
        border: 1px solid #eee;
      }

      .wrapper:hover .thumb.icon {
      }

      .viewer {
        display: block;
      }

      .zoom .viewer {
        display: block;
      }

      .zoom temba-icon {
        display: none;
      }
    `;
  }

  @property({ type: String })
  url: string;

  @property({ type: String })
  attachment: string;

  @property({ type: Boolean, attribute: false })
  zoom: boolean;

  @property({ type: String, attribute: false })
  contentType: string;

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);

    // convert our attachment to a url and label
    if (changes.has('attachment')) {
      if (this.attachment) {
        const splitIndex = this.attachment.indexOf(':');
        if (splitIndex === -1) {
          this.url = this.attachment;
        } else {
          const contentType = this.attachment.substring(0, splitIndex);
          this.url = this.attachment.substring(splitIndex + 1);

          if (contentType.startsWith('image')) {
            this.contentType = ThumbnailContentType.IMAGE;
          } else if (contentType.startsWith('audio')) {
            this.contentType = ThumbnailContentType.AUDIO;
          } else if (contentType.startsWith('video')) {
            this.contentType = ThumbnailContentType.VIDEO;
          } else if (contentType.startsWith('application')) {
            this.contentType = ThumbnailContentType.DOCUMENT;
          } else {
            this.contentType = ThumbnailContentType.OTHER;
          }
        }
      }
    }
  }

  public handleThumbnailClicked() {
    if (this.contentType === ThumbnailContentType.IMAGE) {
      window.setTimeout(() => {
        const lightbox = document.querySelector('temba-lightbox') as Lightbox;
        lightbox.showElement(this);
      }, 100);
    } else {
      window.open(this.url, '_blank');
    }
  }

  public render() {
    return html`
      <div
        @click=${this.handleThumbnailClicked.bind(this)}
        class="${getClasses({ wrapper: true, zoom: this.zoom })}"
        url=${this.url}
      >
        <div
          class="thumb ${this.contentType} "
          style="${this.url
            ? styleMap({
                backgroundImage: `url(${this.url})`
              })
            : ''}"
        >
          ${this.contentType !== ThumbnailContentType.IMAGE
            ? html`<temba-icon
                size="1.5"
                name="${ThumbnailIcons[this.contentType]}"
              ></temba-icon>`
            : null}
        </div>
      </div>
    `;
  }
}
