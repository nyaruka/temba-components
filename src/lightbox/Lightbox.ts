import { css, html, PropertyValueMap } from 'lit';
import { property } from 'lit/decorators.js';
import { RapidElement } from '../RapidElement';
import { getClasses } from '../utils';
import { styleMap } from 'lit-html/directives/style-map.js';

/**
 * This component relies on a bit of sleight of hand magic
 * to achieve it's effect. As such, it requires the use of
 * computed animation times and window.setTimeout().
 */
export class Lightbox extends RapidElement {
  static get styles() {
    return css`
      :host {
        position: absolute;
      }

      .mask {
        display: flex;
        opacity: 0;
        background: rgba(0, 0, 0, 0.5);
        position: absolute;
        height: 100vh;
        width: 100vw;
        pointer-events: none;
      }

      .zoom .mask {
        opacity: 1;
        pointer-events: auto;
      }

      .matte {
        position: absolute;
        transform: translate(400, 400) scale(3, 3);
        border-radius: 2%;
        overflow: hidden;
        box-shadow: 0 0 12px 3px rgba(0, 0, 0, 0.15);
      }
    `;
  }

  @property({ type: Number })
  animationTime = 300;

  @property({ type: Boolean })
  show = false;

  @property({ type: Boolean })
  zoom = false;

  private ele: HTMLElement;
  private left: number;
  private top: number;
  private height: number;
  private width: number;
  private scale = 1;
  private xTrans = '0px';
  private yTrans = '0px';

  protected updated(
    changed: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (changed.has('show') && this.show) {
      console.log('show changed..');
      window.setTimeout(() => {
        this.zoom = true;
      }, 0);
    }

    if (changed.has('zoom') && !this.zoom && this.show) {
      console.log('zoom changed..');
      window.setTimeout(() => {
        this.show = false;
      }, this.animationTime);
    }
  }

  public showElement(ele: HTMLElement) {
    // size our matte according to the ele's boundaries
    const bounds = ele.getBoundingClientRect();
    this.ele = ele.cloneNode() as HTMLElement;
    this.left = bounds.left;
    this.top = bounds.top;
    this.width = bounds.width;
    this.height = bounds.height;

    this.xTrans = '0px';
    this.yTrans = '0px';
    this.scale = 1;

    let desiredWidth = this.width;
    let desiredHeight = this.height;

    // set our destination and size
    if (this.height > this.width) {
      desiredHeight = window.innerHeight * 0.8;
      this.scale = desiredHeight / this.height;
      desiredWidth = this.width * this.scale;
    }
    // landscape
    else {
      desiredWidth = window.innerWidth * 0.8;
      this.scale = desiredWidth / this.width;
      desiredHeight = this.height * this.scale;
    }

    const xGrowth = (desiredWidth - this.width) / 2;
    const xDest = (window.innerWidth - desiredWidth) / 2;
    this.xTrans = xDest - this.left + xGrowth + 'px';

    const yGrowth = (desiredHeight - this.height) / 2;
    const yDest = (window.innerHeight - desiredHeight) / 2;
    this.yTrans = yDest - this.top + yGrowth + 'px';
    this.show = true;
  }

  public handleClick() {
    this.zoom = false;
  }

  public render() {
    const styles = {
      transition: `transform ${this.animationTime}ms ease, box-shadow 0.4s ease`,
    };

    if (this.show) {
      styles['left'] = this.left + 'px';
      styles['top'] = this.top + 'px';
      styles['width'] = this.width + 'px';
      styles['height'] = this.height + 'px';
    }

    if (this.zoom) {
      styles[
        'transform'
      ] = `translate(${this.xTrans}, ${this.yTrans}) scale(${this.scale}, ${this.scale})`;
    }

    return html`
      <div
        class=${getClasses({
          container: true,
          show: this.show,
          zoom: this.zoom,
        })}
        @click=${this.handleClick}
      >
        <div
          class=${getClasses({ mask: true })}
          style="transition: all ${this.animationTime}ms ease;"
        ></div>
        <div class=${getClasses({ matte: true })} style=${styleMap(styles)}>
          ${this.show ? this.ele : null}
        </div>
      </div>
    `;
  }
}
