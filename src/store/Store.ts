import { LitElement } from 'lit';
import { property } from 'lit/decorators';
import { getUrl, getAssets, Asset, WebResponse } from '../utils';
import {
  ContactField,
  ContactGroup,
  CompletionOption,
  CompletionSchema,
  KeyedAssets,
} from '../interfaces';

export class Store extends LitElement {
  @property({ type: String, attribute: 'completion' })
  completionEndpoint: string;

  @property({ type: String, attribute: 'fields' })
  fieldsEndpoint: string;

  @property({ type: String, attribute: 'groups' })
  groupsEndpoint: string;

  @property({ type: String, attribute: 'globals' })
  globalsEndpoint: string;

  @property({ type: Object, attribute: false })
  private schema: CompletionSchema;

  @property({ type: Object, attribute: false })
  private fnOptions: CompletionOption[];

  @property({ type: Object, attribute: false })
  private keyedAssets: KeyedAssets = {};

  private fields: { [key: string]: ContactField } = {};
  private groups: { [uuid: string]: ContactGroup } = {};

  // http promise to monitor for completeness
  public httpComplete: Promise<void | WebResponse[]>;

  public firstUpdated() {
    const fetches = [];
    if (this.completionEndpoint) {
      fetches.push(
        getUrl(this.completionEndpoint).then(response => {
          this.schema = response.json['context'] as CompletionSchema;
          this.fnOptions = response.json['functions'] as CompletionOption[];
        })
      );
    }

    if (this.fieldsEndpoint) {
      fetches.push(
        getAssets(this.fieldsEndpoint).then((assets: Asset[]) => {
          this.keyedAssets['fields'] = [];
          assets.forEach((field: ContactField) => {
            this.keyedAssets['fields'].push(field.key);
            this.fields[field.key] = field;
          });
        })
      );
    }

    if (this.globalsEndpoint) {
      fetches.push(
        getAssets(this.globalsEndpoint).then((assets: Asset[]) => {
          this.keyedAssets['globals'] = assets.map((asset: Asset) => asset.key);
        })
      );
    }

    if (this.groupsEndpoint) {
      fetches.push(
        getAssets(this.groupsEndpoint).then((groups: any[]) => {
          groups.forEach((group: any) => {
            this.groups[group.uuid] = group;
          });
        })
      );
    }

    this.httpComplete = Promise.all(fetches);
  }

  public setKeyedAssets(name: string, values: string[]): void {
    this.keyedAssets[name] = values;
  }

  public updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
  }

  public getCompletionSchema(): CompletionSchema {
    return this.schema;
  }

  public getFunctions(): CompletionOption[] {
    return this.fnOptions;
  }

  public getKeyedAssets(): KeyedAssets {
    return this.keyedAssets;
  }

  public getContactField(key: string): ContactField {
    return this.fields[key];
  }

  public isDynamicGroup(uuid: string): boolean {
    const group = this.groups[uuid];
    if (group && group.query) {
      return true;
    }
    return false;
  }
}
