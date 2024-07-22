export interface ActionSpec {
  uuid: string;
  type: string;
}

interface CategorySpec {
  uuid: string;
  name: string;
  exit_uuid: string;
}

interface ExitSpec {
  uuid: string;
  destination_uuid: string;
}

interface CaseSpec {
  uuid: string;
  type: string;
  arguments: string[];
  category_uuid: string;
}

interface RouterSpec {
  cases: CaseSpec[];
  categeories: CategorySpec[];
  operands: string;
  default_category_uuid: string;
}

export interface NodeSpec {
  uuid: string;
  actions: ActionSpec[];
  exits: ExitSpec[];
  router: RouterSpec;
}

export interface NodeUISpec {
  type: string;
  position: {
    left: number;
    top: number;
  };
}

interface FlowDefinitionSpec {
  nodes: NodeSpec[];
  _ui: {
    nodes: {
      [uuid: string]: NodeUISpec;
    };
  };
}

export interface FlowSpec {
  definition: FlowDefinitionSpec;
  issues: any[];
  metadata: any;
}

export interface NamedObjectSpec {
  uuid: string;
  name: string;
}

export interface GroupSpec extends NamedObjectSpec {
  status: string;
  system: boolean;
  query: string;
  count: number;
}

export interface SendMsgSpec extends ActionSpec {
  text: string;
  quick_replies: string[];
}

export interface SetRunResultSpec extends ActionSpec {
  category: string;
  name: string;
  value: string;
}

export interface SetContactNameSpec extends ActionSpec {
  name: string;
}

export interface CallWebhookSpec extends ActionSpec {
  url: string;
}

export interface AddToGroupSpec extends ActionSpec {
  groups: GroupSpec[];
}
