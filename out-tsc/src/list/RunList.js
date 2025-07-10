import { __decorate } from "tslib";
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { capitalize } from '../utils';
import { Icon } from '../Icons';
import { TembaList } from './TembaList';
const FLOW_COLOR = 'rgb(223, 65, 159)';
export class RunList extends TembaList {
    static get styles() {
        return css `
      :host {
        overflow-y: auto !important;
        --contact-name-font-size: 1em;
      }

      @media only screen and (max-height: 768px) {
        temba-options {
          max-height: 20vh;
        }
      }

      temba-options {
        display: block;
        width: 100%;
        flex-grow: 1;
      }
    `;
    }
    firstUpdated(changedProperties) {
        super.firstUpdated(changedProperties);
    }
    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('responses') || changedProperties.has('flow')) {
            if (this.flow) {
                this.endpoint = `/api/v2/runs.json?flow=${this.flow}${this.responses ? '&responded=1' : ''}`;
            }
        }
        if (changedProperties.has('resultPreview')) {
            this.createRenderOption();
        }
        if (changedProperties.has('results')) {
            if (this.results) {
                const select = this.shadowRoot.querySelector('temba-select');
                select.setOptions(this.results);
                this.resultKeys = this.results.reduce((current, result) => ({ ...current, [result.key]: result }), {});
            }
        }
    }
    renderResultPreview(run) {
        if (this.resultPreview) {
            const runResult = run.values[this.resultPreview.key];
            if (runResult) {
                if (this.resultPreview.categories.length > 1) {
                    if (runResult.category) {
                        return runResult.category;
                    }
                }
                else {
                    return runResult.value;
                }
            }
        }
        return null;
    }
    removeRun(id) {
        this.items = this.items.filter((run) => run.id !== id);
        this.cursorIndex = Math.min(this.cursorIndex, this.items.length);
        this.requestUpdate('cursorIndex');
    }
    getIcon(run) {
        let icon = null;
        if (run.exit_type == 'completed') {
            icon = html `<temba-icon
        name="check"
        style="--icon-color:#666;margin-left:0.5em"
      />`;
        }
        else if (run.exit_type == 'interrupted') {
            icon = html `<temba-icon
        name="x-octagon"
        style="--icon-color:${FLOW_COLOR};margin-left:0.5em"
      />`;
        }
        else if (run.exit_type == 'expired') {
            icon = html `<temba-icon
        name="clock"
        style="--icon-color:${FLOW_COLOR};margin-left:0.5em"
      />`;
        }
        else if (!run.exit_type) {
            if (run.responded) {
                icon = html `<temba-icon
          name="activity"
          style="--icon-color:var(--color-primary-dark);margin-left:0.5em"
        />`;
            }
            else {
                icon = html `<temba-icon
          name="hourglass"
          style="--icon-color:var(--color-primary-dark);margin-left:0.5em"
        />`;
            }
        }
        return icon;
    }
    createRenderOption() {
        this.renderOption = (run) => {
            var _a, _b, _c;
            let statusStyle = '';
            if (!run.exited_on) {
                statusStyle = 'font-weight:400;';
            }
            if (!run.responded) {
                statusStyle += '';
            }
            return html `
        <div class="row" style="${statusStyle}display:flex;align-items:center">
          <div
            style="width:16em;white-space:nowrap;overflow: hidden; text-overflow: ellipsis;"
          >
            <temba-contact-name
              name=${((_a = run.contact) === null || _a === void 0 ? void 0 : _a.name) || ((_b = run.contact) === null || _b === void 0 ? void 0 : _b.anon_display) || ''}
              urn=${((_c = run.contact) === null || _c === void 0 ? void 0 : _c.urn) || ''}
              icon-size="15"
            />
          </div>

          <div
            style="margin: 0em 1em;flex:1;white-space:nowrap; overflow:hidden; text-overflow: ellipsis;"
          >
            ${this.renderResultPreview(run)}
          </div>

          <div style="flex-shrink:1">
            <temba-date value="${run.modified_on}" display="duration" />
          </div>
          ${this.getIcon(run)}
        </div>
      `;
        };
    }
    getRefreshEndpoint() {
        if (this.items.length > 0) {
            const modifiedOn = this.items[0].modified_on;
            return this.endpoint + '&after=' + modifiedOn;
        }
        return this.endpoint;
    }
    toggleResponded() {
        this.responses = this.shadowRoot.querySelector('#responded').checked;
    }
    handleColumnChanged(event) {
        if (event.target.values.length > 0) {
            this.resultPreview = event.target.values[0];
        }
        else {
            this.resultPreview = null;
        }
    }
    handleSelected(selected) {
        this.selectedRun = selected;
    }
    getListStyle() {
        return '';
    }
    renderHeader() {
        return html `
      <div style="display:flex;width:100%;margin-bottom: 1em;">
        <div style="flex-grow:1">
          ${this.results
            ? html `
                <temba-select
                  clearable
                  placeholder="Result Preview"
                  valueKey="key"
                  @change=${this.handleColumnChanged}
                  style="z-index: 10;"
                ></temba-select>
              `
            : null}
        </div>
        <div style="margin-left:1em;">
          <temba-checkbox
            id="responded"
            label="Responses Only"
            checked="true"
            @click=${this.toggleResponded}
          />
        </div>
      </div>
      <div
        style="
        font-size:0.8em;
        color:rgba(0,0,0,.4);
        text-align:right;
        background:#f9f9f9;
        border: 1px solid var(--color-widget-border);
        margin-bottom:-0.5em; 
        padding-bottom: 0.6em;
        padding-top: 0.3em;
        padding-right: 4.5em;
        border-top-right-radius: var(--curvature);
        border-top-left-radius: var(--curvature)
    "
      >
        Last Updated
      </div>
    `;
    }
    renderFooter() {
        var _a, _b, _c, _d;
        if (!this.selectedRun || !this.resultKeys) {
            return null;
        }
        const resultKeys = Object.keys(this.selectedRun.values || {});
        return html ` <div
      style="margin-top: 1.5em; margin-bottom:0.5em;flex-grow:1;border-radius:var(--curvature); border: 1px solid var(--color-widget-border);"
    >
      <div style="display:flex;flex-direction:column;">
        <div
          style="font-size:1.5em;background:#f9f9f9;padding:.75em;padding-top:.35em;display:flex;align-items:center;border-top-right-radius:var(--curvature);border-top-left-radius:var(--curvature)"
        >
          <div>
            <temba-contact-name
              style="cursor:pointer"
              name=${((_a = this.selectedRun.contact) === null || _a === void 0 ? void 0 : _a.name) ||
            ((_b = this.selectedRun.contact) === null || _b === void 0 ? void 0 : _b.anon_display) ||
            ''}
              urn=${((_c = this.selectedRun.contact) === null || _c === void 0 ? void 0 : _c.urn) || ''}
              onclick="goto(event, this)"
              href="/contact/read/${((_d = this.selectedRun.contact) === null || _d === void 0 ? void 0 : _d.uuid) || ''}/"
            ></temba-contact-name>
            <div
              style="display:flex;margin-left:-0.2em;margin-top:0.25em;font-size: 0.65em"
            >
              ${this.selectedRun.exit_type
            ? html `
                    <div style="margin-left:2em;flex-grow:1;display:flex">
                      ${this.getIcon(this.selectedRun)}
                      <div style="margin-left:0.5em">
                        ${capitalize(this.selectedRun.exit_type)}&nbsp;
                      </div>
                      <temba-date
                        value="${this.selectedRun.exited_on}"
                        compare="${this.selectedRun.created_on}"
                        display="duration"
                      />
                    </div>
                  `
            : html `${this.getIcon(this.selectedRun)}
                    <div style="margin-left:1.5em;flex-grow:1;display:flex">
                      <div>Started&nbsp;</div>
                      <temba-date
                        value="${this.selectedRun.created_on}"
                        display="duration"
                      ></temba-date>
                    </div>`}
            </div>
          </div>
          <div style="flex-grow:1"></div>
          <div style="display:flex;flex-direction: column">
            <div style="font-size:0.75em">
              ${this.selectedRun.created_on
            ? new Date(this.selectedRun.created_on).toLocaleString()
            : ''}
            </div>
            <div
              style="font-size:0.6em;align-self:flex-end;color:#888;line-height:0.75em"
            >
              Started
            </div>
          </div>
          ${this.allowDelete
            ? html ` <temba-icon
                clickable
                style="margin-left:0.75em;"
                name=${Icon.delete}
                onclick="deleteRun(${this.selectedRun.id});"
              ></temba-icon>`
            : null}
        </div>

        ${resultKeys.length > 0
            ? html `
              <div style="padding:1em;">
                <div
                  style="display:flex;font-size:1.2em;position:relative;right:0px"
                >
                  <div style="flex-grow:1"></div>
                </div>

                <table width="100%">
                  <tr>
                    <th style="text-align:left" width="25%">Result</th>
                    <th style="text-align:left" width="25%">Category</th>
                    <th style="text-align:left">Value</th>
                  </tr>

                  ${Object.keys(this.selectedRun.values).map((key) => {
                const result = this.selectedRun.values[key];
                const meta = this.resultKeys[key];
                // if our result is no longer represented in the flow, skip it
                if (meta) {
                    return html `<tr>
                        <td>${result.name}</td>
                        <td>
                          ${meta.categories.length > 1 ? result.category : '--'}
                        </td>
                        <td>${result.value}</td>
                      </tr>`;
                }
                return null;
            })}
                </table>
              </div>
            `
            : null}
      </div>
    </div>`;
    }
    constructor() {
        super();
        this.responses = true;
        this.allowDelete = false;
        this.resultKeys = {};
        this.reverseRefresh = false;
        this.valueKey = 'uuid';
        this.hideShadow = true;
        this.createRenderOption();
    }
}
__decorate([
    property({ type: String })
], RunList.prototype, "flow", void 0);
__decorate([
    property({ type: Object, attribute: false })
], RunList.prototype, "results", void 0);
__decorate([
    property({ type: Boolean })
], RunList.prototype, "responses", void 0);
__decorate([
    property({ type: Object })
], RunList.prototype, "resultPreview", void 0);
__decorate([
    property({ type: Object })
], RunList.prototype, "selectedRun", void 0);
__decorate([
    property({ type: Boolean })
], RunList.prototype, "allowDelete", void 0);
//# sourceMappingURL=RunList.js.map