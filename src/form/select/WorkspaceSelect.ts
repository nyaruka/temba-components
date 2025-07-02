import { css, CSSResultArray, html, TemplateResult } from 'lit';
import { Select, SelectOption } from './Select';
import { property } from 'lit/decorators.js';
import { getScrollParent } from '../../utils';

export interface WorkspaceOption extends SelectOption {
  name: string;
  id: string;
  type: string;
}

export class WorkspaceSelect extends Select<WorkspaceOption> {
  static get styles(): CSSResultArray {
    return [
      super.styles,
      css`
        :host {
          border: 0px solid blue;
        }
      `
    ];
  }

  @property({ type: String })
  endpoint = '/api/internal/orgs.json';

  @property({ type: String })
  nameKey = 'name';

  @property({ type: String })
  valueKey = 'id';

  @property({ type: String })
  placeholder: string = 'Choose Workspace';

  @property({ type: Boolean })
  sorted: boolean = true;

  @property({ type: Object })
  workspace: WorkspaceOption;

  constructor() {
    super();
    this.shouldExclude = (option: WorkspaceOption) => {
      const selected = this.values[0];
      return option.id === selected?.id;
    };

    this.searchable = true;
  }

  public firstUpdated(changed: Map<string, any>) {
    super.firstUpdated(changed);
    this.allowAnchor = !!getScrollParent(this);
  }

  public prepareOptionsDefault(options: WorkspaceOption[]): WorkspaceOption[] {
    options.forEach((option) => {
      option.type = 'workspace';
    });
    return options;
  }

  public renderOptionDefault(option: WorkspaceOption): TemplateResult {
    if (!option) {
      return html``;
    }

    return html`<temba-user name=${option.name} showname></temba-user>`;
  }
}
