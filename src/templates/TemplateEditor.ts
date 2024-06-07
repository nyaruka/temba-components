import { property } from 'lit/decorators.js';
import { FormElement } from '../FormElement';
import { TemplateResult, html, css, PropertyValueMap, LitElement } from 'lit';
import { CustomEventType } from '../interfaces';
import { MediaPicker } from '../mediapicker/MediaPicker';

interface Component {
  name: string;
  type: string;
  content: string;
  variables: { [key: string]: number };
  params: [{ type: string }];
}

interface Translation {
  locale: string;
  status: string;
  channel: { uuid: string; name: string };
  components: Component[];
  variables: { type: string }[];
}

interface Template {
  created_on: string;
  modified_on: string;
  name: string;
  translations: Translation[];
  uuid: string;
}

export class TemplateEditor extends FormElement {
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true
  };

  static get styles() {
    return css`
      .component {
        background: #fff;
        border: 1px solid var(--color-widget-border);
        border-radius: var(--curvature);
        padding: 1em;
        margin-top: 1em;
      }

      .content {
        margin-bottom: 1em;
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
        max-height: 50vh;
        overflow-y: auto;
        overflow-x: hidden;
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

  @property({ type: Array })
  variables: string[];

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
    const prev = this.selectedTemplate;
    this.selectedTemplate = (event.target as any).values[0] as Template;
    const [lang, loc] = this.lang.split('-');
    if (this.selectedTemplate) {
      this.selectedTemplate.translations.forEach((translation) => {
        if (
          translation.locale === this.lang ||
          (!loc && translation.locale.split('-')[0] === lang)
        ) {
          this.translation = translation;
          // initialize our variables array
          const newVariables = new Array(
            (translation.variables || []).length
          ).fill('');

          if (!prev) {
            // copy our previous variables into newVariables
            if (this.variables) {
              this.variables.forEach((variable, index) => {
                newVariables[index] = variable;
              });
            }
          }
          this.variables = newVariables;
        }
      });
    } else {
      this.translation = null;
    }

    this.fireCustomEvent(CustomEventType.ContextChanged, {
      template: this.selectedTemplate,
      translation: this.translation,
      variables: this.variables
    });
  }

  private handleAttachmentsChanged(event: CustomEvent) {
    const media = event.target as MediaPicker;
    const index = parseInt(media.getAttribute('index'));

    if (media.attachments.length === 0) {
      this.variables[index] = '';
    } else {
      const attachment = media.attachments[0];
      if (attachment.url && attachment.content_type) {
        this.variables[index] = `${attachment.content_type}:${attachment.url}`;
      } else {
        this.variables[index] = ``;
      }
    }
    this.fireContentChange();
  }

  private handleVariableChanged(event: CustomEvent) {
    const target = event.target as HTMLInputElement;
    const variableIndex = parseInt(target.getAttribute('index'));
    this.variables[variableIndex] = target.value;
    this.fireContentChange();
  }

  private fireContentChange() {
    this.fireCustomEvent(CustomEventType.ContentChanged, {
      template: this.selectedTemplate,
      translation: this.translation,
      variables: this.variables
    });
  }

  private renderVariables(component: Component) {
    // create a regex match based on the variable names
    const variableRegex = new RegExp(
      `{{(${Object.keys(component.variables || []).join('|')})}}`,
      'g'
    );

    let variables = null;
    const parts = component.content?.split(variableRegex) || [];
    if (parts.length > 0) {
      variables = parts.map((part, index) => {
        if (index % 2 === 0) {
          return html`<span class="text">${part}</span>`;
        }
        const variableIndex = component.variables[part];
        return html`<temba-completion
          class="variable"
          type="text"
          value=${variableIndex < this.variables.length
            ? this.variables[variableIndex]
            : null}
          @keyup=${this.handleVariableChanged}
          name="${component.name}"
          index="${variableIndex}"
          placeholder="{{${part}}}"
        ></temba-completion>`;
      });
    } else {
      // no content, let's do params intead
      variables = component.params.map((param) => {
        if (
          param.type === 'image' ||
          param.type === 'document' ||
          param.type === 'audio' ||
          param.type === 'video'
        ) {
          const index = Object.values(component.variables)[0];
          let attachments = [];
          if (this.variables[index]) {
            const parts = this.variables[index].split(':');
            attachments = [{ url: parts[1], content_type: parts[0] }];
          }

          return html`<div
            style="
              display: flex; 
              align-items: center; 
              border-radius: var(--curvature);
              ${attachments.length === 0
              ? `background-color:rgba(255,0,0,.07);`
              : ``}
            "
          >
            <temba-media-picker
              accept="${param.type === 'document'
                ? 'application/pdf'
                : param.type + '/*'}"
              max="1"
              index=${index}
              icon="attachment_${param.type}"
              attachments=${JSON.stringify(attachments)}
              @change=${this.handleAttachmentsChanged.bind(this)}
            ></temba-media-picker>
            <div>
              ${attachments.length == 0
                ? html`Attach ${param.type} to continue`
                : ''}
            </div>
          </div>`;
        }
      });
    }

    return html`<div class="content">${variables}</div> `;
  }

  public renderComponents(components: Component[]): TemplateResult {
    const nonButtons = components
      .filter((comp) => !comp.type.startsWith('button/'))
      .map(
        (component) =>
          html`<div class="${component['name']}">
            ${this.renderVariables(component)}
          </div>`
      );
    const buttonComponents = components.filter((comp) =>
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
    const buttons = components.map((component) => {
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
          shouldExclude=${(template) => template.status !== 'approved'}
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
