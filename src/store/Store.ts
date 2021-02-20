import { customElement, LitElement, property } from "lit-element";
import { CompletionSchema, KeyedAssets } from "../completion/helpers";
import { AxiosResponse } from "axios";
import { getUrl, getAssets, Asset } from "../utils";
import { CompletionOption } from "../completion/Completion";
import { ContactField } from "./interfaces";

@customElement("temba-store")
export default class Store extends LitElement {
  @property({ type: String, attribute: "completions" })
  completionsEndpoint: string;

  @property({ type: String, attribute: "functions" })
  functionsEndpoint: string;

  @property({ type: String, attribute: "fields" })
  fieldsEndpoint: string;

  @property({ type: String, attribute: "groups" })
  groupsEndpoint: string;

  @property({ type: String, attribute: "globals" })
  globalsEndpoint: string;

  @property({ type: Object, attribute: false })
  private schema: CompletionSchema;

  @property({ type: Object, attribute: false })
  private fnOptions: CompletionOption[];

  @property({ type: Object, attribute: false })
  private keyedAssets: KeyedAssets = {};

  private fields: { [key: string]: ContactField } = {};

  public firstUpdated(changedProperties: Map<string, any>) {
    if (this.completionsEndpoint) {
      getUrl(this.completionsEndpoint).then((response) => {
        this.schema = response.data as CompletionSchema;
      });
    }

    if (this.functionsEndpoint) {
      getUrl(this.functionsEndpoint).then((response: AxiosResponse) => {
        this.fnOptions = response.data as CompletionOption[];
      });
    }

    if (this.fieldsEndpoint) {
      getAssets(this.fieldsEndpoint).then((assets: Asset[]) => {
        this.keyedAssets["fields"] = [];
        assets.forEach((field: ContactField) => {
          this.keyedAssets["fields"].push(field.key);
          this.fields[field.key] = field;
        });
      });
    }

    if (this.globalsEndpoint) {
      getAssets(this.globalsEndpoint).then((assets: Asset[]) => {
        this.keyedAssets["globals"] = assets.map((asset: Asset) => asset.key);
      });
    }
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
}
