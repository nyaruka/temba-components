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

/**
 * Sorts nodes by their position - first by y (top), then by x (left)
 */
function sortNodesByPosition(
  nodes: Node[],
  nodePositions: Record<string, NodeUI>
): void {
  nodes.sort((a, b) => {
    const posA = nodePositions[a.uuid]?.position;
    const posB = nodePositions[b.uuid]?.position;

    // if either position is missing, maintain current order
    if (!posA || !posB) {
      return 0;
    }

    // sort by y (top) first
    if (posA.top !== posB.top) {
      return posA.top - posB.top;
    }

    // if y is same, sort by x (left)
    return posA.left - posB.left;
  });
}

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

export interface Activity {
  segments: { [exitToDestinationKey: string]: number };
  nodes: { [nodeUuid: string]: number };
}

export interface AppState {
  flowDefinition: FlowDefinition;
  flowInfo: FlowInfo;

  languageCode: string;
  languageNames: { [code: string]: Language };
  workspace: Workspace;
  isTranslating: boolean;
  viewingRevision: boolean;

  dirtyDate: Date | null;

  canvasSize: { width: number; height: number };
  activity: Activity | null;
  simulatorActivity: Activity | null;
  activityEndpoint: string | null;
  simulatorActive: boolean;

  getCurrentActivity: () => Activity | null;
  fetchRevision: (endpoint: string, id?: string) => void;
  fetchWorkspace: (endpoint: string) => Promise<void>;
  fetchAllLanguages: (endpoint: string) => Promise<void>;
  fetchActivity: (endpoint: string) => Promise<void>;
  setActivityEndpoint: (endpoint: string) => void;
  updateActivity: (activity: Activity) => void;
  updateSimulatorActivity: (activity: Activity) => void;
  setSimulatorActive: (active: boolean) => void;

  getFlowResults: () => InfoResult[];
  getResultByKey(id: any): InfoResult;

  setFlowContents: (flow: FlowContents) => void;
  setFlowInfo: (info: FlowInfo) => void;
  setRevision: (revision: number) => void;
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
  updateLocalization(
    languageCode: string,
    actionUuid: string,
    localizationData: Record<string, any>
  ): void;
  setTranslationFilters: (filters: { categories: boolean }) => void;
  markAutoTranslated: (
    languageCode: string,
    uuid: string,
    attributes: string[]
  ) => void;
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
      viewingRevision: false,
      dirtyDate: null,
      activity: null,
      simulatorActivity: null,
      activityEndpoint: null,
      simulatorActive: false,

      setDirtyDate: (date: Date) => {
        set((state: AppState) => {
          state.dirtyDate = date;
        });
      },

      fetchRevision: async (endpoint: string, id: string = null) => {
        const viewingRevision = !!id && id !== 'latest';
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
        set({
          flowInfo: data.info,
          flowDefinition: data.definition,
          viewingRevision
        });
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

      setActivityEndpoint: (endpoint: string) => {
        set({ activityEndpoint: endpoint });
      },

      fetchActivity: async (endpoint: string) => {
        try {
          const response = await fetch(endpoint);
          if (!response.ok) {
            return;
          }
          const data = await response.json();
          set({ activity: data });
        } catch (error) {
          console.error('Failed to fetch activity:', error);
        }
      },

      updateActivity: (activity: Activity) => {
        set({ activity });
      },

      updateSimulatorActivity: (activity: Activity) => {
        set({ simulatorActivity: activity });
      },

      setSimulatorActive: (active: boolean) => {
        set({ simulatorActive: active });
      },

      getCurrentActivity: () => {
        const state = get();
        return state.simulatorActive ? state.simulatorActivity : state.activity;
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
          // Clone to ensure mutable for sorting
          state.flowDefinition = {
            ...flow.definition,
            nodes: [...(flow.definition.nodes || [])]
          };
          state.flowInfo = flow.info;
          // Reset to the flow's default language when loading a new flow
          state.languageCode = flowLang;
          state.isTranslating = false;

          // Sort nodes by position when loading flow
          if (state.flowDefinition?.nodes && state.flowDefinition?._ui?.nodes) {
            sortNodesByPosition(
              state.flowDefinition.nodes,
              state.flowDefinition._ui.nodes
            );
          }
        });
      },

      setFlowInfo: (info: FlowInfo) => {
        set((state: AppState) => {
          state.flowInfo = info;
        });
      },

      setRevision: (revision: number) => {
        set((state: AppState) => {
          state.flowDefinition.revision = revision;
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

          // Sort nodes by position since positions may have changed
          sortNodesByPosition(
            state.flowDefinition.nodes,
            state.flowDefinition._ui.nodes
          );

          state.dirtyDate = new Date();
        });
      },

      removeNodes: (uuids: string[]) => {
        set((state: AppState) => {
          for (const uuid of uuids) {
            delete state.flowDefinition._ui.nodes[uuid];
          }

          state.flowDefinition = produce(state.flowDefinition, (draft) => {
            // For each node being removed, check if we should reroute connections
            uuids.forEach((removedUuid) => {
              const removedNode = draft.nodes.find(
                (n) => n.uuid === removedUuid
              );

              if (!removedNode || !removedNode.exits.length) return;

              // Get all destinations (filter out null/undefined)
              const destinations = removedNode.exits
                .map((exit) => exit.destination_uuid)
                .filter((dest) => dest);

              // Only proceed if all exits have destinations and they all point to the same place
              if (
                destinations.length === removedNode.exits.length &&
                destinations.every((dest) => dest === destinations[0])
              ) {
                const targetDestination = destinations[0];
                // Don't reroute if the target is also being removed
                if (uuids.includes(targetDestination)) return;

                // Find all nodes with exits pointing to the node being removed
                draft.nodes.forEach((node) => {
                  node.exits.forEach((exit) => {
                    if (exit.destination_uuid === removedUuid) {
                      // Reroute to the same destination the removed node was going to
                      exit.destination_uuid = targetDestination;
                    }
                  });
                });
              }
            });

            // Remove the nodes
            draft.nodes = draft.nodes.filter(
              (node) => !uuids.includes(node.uuid)
            );

            // Clear any remaining connections to removed nodes that weren't rerouted
            draft.nodes.forEach((node) => {
              node.exits.forEach((exit) => {
                if (uuids.includes(exit.destination_uuid)) {
                  exit.destination_uuid = null;
                }
              });
            });

            // Sort nodes by position
            sortNodesByPosition(draft.nodes, draft._ui.nodes);
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
            // Handle type separately if provided
            if (config.type !== undefined) {
              state.flowDefinition._ui.nodes[uuid].type = config.type;
            }

            // Update config (excluding type)
            if (!state.flowDefinition._ui.nodes[uuid].config) {
              state.flowDefinition._ui.nodes[uuid].config = {};
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { type, ...configWithoutType } = config;
            Object.assign(
              state.flowDefinition._ui.nodes[uuid].config,
              configWithoutType
            );
          }
          state.dirtyDate = new Date();
        });
      },

      updateConnection: (
        nodeUuid: string,
        exitUuid: string,
        destinationNodeUuid: string
      ) => {
        /* console.log('Upating connection:', {
          nodeUuid,
          exitUuid,
          destinationNodeUuid
        });*/
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

          // Sort nodes by position
          sortNodesByPosition(
            state.flowDefinition.nodes,
            state.flowDefinition._ui.nodes
          );

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

          // Sort nodes by position
          sortNodesByPosition(
            state.flowDefinition.nodes,
            state.flowDefinition._ui.nodes
          );

          state.dirtyDate = new Date();
        });
      },

      updateLocalization: (
        languageCode: string,
        actionUuid: string,
        localizationData: Record<string, any>
      ) => {
        set((state: AppState) => {
          // Initialize localization structure if it doesn't exist
          if (!state.flowDefinition.localization) {
            state.flowDefinition.localization = {};
          }

          if (!state.flowDefinition.localization[languageCode]) {
            state.flowDefinition.localization[languageCode] = {};
          }

          // Update or remove the localization for this action
          if (Object.keys(localizationData).length > 0) {
            state.flowDefinition.localization[languageCode][actionUuid] =
              localizationData;
          } else {
            // If no localized values, remove the entry
            delete state.flowDefinition.localization[languageCode][actionUuid];
          }

          // Clean up empty language sections
          if (
            Object.keys(state.flowDefinition.localization[languageCode])
              .length === 0
          ) {
            delete state.flowDefinition.localization[languageCode];
          }

          // Clean up empty localization object
          if (Object.keys(state.flowDefinition.localization).length === 0) {
            delete state.flowDefinition.localization;
          }

          state.dirtyDate = new Date();
        });
      },

      setTranslationFilters: (filters: { categories: boolean }) => {
        set((state: AppState) => {
          if (!state.flowDefinition?._ui) {
            return;
          }

          const currentFilters = state.flowDefinition._ui
            .translation_filters || {
            categories: false
          };

          state.flowDefinition._ui.translation_filters = {
            ...currentFilters,
            categories: !!filters.categories
          };

          state.dirtyDate = new Date();
        });
      },

      markAutoTranslated: (
        languageCode: string,
        uuid: string,
        attributes: string[]
      ) => {
        set((state: AppState) => {
          if (!state.flowDefinition?._ui) {
            return;
          }

          if (!state.flowDefinition._ui.auto_translations) {
            state.flowDefinition._ui.auto_translations = {};
          }

          if (!state.flowDefinition._ui.auto_translations[languageCode]) {
            state.flowDefinition._ui.auto_translations[languageCode] = {};
          }

          const existing =
            state.flowDefinition._ui.auto_translations[languageCode][uuid] ||
            [];

          const merged = Array.from(
            new Set([...existing, ...(attributes || [])])
          );

          state.flowDefinition._ui.auto_translations[languageCode][uuid] =
            merged;
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
