import { createStore, StoreApi } from 'zustand/vanilla';
import { fetchResults, generateUUID } from '../utils';
import {
  Action,
  Exit,
  FlowDefinition,
  FlowPosition,
  Node,
  NodeUI,
  Router,
  StickyNote
} from './flow-definition';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { property } from 'lit/decorators.js';
import { produce } from 'immer';

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

  dirtyDate: Date | null;

  canvasSize: { width: number; height: number };

  fetchRevision: (endpoint: string, id?: string) => void;
  fetchWorkspace: (endpoint: string) => Promise<void>;
  fetchAllLanguages: (endpoint: string) => Promise<void>;

  getFlowResults: () => InfoResult[];
  getResultByKey(id: any): InfoResult;

  setFlowContents: (flow: FlowContents) => void;
  setFlowInfo: (info: FlowInfo) => void;
  setLanguageCode: (languageCode: string) => void;
  setDirtyDate: (date: Date) => void;
  expandCanvas: (width: number, height: number) => void;

  updateNode(
    uuid: string,
    node: { actions: Action[]; uuid: string; exits: Exit[]; router?: Router }
  ): unknown;
  updateNodeUIConfig(uuid: string, config: Record<string, any>): unknown;
  updateConnection(
    nodeUuid: string,
    exitUuid: string,
    destinationNodeUuid: string
  ): unknown;
  updateCanvasPositions: (positions: CanvasPositions) => void;
  removeNodes: (uuids: string[]) => void;
  removeStickyNotes: (uuids: string[]) => void;
  updateStickyNote(uuid: string, sticky: StickyNote): void;
  createStickyNote(position: FlowPosition): string;
  createNode(nodeType: string, position: FlowPosition): string;
  addNode(node: Node, nodeUI: NodeUI): void;
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
      dirtyDate: null,

      setDirtyDate: (date: Date) => {
        set((state: AppState) => {
          state.dirtyDate = date;
        });
      },

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

            // otherwise, it might be a sticky
            else if (state.flowDefinition._ui.stickies[uuid]) {
              state.flowDefinition._ui.stickies[uuid].position =
                positions[uuid];
            }
          }
          state.dirtyDate = new Date();
        });
      },

      removeNodes: (uuids: string[]) => {
        set((state: AppState) => {
          for (const uuid of uuids) {
            delete state.flowDefinition._ui.nodes[uuid];
          }

          state.flowDefinition = produce(state.flowDefinition, (draft) => {
            draft.nodes = draft.nodes.filter(
              (node) => !uuids.includes(node.uuid)
            );

            draft.nodes.forEach((node) => {
              node.exits.forEach((exit) => {
                if (uuids.includes(exit.destination_uuid)) {
                  exit.destination_uuid = null;
                }
              });
            });
          });

          state.dirtyDate = new Date();
        });
      },

      removeStickyNotes: (uuids: string[]) => {
        set((state: AppState) => {
          if (state.flowDefinition._ui?.stickies) {
            for (const uuid of uuids) {
              delete state.flowDefinition._ui.stickies[uuid];
            }
          }
          state.dirtyDate = new Date();
        });
      },

      updateNode: (uuid: string, newNode: Node) => {
        set((state: AppState) => {
          const node = state.flowDefinition?.nodes.find((n) => n.uuid === uuid);
          if (node) {
            node.actions = newNode.actions;
            node.uuid = newNode.uuid;
            node.exits = newNode.exits;
            node.router = newNode.router;
          }
          state.dirtyDate = new Date();
        });
      },

      updateNodeUIConfig: (uuid: string, config: Record<string, any>) => {
        set((state: AppState) => {
          if (state.flowDefinition._ui.nodes[uuid]) {
            if (!state.flowDefinition._ui.nodes[uuid].config) {
              state.flowDefinition._ui.nodes[uuid].config = {};
            }
            Object.assign(state.flowDefinition._ui.nodes[uuid].config, config);
          }
          state.dirtyDate = new Date();
        });
      },

      updateConnection: (
        nodeUuid: string,
        exitUuid: string,
        destinationNodeUuid: string
      ) => {
        set((state: AppState) => {
          // Find the exit with this UUID
          const node = state.flowDefinition.nodes.find(
            (node) => node.uuid === nodeUuid
          );

          const exit = node?.exits.find((e) => e.uuid === exitUuid);
          if (exit) {
            // Update the destination
            exit.destination_uuid = destinationNodeUuid;
            state.dirtyDate = new Date();
          }
        });
      },

      updateStickyNote: (uuid: string, sticky: StickyNote) => {
        set((state: AppState) => {
          if (!state.flowDefinition._ui.stickies) {
            state.flowDefinition._ui.stickies = {};
          }
          state.flowDefinition._ui.stickies[uuid] = sticky;
          state.dirtyDate = new Date();
        });
      },

      createStickyNote: (position: FlowPosition): string => {
        const uuid = generateUUID();
        set((state: AppState) => {
          if (!state.flowDefinition._ui.stickies) {
            state.flowDefinition._ui.stickies = {};
          }

          const newSticky: StickyNote = {
            position,
            title: '',
            body: '',
            color: 'yellow'
          };

          state.flowDefinition._ui.stickies[uuid] = newSticky;
          state.dirtyDate = new Date();
        });
        return uuid;
      },

      createNode: (nodeType: string, position: FlowPosition): string => {
        const uuid = generateUUID();
        const exitUuid = generateUUID();

        set((state: AppState) => {
          // Create a basic node with a single exit
          const newNode: Node = {
            uuid,
            actions: [],
            exits: [
              {
                uuid: exitUuid,
                destination_uuid: null
              }
            ]
          };

          // Add the node to the flow definition
          state.flowDefinition.nodes.push(newNode);

          // Set up UI for the node
          if (!state.flowDefinition._ui.nodes) {
            state.flowDefinition._ui.nodes = {};
          }

          state.flowDefinition._ui.nodes[uuid] = {
            position,
            type: nodeType as any,
            config: {}
          };

          state.dirtyDate = new Date();
        });

        return uuid;
      },

      addNode: (node: Node, nodeUI: NodeUI) => {
        set((state: AppState) => {
          // Add the node to the flow definition
          state.flowDefinition.nodes.push(node);

          // Set up UI for the node
          if (!state.flowDefinition._ui.nodes) {
            state.flowDefinition._ui.nodes = {};
          }

          state.flowDefinition._ui.nodes[node.uuid] = nodeUI;

          state.dirtyDate = new Date();
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
