import { createStore } from 'zustand/vanilla';
import { fetchResults } from '../utils';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { property } from 'lit/decorators.js';
export const FLOW_SPEC_VERSION = '14.3';
const CANVAS_PADDING = 800;
export const zustand = createStore()(subscribeWithSelector(immer((set, get) => ({
    languageNames: {},
    canvasSize: { width: 0, height: 0 },
    languageCode: '',
    workspace: null,
    flowDefinition: null,
    flowInfo: null,
    isTranslating: false,
    dirtyDate: null,
    setDirtyDate: (date) => {
        set((state) => {
            state.dirtyDate = date;
        });
    },
    fetchRevision: async (endpoint, id = null) => {
        if (!id) {
            id = 'latest';
        }
        const response = await fetch(`${endpoint}/${id}/?version=${FLOW_SPEC_VERSION}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = (await response.json());
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
        const allLanguages = results.reduce(function (languages, result) {
            languages[result.value] = result.name;
            return languages;
        }, {});
        set({ languageNames: allLanguages });
    },
    getFlowResults: () => {
        const state = get();
        return state.flowInfo.results;
    },
    getResultByKey: (id) => {
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
    setFlowContents: (flow) => {
        set((state) => {
            const flowLang = flow.definition.language;
            state.flowDefinition = flow.definition;
            state.flowInfo = flow.info;
            // Reset to the flow's default language when loading a new flow
            state.languageCode = flowLang;
            state.isTranslating = false;
        });
    },
    setFlowInfo: (info) => {
        set((state) => {
            state.flowInfo = info;
        });
    },
    setLanguageCode: (languageCode) => {
        set((state) => {
            state.languageCode = languageCode;
            state.isTranslating = state.flowDefinition.language !== languageCode;
        });
    },
    expandCanvas: (width, height) => {
        set((state) => {
            const minWidth = Math.max(state.canvasSize.width, width + CANVAS_PADDING);
            const minHeight = Math.max(state.canvasSize.height, height + CANVAS_PADDING);
            state.canvasSize.width = minWidth;
            state.canvasSize.height = minHeight;
        });
    },
    updateCanvasPositions: (positions) => {
        set((state) => {
            for (const uuid in positions) {
                // todo: add nodes that are created and then moved, for now ignore
                if (state.flowDefinition._ui.nodes[uuid]) {
                    state.flowDefinition._ui.nodes[uuid].position = positions[uuid];
                }
            }
        });
    },
    updateNodePosition: (uuid, newPosition) => {
        set((state) => {
            if (state.flowDefinition._ui.nodes[uuid]) {
                state.flowDefinition._ui.nodes[uuid].position = newPosition;
            }
            else {
                // If the node doesn't exist in _ui, we can add it
                state.flowDefinition._ui.nodes[uuid] = {
                    position: newPosition,
                    type: null,
                    config: {}
                };
            }
            state.dirtyDate = new Date();
        });
    },
    removeNodes: (uuids) => {
        set((state) => {
            for (const uuid of uuids) {
                delete state.flowDefinition._ui.nodes[uuid];
            }
            state.flowDefinition.nodes = state.flowDefinition.nodes.filter((node) => !uuids.includes(node.uuid));
        });
    },
    updateStickyPosition: (uuid, newPosition) => {
        set((state) => {
            if (!state.flowDefinition._ui.stickies) {
                state.flowDefinition._ui.stickies = {};
            }
            if (state.flowDefinition._ui.stickies[uuid]) {
                state.flowDefinition._ui.stickies[uuid].position = newPosition;
                state.dirtyDate = new Date();
            }
        });
    },
    updateNode: (uuid, newNode) => {
        set((state) => {
            var _a;
            const node = (_a = state.flowDefinition) === null || _a === void 0 ? void 0 : _a.nodes.find((n) => n.uuid === uuid);
            if (node) {
                node.actions = newNode.actions;
                node.uuid = newNode.uuid;
                node.exits = newNode.exits;
                node.router = newNode.router;
            }
            state.dirtyDate = new Date();
        });
    },
    updateStickyNote: (uuid, sticky) => {
        set((state) => {
            if (!state.flowDefinition._ui.stickies) {
                state.flowDefinition._ui.stickies = {};
            }
            state.flowDefinition._ui.stickies[uuid] = sticky;
            state.dirtyDate = new Date();
        });
    }
}))));
/**
 * Custom Lit property decorator that binds a property to a Zustand store subscription.
 *
 * @param store - The Zustand store to subscribe to.
 * @param selector - A function selecting the slice of state to bind to the property.
 */
export function fromStore(store, selector) {
    return (proto, name) => {
        property()(proto, name);
        const connectedKey = 'connectedCallback';
        const disconnectedKey = 'disconnectedCallback';
        const userConnected = proto[connectedKey];
        const userDisconnected = proto[disconnectedKey];
        proto[connectedKey] = function () {
            var _a;
            (_a = this._zustandUnsubscribe) !== null && _a !== void 0 ? _a : (this._zustandUnsubscribe = {});
            this[name] = selector(store.getState());
            this._zustandUnsubscribe[name] = store.subscribe(selector, (val) => {
                this[name] = val;
            });
            if (userConnected)
                userConnected.call(this);
        };
        proto[disconnectedKey] = function () {
            var _a, _b;
            (_b = (_a = this._zustandUnsubscribe) === null || _a === void 0 ? void 0 : _a[name]) === null || _b === void 0 ? void 0 : _b.call(_a);
            if (userDisconnected)
                userDisconnected.call(this);
        };
    };
}
//# sourceMappingURL=AppState.js.map