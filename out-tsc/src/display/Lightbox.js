import { __decorate } from "tslib";
import { css, html } from 'lit';
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
    constructor() {
        super(...arguments);
        this.animationTime = 300;
        this.show = false;
        this.zoom = false;
        this.zoomPct = 0.9;
        this.scale = 1;
        this.xTrans = 0;
        this.yTrans = 0;
    }
    static get styles() {
        return css `
      :host {
        z-index: 10000;
        position: absolute;
        top: 0;
        left: 0;
      }

      .mask {
        display: flex;
        opacity: 0;
        background: rgba(0, 0, 0, 0.5);
        position: absolute;
        height: 100svh;
        width: 100svw;
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

      .download {
        background: rgba(0, 0, 0, 0.5);
        position: absolute;
        display:flex;
        align-items:center;
        color:#fff;
        padding:0.5em;
        border-radius:var(--curvature);
        background:rgba(0,0,0,0.5);
      }

  }
    `;
    }
    updated(changed) {
        if (changed.has('show') && this.show) {
            window.setTimeout(() => {
                this.zoom = true;
            }, 0);
        }
        if (changed.has('zoom') && !this.zoom && this.show) {
            window.setTimeout(() => {
                this.show = false;
            }, this.animationTime);
        }
    }
    showElement(ele) {
        // size our matte according to the ele's boundaries
        const bounds = ele.getBoundingClientRect();
        this.ele = ele.cloneNode();
        this.ele.zoom = true;
        this.left = bounds.left;
        this.top = bounds.top;
        this.width = bounds.width;
        this.height = bounds.height;
        this.xTrans = 0;
        this.yTrans = 0;
        this.scale = 1;
        let desiredWidth = this.width;
        let desiredHeight = this.height;
        let desiredScale = this.scale;
        const maxHeight = window.innerHeight * this.zoomPct;
        const maxWidth = window.innerWidth * this.zoomPct;
        // if the width fits, constrain by height
        if (this.width * (maxHeight / this.height) < maxWidth) {
            desiredHeight = window.innerHeight * this.zoomPct;
            desiredScale = desiredHeight / this.height;
            desiredWidth = this.width * desiredScale;
        }
        else {
            desiredWidth = window.innerWidth * this.zoomPct;
            desiredScale = desiredWidth / this.width;
            desiredHeight = this.height * desiredScale;
        }
        const xGrowth = (desiredWidth - this.width) / 2;
        const xDest = (window.innerWidth - desiredWidth) / 2;
        this.xTrans = xDest - this.left + xGrowth;
        const yGrowth = (desiredHeight - this.height) / 2;
        const yDest = (window.innerHeight - desiredHeight) / 2;
        this.yTrans = yDest - this.top + yGrowth;
        this.scale = desiredScale;
        this.show = true;
    }
    handleClick() {
        this.zoom = false;
    }
    render() {
        const styles = {
            transition: `transform ${this.animationTime}ms ease, box-shadow ${this.animationTime}ms ease`
        };
        if (this.show) {
            styles['left'] = this.left + 'px';
            styles['top'] = this.top + 'px';
            styles['width'] = this.width + 'px';
        }
        if (this.zoom) {
            styles['transform'] = `translate(${this.xTrans}px, ${this.yTrans}px) scale(${this.scale}, ${this.scale})`;
        }
        return html `
      <div
        class=${getClasses({
            container: true,
            show: this.show,
            zoom: this.zoom
        })}
        @click=${this.handleClick}
      >
        <div
          class=${getClasses({ mask: true })}
          style="transition: all ${this.animationTime}ms; ease"
        ></div>
        <div class=${getClasses({ matte: true })} style=${styleMap(styles)}>
          ${this.show ? html `${this.ele}` : null}
        </div>
      </div>
    `;
    }
}
__decorate([
    property({ type: Number })
], Lightbox.prototype, "animationTime", void 0);
__decorate([
    property({ type: Boolean })
], Lightbox.prototype, "show", void 0);
__decorate([
    property({ type: Boolean })
], Lightbox.prototype, "zoom", void 0);
__decorate([
    property({ type: Number })
], Lightbox.prototype, "zoomPct", void 0);
//# sourceMappingURL=Lightbox.js.map