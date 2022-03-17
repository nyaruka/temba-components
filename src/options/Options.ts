import { TemplateResult, html, css } from 'lit';
import { property } from 'lit/decorators';
import { CustomEventType } from '../interfaces';
import { RapidElement, EventHandler } from '../RapidElement';
import { styleMap } from 'lit-html/directives/style-map';
import {
  getClasses,
  getScrollParent,
  isElementVisible,
  throttle,
} from '../utils';

export class Options extends RapidElement {
  static get styles() {
    return css`
      .options-container {
        background: var(--color-widget-bg-focused);
        user-select: none;
        box-shadow: var(--options-shadow);
        border-radius: var(--curvature-widget);
        overflow: hidden;
        margin-top: var(--options-margin-top);
        display: flex;
        flex-direction: column;
        transform: scaleY(0.5) translateY(-5em);
        transition: transform var(--transition-speed)
            cubic-bezier(0.71, 0.18, 0.61, 1.33),
          opacity var(--transition-speed) cubic-bezier(0.71, 0.18, 0.61, 1.33);
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        border: 1px transparent;
      }

      .anchored {
        position: fixed;
      }

      :host([block]) .options-container {
        flex-grow: 1;
        height: 100%;
        border: none;
      }

      :host([block]) .options-scroll {
        height: 100%;
        z-index: 9000;
        visibility: visible;
        overflow-y: auto;
        flex-grow: 1;
        -webkit-mask-image: -webkit-radial-gradient(white, black);
      }

      :host([block]) {
        box-shadow: var(--options-block-shadow);
        border-radius: var(--curvature);
        display: block;
        height: 100%;
      }

      :host([block]) .options {
        margin-bottom: 1.5em;
      }

      .options-scroll {
        display: flex;
        flex-direction: column;
      }

      :host([collapsed]) temba-icon {
        flex-grow: 1;
        margin-right: 0px !important;
        padding-top: 0.25em;
        padding-bottom: 0.25em;
      }

      :host([collapsed]) .name {
        display: none;
      }

      :host([collapsed]) .count {
        display: none;
      }

      .options {
        border-radius: var(--curvature-widget);
        overflow-y: auto;
        max-height: 225px;
        border: none;
      }

      .show {
        z-index: 10000;
        transform: scaleY(1) translateY(0);
        border: 1px solid var(--color-widget-border);
        pointer-events: auto;
        opacity: 1;
      }

      .option {
        font-size: var(--temba-options-font-size);
        padding: 5px 10px;
        border-radius: 4px;
        margin: 0.3em;
        cursor: pointer;
        color: var(--color-text-dark);
      }

      .option * {
        user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        overflow-wrap: break-word;
        word-wrap: break-word;
        -ms-word-break: break-all;
        word-break: break-word;
        -ms-hyphens: auto;
        -moz-hyphens: auto;
        -webkit-hyphens: auto;
        hyphens: auto;
      }

      .option.focused {
        background: var(--color-selection);
        color: var(--color-text-dark);
      }

      .option .detail {
        font-size: 85%;
        color: rgba(0, 0, 0, 0.4);
      }

      code {
        background: rgba(0, 0, 0, 0.05);
        padding: 1px 5px;
        border-radius: var(--curvature-widget);
      }

      :host([block]) {
        position: relative;
      }

      :host([block]) .options {
        overflow-y: initial;
      }

      temba-loading {
        align-self: center;
        margin-top: 0.025em;
      }

      .loader-bar {
        pointer-events: none;
        align-items: center;
        background: #eee;
        max-height: 0;
        transition: max-height var(--transition-speed) ease-in-out;
        border-bottom-left-radius: var(--curvature-widget);
        border-bottom-right-radius: var(--curvature-widget);
        display: flex;
        overflow: hidden;
      }

      .loading .loader-bar {
        max-height: 1.1em;
      }
    `;
  }

  @property({ type: Number })
  top: number;

  @property({ type: Number })
  left: number;

  @property({ type: Number })
  width: number;

  @property({ type: Number })
  marginHorizontal = 0;

  @property({ type: Number })
  marginVertical = 7;

  @property({ type: Object })
  anchorTo: HTMLElement;

  @property({ type: Boolean })
  visible: boolean;

  @property({ type: Boolean })
  block: boolean;

  @property({ type: Number })
  scrollPct = 75;

  @property({ type: Number })
  cursorIndex = -1;

  @property({ type: Array })
  options: any[];

  @property({ type: Array })
  tempOptions: any[];

  @property({ type: Boolean })
  poppedTop: boolean;

  @property({ type: Boolean })
  spaceSelect: boolean;

  @property({ type: String })
  nameKey = 'name';

  @property({ type: Boolean })
  loading = false;

  @property({ type: Boolean })
  collapsed: boolean;

  @property({ attribute: false })
  getName: { (option: any): string } = function (option: any) {
    return option[this.nameKey || 'name'];
  };

  @property({ attribute: false })
  renderInputOption: { (): TemplateResult } = function () {
    return null;
  };

  @property({ attribute: false })
  renderOption: { (option: any, selected: boolean): TemplateResult };

  @property({ attribute: false })
  renderOptionName: { (option: any, selected: boolean): TemplateResult };

  @property({ attribute: false })
  renderOptionDetail: { (option: any, selected: boolean): TemplateResult };

  @property({ type: Number })
  scrollHeight = 0;

  @property({ type: Boolean })
  triggerScroll = false;

  scrollParent: HTMLElement = null;

  resolvedRenderOption: { (option: any, selected: boolean): TemplateResult };

  public firstUpdated() {
    if (!this.block) {
      this.scrollParent = getScrollParent(this);
      this.calculatePosition = this.calculatePosition.bind(this);
      if (this.scrollParent) {
        this.scrollParent.addEventListener('scroll', this.calculatePosition);
      }
      this.calculatePosition();
    }

    this.resolvedRenderOption = (
      this.renderOption || this.renderOptionDefault
    ).bind(this);
  }

  public disconnectedCallback() {
    if (!this.block) {
      if (this.scrollParent) {
        this.scrollParent.removeEventListener('scroll', this.calculatePosition);
      }
    }
  }

  private isFocused() {
    const focused =
      this.closestElement(document.activeElement.tagName) ===
      document.activeElement;

    return focused;
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // if our cursor changed, lets make sure our scrollbox is showing it
    if (changedProperties.has('cursorIndex')) {
      const focusedOption = this.shadowRoot.querySelector(
        `div[data-option-index="${this.cursorIndex}"]`
      ) as HTMLDivElement;

      if (focusedOption) {
        const scrollBox = this.shadowRoot.querySelector('.options-container');
        const scrollBoxRect = scrollBox.getBoundingClientRect();
        const scrollBoxHeight = scrollBoxRect.height;
        const focusedEleHeight = focusedOption.getBoundingClientRect().height;

        if (
          focusedOption.offsetTop + focusedEleHeight >
          scrollBox.scrollTop + scrollBoxHeight - 5
        ) {
          const scrollTo =
            focusedOption.offsetTop - scrollBoxHeight + focusedEleHeight + 5;
          scrollBox.scrollTop = scrollTo;
        } else if (focusedOption.offsetTop < scrollBox.scrollTop) {
          const scrollTo = focusedOption.offsetTop - 5;
          scrollBox.scrollTop = scrollTo;
        }
      }

      this.fireCustomEvent(CustomEventType.CursorChanged, {
        index: this.cursorIndex,
      });
    }

    if (changedProperties.has('visible') && changedProperties.has('options')) {
      if (!this.visible && this.options.length == 0) {
        this.tempOptions = changedProperties.get('options');
        window.setTimeout(() => {
          this.tempOptions = [];
        }, 300);
      }
    }

    if (changedProperties.has('options')) {
      this.calculatePosition();

      // allow scrolls to trigger again
      this.triggerScroll = true;

      const prevOptions = changedProperties.get('options');
      const previousCount = prevOptions ? prevOptions.length : 0;
      const newCount = this.options ? this.options.length : 0;

      if (
        this.cursorIndex === -1 ||
        newCount < previousCount ||
        (previousCount === 0 &&
          newCount > 0 &&
          !changedProperties.has('cursorIndex'))
      ) {
        if (!this.block) {
          this.cursorIndex = 0;
        } else {
          if (this.cursorIndex >= newCount) {
            this.cursorIndex = newCount - 1;
          }
        }

        if (this.block) {
          this.handleSelection(false);
        }
      }

      // if on initial load we don't have enough options to load, trigger a scroll
      // threshold event in case the page size is smaller than our control height
      const scrollBox = this.shadowRoot.querySelector('.options');
      if (scrollBox.scrollHeight == scrollBox.clientHeight) {
        this.fireCustomEvent(CustomEventType.ScrollThreshold);
      }
    }

    if (changedProperties.has('visible')) {
      window.setTimeout(() => {
        this.calculatePosition();
      }, 100);
    }
  }

  private renderOptionDefault(option: any, selected: boolean): TemplateResult {
    const renderOptionName = (
      this.renderOptionName || this.renderOptionNameDefault
    ).bind(this);
    const renderOptionDetail = (
      this.renderOptionDetail || this.renderOptionDetailDefault
    ).bind(this);

    if (selected) {
      return html`
        <div class="name">${renderOptionName(option, selected)}</div>
        <div class="detail">${renderOptionDetail(option, selected)}</div>
      `;
    } else {
      return html`
        <div class="name">${renderOptionName(option, selected)}</div>
      `;
    }
  }

  private renderOptionNameDefault(option: any): TemplateResult {
    return html`<div style="display:flex; align-items:flex-start">
      ${option.icon
        ? html`<temba-icon
            name="${option.icon}"
            style="margin-right:0.5em; fill: var(--color-text-dark);"
          ></temba-icon>`
        : null}
      <div style="flex-grow:1">${option.prefix}${this.getName(option)}</div>
    </div>`;
  }

  private renderOptionDetailDefault(option: any): TemplateResult {
    return html` ${option.detail} `;
  }

  private handleSelection(tabbed = false, index = -1) {
    if (index === -1) {
      index = this.cursorIndex;
    }

    const selected = this.options[index];
    this.fireCustomEvent(CustomEventType.Selection, {
      selected,
      tabbed,
      index,
    });
  }

  private moveCursor(direction: number): void {
    const newIndex = Math.max(
      Math.min(this.cursorIndex + direction, this.options.length - 1),
      0
    );
    this.setCursor(newIndex);
  }

  private setCursor: (index: number) => void = throttle(function (
    index: number
  ) {
    if (index !== this.cursorIndex) {
      this.cursorIndex = index;
    }
  },
  50);

  private handleKeyDown(evt: KeyboardEvent) {
    if (this.block && !this.isFocused()) {
      return;
    }

    if (this.options && this.options.length > 0) {
      if ((evt.ctrlKey && evt.key === 'n') || evt.key === 'ArrowDown') {
        this.moveCursor(1);
        evt.preventDefault();
        evt.stopPropagation();
        if (this.block) {
          this.handleSelection(false);
        }
      } else if ((evt.ctrlKey && evt.key === 'p') || evt.key === 'ArrowUp') {
        this.moveCursor(-1);
        evt.preventDefault();
        if (this.block) {
          this.handleSelection(false);
        }
      } else if (
        evt.key === 'Enter' ||
        evt.key === 'Tab' ||
        (this.spaceSelect && evt.key === ' ')
      ) {
        evt.preventDefault();
        evt.stopPropagation();
        this.handleSelection(evt.key === 'Tab');
      }

      if (evt.key === 'Escape') {
        this.fireCustomEvent(CustomEventType.Canceled);
      }
    }
  }

  private handleInnerScroll(evt: Event) {
    const scrollbox = evt.target as HTMLDivElement;

    // scroll height has changed, enable scroll trigger
    if (scrollbox.scrollHeight > this.scrollHeight) {
      this.scrollHeight = scrollbox.scrollHeight;
      this.triggerScroll = true;
    }

    if (this.triggerScroll) {
      const scrollPct =
        scrollbox.scrollTop / (scrollbox.scrollHeight - scrollbox.clientHeight);
      if (scrollPct * 100 > this.scrollPct) {
        this.fireCustomEvent(CustomEventType.ScrollThreshold);
        this.triggerScroll = false;
      }
    }
  }

  private calculatePosition() {
    if (this.visible && !this.block) {
      const optionsBounds = this.shadowRoot
        .querySelector('.options-container')
        .getBoundingClientRect();

      if (this.anchorTo) {
        const anchorBounds = this.anchorTo.getBoundingClientRect();
        const topTop = anchorBounds.top - optionsBounds.height;

        if (this.anchorTo && this.scrollParent) {
          if (!isElementVisible(this.anchorTo, this.scrollParent)) {
            // this.fireCustomEvent(CustomEventType.Canceled);
          }
        }

        if (
          topTop > 0 &&
          anchorBounds.bottom + optionsBounds.height > window.innerHeight
        ) {
          this.top = topTop; //  + window.pageYOffset;
          this.poppedTop = true;
        } else {
          this.top = anchorBounds.bottom; //  + window.pageYOffset;
          this.poppedTop = false;
        }

        this.left = anchorBounds.left;
        this.width = anchorBounds.width - 2 - this.marginHorizontal * 2;
      }
    }
  }

  public getEventHandlers(): EventHandler[] {
    return [
      {
        event: 'keydown',
        method: this.handleKeyDown,
        isDocument: true,
      },
      {
        event: 'scroll',
        method: this.calculatePosition,
        isDocument: true,
      },
    ];
  }

  private handleMouseMove(evt: MouseEvent) {
    if (!this.block) {
      if (Math.abs(evt.movementX) + Math.abs(evt.movementY) > 0) {
        const index = (evt.currentTarget as HTMLElement).getAttribute(
          'data-option-index'
        );
        this.setCursor(parseInt(index));
      }
    }
  }

  // we need to swallow mouse down so we don't grab focus
  private handleMouseDown(evt: MouseEvent) {
    evt.preventDefault();
    evt.stopPropagation();
  }

  private handleOptionClick(evt: MouseEvent) {
    evt.preventDefault();
    evt.stopPropagation();

    const index = (evt.currentTarget as HTMLElement).getAttribute(
      'data-option-index'
    );

    if (index) {
      const newIndex = parseInt(index);
      this.setCursor(newIndex);
      this.handleSelection(false, newIndex);
    }
  }

  public render(): TemplateResult {
    let vertical = this.block ? 0 : this.marginVertical;
    if (this.poppedTop) {
      vertical *= -1;
    }

    const containerStyle = {
      top: this.top ? `${this.top}px` : '0px',
      left: this.left ? `${this.left}px` : '0px',
      'margin-left': `${this.marginHorizontal}px`,
      'margin-top': `${vertical}px`,
    };

    const optionsStyle = {};
    if (this.width) {
      optionsStyle['width'] = `${this.width}px`;
    }

    const classes = getClasses({
      'options-container': true,
      show: this.visible,
      top: this.poppedTop,
      anchored: !this.block,
      loading: this.loading,
    });

    const classesInner = getClasses({
      options: true,
    });

    let options = this.options || [];
    if (
      options.length == 0 &&
      this.tempOptions &&
      this.tempOptions.length > 0
    ) {
      options = this.tempOptions;
    }

    return html`
      <div class=${classes} style=${styleMap(containerStyle)}>
        <div
          class="options-scroll"
          @scroll=${this.handleInnerScroll}
          @mousedown=${this.handleMouseDown}
        >
          <div class="${classesInner}" style=${styleMap(optionsStyle)}>
            ${options.map((option, index) => {
              return html`<div
                data-option-index="${index}"
                @mousemove=${this.handleMouseMove}
                @click=${this.handleOptionClick}
                @mousedown=${this.handleMouseDown}
                class="option ${index === this.cursorIndex ? 'focused' : ''}"
              >
                ${this.resolvedRenderOption(option, index === this.cursorIndex)}
              </div>`;
            })}
            ${this.block ? html`<div style="height:0.1em"></div>` : null}
          </div>
          <slot></slot>
        </div>

        <div class="loader-bar">
          <temba-loading></temba-loading>
        </div>
      </div>
    `;
  }
}
