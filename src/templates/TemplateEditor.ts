import { property } from 'lit/decorators.js';
import { FormElement } from '../FormElement';
import { TemplateResult, html, css, PropertyValueMap } from 'lit';
import { CustomEventType } from '../interfaces';

interface Component {
  name: string;
  type: string;
  content: string;
  params: { type: string }[];
}

interface Translation {
  locale: string;
  status: string;
  channel: { uuid: string; name: string };
  components: Component[];
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
        flex-direction: row;
        align-items: center;
        margin-right: 0.5em;
        margin-top: 0.5em;
        align-items: center;
      }

      .button .display {
        margin-right: 0.5em;
        background: #f9f9f9;
        padding: 0.25em 1em;
        border-radius: var(--curvature);
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
          for (const comp of translation.components) {
            const compParams = comp.params || [];
            if (compParams.length > 0) {
              // create an array for the length of params
              newParams[comp.name] = new Array(compParams.length).fill('');
            }
          }

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
    const index = parseInt(target.getAttribute('index'));
    this.params[target.name][index - 1] = target.value;
    this.fireCustomEvent(CustomEventType.ContentChanged, {
      template: this.selectedTemplate,
      translation: this.translation,
      params: this.params,
    });
  }

  private renderVariables(component: Component) {
    const parts = component.content.split(/{{(\d+)}}/g);
    if (parts.length > 0) {
      const variables = parts.map((part, index) => {
        const paramIndex = Math.round(index / 2);
        if (index % 2 === 0) {
          return html`<span class="text">${part}</span>`;
        }
        return html`<temba-completion
          class="variable"
          type="text"
          value=${this.params[component.name][paramIndex - 1]}
          @change=${this.handleVariableChanged}
          name="${component.name}"
          index="${paramIndex}"
          placeholder="variable.."
        ></temba-completion>`;
      });
      return html`<div class="content">${variables}</div>`;
    }
  }

  public renderComponents(components: Component[]): TemplateResult {
    const nonButtons = components
      .filter(comp => !comp.type.startsWith('button/'))
      .map(
        component =>
          html`<div class="${component['name']}">
            ${this.renderVariables(component)}
          </div>`
      );
    const buttonComponents = components.filter(comp =>
      comp.type.startsWith('button/')
    );
    const buttons =
      buttonComponents.length > 0 ? this.renderButtons(buttonComponents) : null;
    return html`<div class="main">${nonButtons}</div>
      <div class="buttons">
        ${buttons}
        <div></div>
      </div>`;
  }

  public renderButtons(components): TemplateResult {
    const buttons = components.map(component => {
      if (component.display) {
        return html`
          <div class="button">
            <div class="display">${component.display}</div>
            ${this.renderVariables(component)}
          </div>
        `;
      } else {
        return html`
          <div class="button">${this.renderVariables(component)}</div>
        `;
      }
    });
    return html`<div class="button-wrapper">
      <div class="button-header">Template Buttons</div>
      <div class="buttons">${buttons}</div>
    </div>`;
  }

  public render(): TemplateResult {
    let content = null;
    if (this.translation) {
      content = this.renderComponents(this.translation.components);
    } else {
      content = html`<div class="error-message">
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
          endpoint="${this.url}?comps_as_list=true"
          shouldExclude=${template => template.status !== 'approved'}
          placeholder="Select a template"
          @temba-content-changed=${this.swallowEvent}
          @change=${this.handleTemplateChanged}
        >
        </temba-select>

        ${this.template ? html` <div class="template">${content}</div>` : null}
      </div>
    `;
  }
}
