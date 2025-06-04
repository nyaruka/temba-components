import { createStore, StoreApi } from 'zustand/vanilla';
import { fetchResults } from '../utils';
import { FlowDefinition, FlowPosition } from './flow-definition';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { property } from 'lit/decorators.js';

export const FLOW_SPEC_VERSION = '14.3';
const CANVAS_PADDING = 800;

export interface InfoResult {
  key: string;
  name: string;
  categories: string[];
  node_uuids: string[];
}

export interface ObjectRef {
  uuid: string;
  name: string;
}

export interface TypedObjectRef extends ObjectRef {
  type: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface FlowInfo {
  results: InfoResult[];
  dependencies: TypedObjectRef[];
  counts: { nodes: number; languages: number };
  locals: string[];
}

export interface FlowContents {
  definition: FlowDefinition;
  info: FlowInfo;
}

export interface Workspace {
  anon: boolean;
  country: string;
  date_style: string;
  languages: string[];
  name: string;
  primary_language: string;
  timezone: string;
  uuid: string;
}

export interface CanvasPositions {
  [uuid: string]: FlowPosition;
}

export interface AppState {
  flowDefinition: FlowDefinition;
  flowInfo: FlowInfo;

  languageCode: string;
  languageNames: { [code: string]: Language };
  workspace: Workspace;
  isTranslating: boolean;

  canvasSize: { width: number; height: number };

  fetchRevision: (endpoint: string, id?: string) => void;
  fetchWorkspace: (endpoint: string) => Promise<void>;
  fetchAllLanguages: (endpoint: string) => Promise<void>;

  getFlowResults: () => InfoResult[];
  getResultByKey(id: any): InfoResult;

  setFlowContents: (flow: FlowContents) => void;
  setFlowInfo: (info: FlowInfo) => void;
  setLanguageCode: (languageCode: string) => void;
  setTestUpdate: () => void;
  expandCanvas: (width: number, height: number) => void;

  updateCanvasPositions: (positions: CanvasPositions) => void;
  removeNodes: (uuids: string[]) => void;
}

export const zustand = createStore<AppState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      languageNames: {},
      canvasSize: { width: 0, height: 0 },
      languageCode: '',
      workspace: null,
      flowDefinition: null,
      flowInfo: null,
      isTranslating: false,

      fetchRevision: async (endpoint: string, id: string = null) => {
        if (!id) {
          id = 'latest';
        }
        const response = await fetch(
          `${endpoint}/${id}/?version=${FLOW_SPEC_VERSION}`
        );

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = (await response.json()) as FlowContents;
        set({ flowInfo: data.info, flowDefinition: data.definition });
      },

      fetchWorkspace: async (endpoint) => {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        set({ workspace: data });
      },

      fetchAllLanguages: async (endpoint) => {
        const results = await fetchResults(endpoint);

        // convert array to map for easier lookup
        const allLanguages = results.reduce(function (
          languages: any,
          result: any
        ) {
          languages[result.value] = result.name;
          return languages;
        },
        {});

        set({ languageNames: allLanguages });
      },

      getFlowResults: () => {
        const state = get();
        return state.flowInfo.results;
      },

      getResultByKey: (id: any) => {
        const state = get();
        const results = state.flowInfo.results;
        return results.find((result) => result.key === id);
      },

      getLanguage: () => {
        const state = get();
        const languageCode = state.languageCode;
        const languageNames = state.languageNames;
        return { name: languageNames[languageCode], code: languageCode };
      },

      // todo: eventually we should be doing the fetching
      setFlowContents: (flow: FlowContents) => {
        set((state: AppState) => {
          const flowLang = flow.definition.language;
          state.flowDefinition = flow.definition;
          state.flowInfo = flow.info;
          // Reset to the flow's default language when loading a new flow
          state.languageCode = flowLang;
          state.isTranslating = false;
        });
      },

      setFlowInfo: (info: FlowInfo) => {
        set((state: AppState) => {
          state.flowInfo = info;
        });
      },

      setLanguageCode: (languageCode: string) => {
        set((state: AppState) => {
          state.languageCode = languageCode;
          state.isTranslating = state.flowDefinition.language !== languageCode;
        });
      },

      setTestUpdate: () => {
        set((state: AppState) => {
          state.flowDefinition.name = 'Bloop!';
        });
      },

      expandCanvas: (width: number, height: number) => {
        set((state: AppState) => {
          const minWidth = Math.max(
            state.canvasSize.width,
            width + CANVAS_PADDING
          );
          const minHeight = Math.max(
            state.canvasSize.height,
            height + CANVAS_PADDING
          );

          state.canvasSize.width = minWidth;
          state.canvasSize.height = minHeight;
        });
      },

      updateCanvasPositions: (positions: CanvasPositions) => {
        set((state: AppState) => {
          for (const uuid in positions) {
            // todo: add nodes that are created and then moved, for now ignore
            if (state.flowDefinition._ui.nodes[uuid]) {
              state.flowDefinition._ui.nodes[uuid].position = positions[uuid];
            }
          }
        });
      },

      removeNodes: (uuids: string[]) => {
        set((state: AppState) => {
          for (const uuid of uuids) {
            delete state.flowDefinition._ui.nodes[uuid];
          }

          state.flowDefinition.nodes = state.flowDefinition.nodes.filter(
            (node) => !uuids.includes(node.uuid)
          );
        });
      }
    }))
  )
);

type SelectorAwareStoreApi<S extends object> = StoreApi<S> & {
  subscribe: <U>(
    selector: (state: S) => U,
    listener: (value: U, previous: U) => void
  ) => () => void;
};

/**
 * Custom Lit property decorator that binds a property to a Zustand store subscription.
 *
 * @param store - The Zustand store to subscribe to.
 * @param selector - A function selecting the slice of state to bind to the property.
 */
export function fromStore<S extends object, V = unknown>(
  store: SelectorAwareStoreApi<S>,
  selector: (state: S) => V
): PropertyDecorator {
  return (proto: any, name: string | symbol) => {
    property()(proto, name as string);

    const connectedKey = 'connectedCallback';
    const disconnectedKey = 'disconnectedCallback';

    const userConnected = proto[connectedKey];
    const userDisconnected = proto[disconnectedKey];

    proto[connectedKey] = function () {
      this._zustandUnsubscribe ??= {};
      this[name] = selector(store.getState());

      this._zustandUnsubscribe[name] = store.subscribe(selector, (val: V) => {
        this[name] = val;
      });

      if (userConnected) userConnected.call(this);
    };

    proto[disconnectedKey] = function () {
      this._zustandUnsubscribe?.[name]?.();
      if (userDisconnected) userDisconnected.call(this);
    };
  };
}
