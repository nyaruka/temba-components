import { createStore } from 'zustand/vanilla';
import { fetchResults } from '../utils';
import { FlowDefinition, FlowPosition } from './flow-definition';
import { immer } from 'zustand/middleware/immer';

export const FLOW_SPEC_VERSION = '14.3';

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
  flow: FlowContents;
  languageCode: string;
  languageNames: { [code: string]: Language };
  workspace: Workspace;
  isTranslating: boolean;

  fetchRevision: (endpoint: string, id: string) => void;
  fetchWorkspace: (endpoint: string) => Promise<void>;
  fetchAllLanguages: (endpoint: string) => Promise<void>;

  getFlowResults: () => InfoResult[];
  getResultByKey(id: any): InfoResult;

  setFlowContents: (flow: FlowContents) => void;
  setFlowInfo: (info: FlowInfo) => void;
  setLanguageCode: (languageCode: string) => void;

  updateCanvasPositions: (positions: CanvasPositions) => void;
  removeNodes: (uuids: string[]) => void;
}

export default createStore<AppState>()(
  immer((set, get) => ({
    languageNames: {},
    languageCode: '',
    workspace: null,
    flow: null,
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
      set({ flow: data });
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
      return state.flow.info.results;
    },

    getResultByKey: (id: any) => {
      const state = get();
      const results = state.flow.info.results;
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
        const languageCode = state.languageCode || flowLang;
        state.flow = flow;
        state.isTranslating = flowLang !== languageCode;
        state.languageCode = languageCode || flowLang;
      });
    },

    setFlowInfo: (info: FlowInfo) => {
      set((state: AppState) => {
        state.flow.info = info;
      });
    },

    setLanguageCode: (languageCode: string) => {
      set((state: AppState) => {
        state.languageCode = languageCode;
        state.isTranslating = state.flow.definition.language !== languageCode;
      });
    },

    updateCanvasPositions: (positions: CanvasPositions) => {
      set((state: AppState) => {
        for (const uuid in positions) {
          // todo: add nodes that are created and then moved, for now ignore
          if (state.flow.definition._ui.nodes[uuid]) {
            state.flow.definition._ui.nodes[uuid].position = positions[uuid];
          }
        }
      });
    },

    removeNodes: (uuids: string[]) => {
      set((state: AppState) => {
        for (const uuid of uuids) {
          delete state.flow.definition._ui.nodes[uuid];
        }

        state.flow.definition.nodes = state.flow.definition.nodes.filter(
          (node) => !uuids.includes(node.uuid)
        );
      });
    }
  }))
);
