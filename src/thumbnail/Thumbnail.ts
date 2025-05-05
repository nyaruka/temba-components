import { PropertyValueMap, css, html } from 'lit';
import { RapidElement } from '../RapidElement';
import { property } from 'lit/decorators.js';
import { getClasses } from '../utils';
import { Lightbox } from '../lightbox/Lightbox';
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
        max-height: calc(90vh - 10em);
      }

      .thumb {
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        border-radius: var(--curvature);
        max-height: calc(var(--thumb-size, 4em) * 2);
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

      .download {
        display: none;
        position: absolute;
        right: 0em;
        bottom: 0em;
        border-radius: var(--curvature);
        transform: scale(0.2) translate(3em, 3em);
        padding: 0.4em;
      }

      .zoom .download {
        display: block;
        background: rgba(0, 0, 0, 0.5);
      }

      .zoom .download:hover {
        background: rgba(0, 0, 0, 0.6);
        cursor: pointer;
      }
    `;
  }

  @property({ type: String })
  url: string;

  @property({ type: String })
  attachment: string;

  @property({ type: Number })
  ratio: number = 0;

  @property({ type: Boolean })
  preview: boolean = true;

  @property({ type: Boolean, attribute: false })
  zoom: boolean;

  @property({ type: String, attribute: false })
  contentType: string;

  protected updated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(changes);

    if (
      changes.has('contentType') &&
      this.contentType === ThumbnailContentType.IMAGE
    ) {
      const toObserve = this.shadowRoot.querySelector('.observe');
      if (toObserve) {
        new ResizeObserver((e, observer) => {
          if (toObserve.clientHeight > 0 && toObserve.clientWidth > 0) {
            this.ratio = toObserve.clientHeight / toObserve.clientWidth;
            this.preview =
              this.ratio === 0 || (this.ratio > 0.25 && this.ratio <= 1.5);
            observer.disconnect();
          }
        }).observe(toObserve);
      }
    }

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
    if (this.contentType === ThumbnailContentType.IMAGE && this.preview) {
      window.setTimeout(() => {
        const lightbox = document.querySelector('temba-lightbox') as Lightbox;
        lightbox.showElement(this);
      }, 100);
    } else {
      window.open(this.url, '_blank');
    }
  }

  public handleDownload(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    // open this.url in another tab
    window.open(this.url, '_blank');
  }

  public render() {
    return html`
      <div
        @click=${this.handleThumbnailClicked.bind(this)}
        class="${getClasses({ wrapper: true, zoom: this.zoom })}"
        url=${this.url}
      >
        ${this.contentType === ThumbnailContentType.IMAGE && this.preview
          ? html`<div class=""><div class="download" @click=${this.handleDownload.bind(
              this
            )}><temba-icon size="1" style="color:#fff;" name="download"></temba-icon></div><img
          class="observe thumb ${this.contentType}"
          src="${this.url}"
        ></img></div>`
          : html`<div
              style="padding:1em; background:rgba(0,0,0,.05);border-radius:var(--curvature);"
            >
              <temba-icon
                size="1.5"
                name="${ThumbnailIcons[this.contentType]}"
              ></temba-icon>
            </div>`}
      </div>
    `;
  }
}
