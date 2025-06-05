import { html, fixture, expect, assert } from '@open-wc/testing';
import { EditorNode } from '../src/flow/EditorNode';
import { Plumber } from '../src/flow/Plumber';
import { Node, NodeUI, Action, Exit, Router, Category } from '../src/store/flow-definition.d';
import { stub, restore } from 'sinon';

// Register the component
customElements.define('temba-editor-node', EditorNode);

describe('EditorNode', () => {
  let editorNode: EditorNode;
  let mockPlumber: any;

  beforeEach(async () => {
    // Mock plumber
    mockPlumber = {
      makeTarget: stub(),
      makeSource: stub(),
      connectIds: stub()
    };
  });

  afterEach(() => {
    restore();
  });

  describe('basic functionality', () => {
    it('creates render root as element itself', () => {
      const editorNode = new EditorNode();
      expect(editorNode.createRenderRoot()).to.equal(editorNode);
    });

    it('has correct CSS styles defined', () => {
      const styles = EditorNode.styles;
      expect(styles).to.exist;
      expect(styles.cssText).to.contain('.node');
      expect(styles.cssText).to.contain('.action');
      expect(styles.cssText).to.contain('.categories');
      expect(styles.cssText).to.contain('.exit');
    });
  });

  describe('renderAction', () => {
    beforeEach(() => {
      editorNode = new EditorNode();
    });

    it('renders action with known config', () => {
      const mockNode: Node = {
        uuid: 'test-node-3',
        actions: [],
        exits: []
      };

      const action: any = {
        type: 'send_msg',
        uuid: 'action-1',
        text: 'Test message',
        quick_replies: []
      };

      const result = (editorNode as any).renderAction(mockNode, action);
      expect(result).to.exist;
    });

    it('renders action with unknown config', () => {
      const mockNode: Node = {
        uuid: 'test-node-4',
        actions: [],
        exits: []
      };

      const action: Action = {
        type: 'unknown_action' as any,
        uuid: 'action-1'
      };

      const result = (editorNode as any).renderAction(mockNode, action);
      expect(result).to.exist;
    });
  });

  describe('renderRouter', () => {
    beforeEach(() => {
      editorNode = new EditorNode();
    });

    it('renders router with result name', () => {
      const mockRouter: Router = {
        type: 'switch',
        result_name: 'test_result',
        categories: []
      };

      const mockUI: NodeUI = {
        position: { left: 50, top: 100 },
        type: 'wait_for_response'
      };

      const result = (editorNode as any).renderRouter(mockRouter, mockUI);
      expect(result).to.exist;
    });

    it('renders router without result name', () => {
      const mockRouter: Router = {
        type: 'switch',
        categories: []
      };

      const mockUI: NodeUI = {
        position: { left: 50, top: 100 },
        type: 'wait_for_response'
      };

      const result = (editorNode as any).renderRouter(mockRouter, mockUI);
      expect(result).to.exist;
    });

    it('returns undefined for router with unknown UI type', () => {
      const mockRouter: Router = {
        type: 'switch',
        categories: []
      };

      const mockUI: NodeUI = {
        position: { left: 50, top: 100 },
        type: 'unknown_type' as any
      };

      const result = (editorNode as any).renderRouter(mockRouter, mockUI);
      expect(result).to.be.undefined;
    });
  });

  describe('renderCategories', () => {
    beforeEach(() => {
      editorNode = new EditorNode();
    });

    it('returns null when no router', () => {
      const mockNode: Node = {
        uuid: 'test-node-7',
        actions: [],
        exits: []
      };

      const result = (editorNode as any).renderCategories(mockNode);
      expect(result).to.be.null;
    });

    it('returns null when no categories', () => {
      const mockNode: Node = {
        uuid: 'test-node-8',
        actions: [],
        exits: [],
        router: {
          type: 'switch',
          categories: undefined as any
        }
      };

      const result = (editorNode as any).renderCategories(mockNode);
      expect(result).to.be.null;
    });

    it('renders categories with exits', () => {
      const mockNode: Node = {
        uuid: 'test-node-9',
        actions: [],
        exits: [
          { uuid: 'exit-1' },
          { uuid: 'exit-2' }
        ],
        router: {
          type: 'switch',
          categories: [
            { uuid: 'cat-1', name: 'Category 1', exit_uuid: 'exit-1' },
            { uuid: 'cat-2', name: 'Category 2', exit_uuid: 'exit-2' }
          ]
        }
      };

      const result = (editorNode as any).renderCategories(mockNode);
      expect(result).to.exist;
    });
  });

  describe('renderExit', () => {
    beforeEach(() => {
      editorNode = new EditorNode();
    });

    it('renders exit with connected class when destination exists', async () => {
      const exit: Exit = {
        uuid: 'exit-connected',
        destination_uuid: 'destination-node'
      };

      const result = (editorNode as any).renderExit(exit);
      const container = await fixture(html`<div>${result}</div>`);
      
      const exitElement = container.querySelector('.exit');
      expect(exitElement).to.exist;
      expect(exitElement?.classList.contains('connected')).to.be.true;
      expect(exitElement?.getAttribute('id')).to.equal('exit-connected');
    });

    it('renders exit without connected class when no destination', async () => {
      const exit: Exit = {
        uuid: 'exit-unconnected'
      };

      const result = (editorNode as any).renderExit(exit);
      const container = await fixture(html`<div>${result}</div>`);
      
      const exitElement = container.querySelector('.exit');
      expect(exitElement).to.exist;
      expect(exitElement?.classList.contains('connected')).to.be.false;
      expect(exitElement?.getAttribute('id')).to.equal('exit-unconnected');
    });
  });

  describe('renderTitle', () => {
    beforeEach(() => {
      editorNode = new EditorNode();
    });

    it('renders title with config color and name', async () => {
      const config = {
        name: 'Test Action',
        color: '#ff0000'
      };

      const result = (editorNode as any).renderTitle(config);
      const container = await fixture(html`<div>${result}</div>`);
      
      const title = container.querySelector('.title');
      expect(title).to.exist;
      expect(title?.textContent?.trim()).to.equal('Test Action');
      expect(title?.getAttribute('style')).to.contain('background:#ff0000');
    });
  });

  describe('updated lifecycle', () => {
    it('handles updated without node changes', () => {
      editorNode = new EditorNode();
      (editorNode as any).plumber = mockPlumber;
      
      const changes = new Map();
      changes.set('other', true);
      
      // Should not throw and not call plumber methods
      expect(() => {
        (editorNode as any).updated(changes);
      }).to.not.throw();
      
      expect(mockPlumber.makeTarget).to.not.have.been.called;
    });

    it('verifies updated method exists', () => {
      editorNode = new EditorNode();
      expect(typeof (editorNode as any).updated).to.equal('function');
    });
  });

  describe('basic integration', () => {
    it('can create and verify structure without full rendering', () => {
      const mockNode: Node = {
        uuid: 'integration-test-node',
        actions: [
          {
            type: 'send_msg',
            uuid: 'action-1',
            text: 'Hello',
            quick_replies: []
          } as any
        ],
        exits: [
          { uuid: 'exit-1', destination_uuid: 'next-node' }
        ]
      };

      const mockUI: NodeUI = {
        position: { left: 100, top: 200 },
        type: 'wait_for_response'
      };

      // Test individual render methods work
      editorNode = new EditorNode();
      
      // Test renderAction 
      const actionResult = (editorNode as any).renderAction(mockNode, mockNode.actions[0]);
      expect(actionResult).to.exist;

      // Test renderExit
      const exitResult = (editorNode as any).renderExit(mockNode.exits[0]);
      expect(exitResult).to.exist;

      // Verify the node structure is as expected
      expect(mockNode.uuid).to.equal('integration-test-node');
      expect(mockNode.actions).to.have.length(1);
      expect(mockNode.exits).to.have.length(1);
    });
  });
});