import { property } from 'lit/decorators.js';
import { FormElement } from '../FormElement';
import { TemplateResult, html, css, PropertyValueMap } from 'lit';
import { CustomEventType } from '../interfaces';

const KEY_HEADER = 'header';
const KEY_BODY = 'body';
const KEY_FOOTER = 'footer';
const KEY_BUTTONS = 'button';

interface Component {
  content: string;
  params: { type: string }[];
}

interface Translation {
  locale: string;
  status: string;
  channel: { uuid: string; name: string };
  components: { [key: string]: Component };
}

interface Template {
  created_on: string;
  modified_on: string;
  name: string;
  translations: Translation[];
  uuid: string;
}

export class TemplateEditor extends FormElement {
  static get styles() {
    return css`
      .component {
        background: #fff;
        border: 1px solid var(--color-widget-border);
        border-radius: var(--curvature);
        padding: 1em;
        margin-top: 1em;
      }
      .picker {
        margin-bottom: 0.5em;
        display: block;
      }
      .param {
        display: flex;
        margin-bottom: 0.5em;
        align-items: center;
      }
      label {
        margin-right: 0.5em;
      }

      .content span {
        margin-right: 0.25em;
      }

      .error-message {
        padding-left: 0.5em;
      }

      .variable {
        display: inline-block;
        margin: 0.25em 0em;
        margin-right: 0.25em;
      }

      .button-wrapper {
        margin-top: 1em;
        background: #f9f9f9;
        border-radius: var(--curvature);
        padding: 0.5em;
        display: flex;
        flex-direction: column;
      }

      .button-header {
        font-weight: normal;
        margin-left: 0.25em;
        margin-bottom: -0.5em;
        font-size: 0.9em;
        color: #777;
      }

      .buttons {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
      }

      .button {
        background: #fff;
        padding: 0.3em 1em;
        border: 1px solid #e6e6e6;
        border-radius: var(--curvature);
        min-height: 23px;
        display: flex;
        align-items: center;
        margin-right: 0.5em;
        margin-top: 0.5em;
      }

      temba-textinput,
      temba-completion {
        --temba-textinput-padding: 5px 5px;
        --temba-textinput-font-size: 0.9em;
        line-height: initial;
      }

      .template {
        background: #fff;
        border-radius: var(--curvature);
        border: 1px solid var(--color-widget-border);
        padding: 1em;
        line-height: 2.2em;
      }
    `;
  }

  @property({ type: String })
  url: string;

  // initial template uuid
  @property({ type: String })
  template: string;

  @property({ type: Object })
  selectedTemplate: Template;

  @property({ type: String })
  lang = 'eng-US';

  // component key to array of strings for variables
  @property({ type: Object })
  params: { [key: string]: string[] };

  @property({ type: Object, attribute: false })
  translation: Translation;

  @property({ type: Boolean })
  translating: boolean;

  buttonKeys = [];
  contentKeys = [];
  otherKeys = [];

  public firstUpdated(
    changes: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(changes);
  }

  public updated(changedProperties: Map<string, any>): void {
    super.updated(changedProperties);
  }

  private handleTemplateChanged(event: CustomEvent) {
    this.selectedTemplate = (event.target as any).values[0] as Template;
    const [lang, loc] = this.lang.split('-');

    const newParams = {};
    if (this.selectedTemplate) {
      this.selectedTemplate.translations.forEach(translation => {
        if (
          translation.locale === this.lang ||
          (!loc && translation.locale.split('-')[0] === lang)
        ) {
          this.translation = translation;
          this.buttonKeys = [];
          this.contentKeys = [];
          this.otherKeys = [];
          const keys = Object.keys(translation.components);
          for (const key of keys) {
            if (key.startsWith(KEY_BUTTONS)) {
              this.buttonKeys.push(key);
            } else if (
              key === KEY_HEADER ||
              key === KEY_BODY ||
              key === KEY_FOOTER
            ) {
              this.contentKeys.push(key);
            } else {
              this.otherKeys.push(key);
            }

            const compParams = translation.components[key].params || [];
            if (compParams.length > 0) {
              // create an array for the length of params
              newParams[key] = new Array(compParams.length).fill('');
            }
          }
          this.buttonKeys.sort();

          // if we are looking at the same template copy our params on top
          if (this.template === this.selectedTemplate.uuid) {
            for (const key of Object.keys(this.params || {})) {
              if (newParams[key]) {
                for (let i = 0; i < this.params[key].length; i++) {
                  newParams[key][i] = this.params[key][i];
                }
              }
            }
          }
        }
      });
    } else {
      this.translation = null;
    }

    this.params = newParams;
    this.fireCustomEvent(CustomEventType.ContextChanged, {
      template: this.selectedTemplate,
      translation: this.translation,
      params: this.params,
    });
  }

  private handleVariableChanged(event: CustomEvent) {
    const target = event.target as HTMLInputElement;
    const key = target.getAttribute('key');
    const index = parseInt(target.getAttribute('index'));
    this.params[key][index - 1] = target.value;
    this.fireCustomEvent(CustomEventType.ContentChanged, {
      template: this.selectedTemplate,
      translation: this.translation,
      params: this.params,
    });
  }

  private renderVariables(key: string, component: Component) {
    const parts = component.content.split(/{{(\d+)}}/g);
    if (parts.length > 0) {
      const variables = parts.map((part, index) => {
        const keyIndex = Math.round(index / 2);
        if (index % 2 === 0) {
          return html`<span class="text">${part}</span>`;
        }
        return html`<temba-completion
          class="variable"
          type="text"
          value=${this.params[key][keyIndex - 1]}
          @change=${this.handleVariableChanged}
          key="${key}"
          index="${keyIndex}}"
          placeholder="variable.."
        ></temba-completion>`;
      });
      return html`<div class="content">${variables}</div>`;
    }
  }

  private renderComponent(key: string, component: Component) {
    return html` <div class="component">
      <div>${key}</div>
      ${this.renderVariables(key, component)}
    </div>`;
  }

  public renderContent(components: {
    [key: string]: Component;
  }): TemplateResult {
    let header = null;
    let body = null;
    let footer = null;

    if (components[KEY_HEADER]) {
      header = html`<div class="header">
        ${this.renderVariables(KEY_HEADER, components[KEY_HEADER])}
      </div>`;
    }

    if (components[KEY_BODY]) {
      body = html`<div class="body">
        ${this.renderVariables(KEY_BODY, components[KEY_BODY])}
      </div>`;
    }

    if (components[KEY_FOOTER]) {
      footer = html`<div class="footer">
        ${this.renderVariables(KEY_FOOTER, components[KEY_FOOTER])}
      </div>`;
    }

    if (header || body || footer) {
      return html`<div class="content">${header}${body}${footer}</div>`;
    }
    return null;
  }

  public renderButtons(components): TemplateResult {
    if (this.buttonKeys.length > 0) {
      const buttons = this.buttonKeys.map(key => {
        const component = components[key];
        return html`<div class="button">
          ${this.renderVariables(key, component)}
        </div>`;
      });
      return html`<div class="button-wrapper">
        <div class="button-header">Template Buttons</div>
        <div class="buttons">${buttons}</div>
      </div>`;
    }
    return null;
  }
  public render(): TemplateResult {
    let content = null;
    let buttons = null;
    let otherComponents = null;
    if (this.translation) {
      content = this.renderContent(this.translation.components);
      buttons = this.renderButtons(this.translation.components);
      otherComponents = this.otherKeys.map(key => {
        const component = this.translation.components[key];
        return this.renderComponent(key, component);
      });
    } else {
      otherComponents = html`<div class="error-message">
        No approved translation was found for current language.
      </div>`;
    }

    return html`
      <div>
        <temba-select
          searchable
          ?clearable=${!this.translating}
          ?disabled=${this.translating}
          valuekey="uuid"
          class="picker"
          value="${this.template}"
          endpoint=${this.url}
          shouldExclude=${template => template.status !== 'approved'}
          placeholder="Select a template"
          @temba-content-changed=${this.swallowEvent}
          @change=${this.handleTemplateChanged}
        >
        </temba-select>

        ${this.template
          ? html` <div class="template">
              ${content} ${buttons} ${otherComponents}
            </div>`
          : null}
      </div>
    `;
  }
}
