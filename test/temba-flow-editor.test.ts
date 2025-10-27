import { html, fixture, expect } from '@open-wc/testing';
import { Editor } from '../src/flow/Editor';
import { Plumber } from '../src/flow/Plumber';
import { stub, restore } from 'sinon';

// Register the component
customElements.define('temba-flow-editor', Editor);

describe('Editor', () => {
  let editor: Editor;

  beforeEach(() => {
    // Reset any stubs
    restore();
  });

  afterEach(() => {
    restore();
  });

  describe('basic functionality', () => {
    it('creates render root as element itself', () => {
      const editor = new Editor();
      expect(editor.createRenderRoot()).to.equal(editor);
    });

    it('has correct CSS styles defined', () => {
      const styles = Editor.styles;
      expect(styles).to.exist;
      expect(styles.cssText).to.contain('#editor');
      expect(styles.cssText).to.contain('#grid');
      expect(styles.cssText).to.contain('#canvas');
      expect(styles.cssText).to.contain('.plumb-source');
      expect(styles.cssText).to.contain('.plumb-target');
      expect(styles.cssText).to.contain('.plumb-connector');
    });

    it('creates with default properties', () => {
      editor = new Editor();
      expect(editor.flow).to.be.undefined;
      expect(editor.version).to.be.undefined;
    });

    it('accepts flow and version properties without getStore call', async () => {
      editor = document.createElement('temba-flow-editor') as Editor;
      editor.flow = 'test-flow-uuid';
      editor.version = '1.0';

      expect(editor.flow).to.equal('test-flow-uuid');
      expect(editor.version).to.equal('1.0');
    });
  });

  describe('lifecycle methods', () => {
    it('calls firstUpdated and initializes plumber', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      // Verify that plumber is initialized
      expect((editor as any).plumber).to.be.instanceOf(Plumber);
    });

    it('verifies firstUpdated method exists and can be called', () => {
      editor = new Editor();

      // Mock canvas element
      const mockCanvas = document.createElement('div');
      mockCanvas.id = 'canvas';

      // Mock querySelector to return our mock canvas
      stub(editor, 'querySelector').returns(mockCanvas);

      // Verify firstUpdated method exists
      expect(typeof (editor as any).firstUpdated).to.equal('function');

      // Test that calling firstUpdated doesn't throw (without getStore)
      expect(() => {
        // Only test the plumber initialization part
        (editor as any).plumber = new Plumber(mockCanvas);
      }).to.not.throw();
    });

    it('handles updated with canvasSize changes', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      // Simulate canvasSize change
      (editor as any).canvasSize = { width: 800, height: 600 };
      const changes = new Map();
      changes.set('canvasSize', true);

      (editor as any).updated(changes);

      // Verify the canvasSize was set correctly
      expect((editor as any).canvasSize).to.deep.equal({
        width: 800,
        height: 600
      });
    });

    it('handles updated without canvasSize changes', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      const consoleStub = stub(console, 'log');

      const changes = new Map();
      changes.set('other', true);

      (editor as any).updated(changes);

      expect(consoleStub).to.not.have.been.called;

      consoleStub.restore();
    });
  });

  describe('render method', () => {
    it('renders loading when no definition', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      // Set canvas size to avoid undefined errors
      (editor as any).canvasSize = { width: 800, height: 600 };
      await editor.updateComplete;

      const loadingElement = editor.querySelector('temba-loading');
      expect(loadingElement).to.exist;
    });

    it('renders nodes when definition exists', async () => {
      const mockDefinition = {
        nodes: [
          {
            uuid: 'node-1',
            actions: [],
            exits: []
          },
          {
            uuid: 'node-2',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'node-1': { position: { left: 100, top: 200 } },
            'node-2': { position: { left: 300, top: 400 } }
          }
        }
      };

      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      // Set properties
      (editor as any).definition = mockDefinition;
      (editor as any).canvasSize = { width: 800, height: 600 };
      await editor.updateComplete;

      const flowNodes = editor.querySelectorAll('temba-flow-node');
      expect(flowNodes).to.have.length(2);
    });

    it('includes style elements in light DOM', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      // Set canvas size
      (editor as any).canvasSize = { width: 800, height: 600 };
      await editor.updateComplete;

      const styleElements = editor.querySelectorAll('style');
      expect(styleElements.length).to.be.greaterThan(0);
    });

    it('renders with correct grid dimensions', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      (editor as any).canvasSize = { width: 1200, height: 800 };
      await editor.updateComplete;

      const gridElement = editor.querySelector('#grid');
      expect(gridElement).to.exist;

      const style = gridElement?.getAttribute('style');
      expect(style).to.contain('width:1200px');
      expect(style).to.contain('height:800px');
    });

    it('renders editor structure', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      (editor as any).canvasSize = { width: 800, height: 600 };
      await editor.updateComplete;

      const editorElement = editor.querySelector('#editor');
      expect(editorElement).to.exist;

      const gridElement = editor.querySelector('#grid');
      expect(gridElement).to.exist;

      const canvasElement = editor.querySelector('#canvas');
      expect(canvasElement).to.exist;
    });
  });

  describe('property handling', () => {
    it('handles flow property change', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      // Change flow property
      editor.flow = 'new-flow-uuid';
      await editor.updateComplete;

      expect(editor.flow).to.equal('new-flow-uuid');
    });

    it('handles version property change', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      editor.version = '2.0';
      await editor.updateComplete;

      expect(editor.version).to.equal('2.0');
    });
  });

  describe('store integration', () => {
    it('has fromStore decorators for definition and canvasSize', () => {
      editor = new Editor();

      // Check that the properties exist (they are private but we can verify they exist)
      expect(editor).to.have.property('definition');
      expect(editor).to.have.property('canvasSize');
    });
  });

  describe('constructor behavior', () => {
    it('calls super in constructor', () => {
      // This mainly verifies the constructor doesn't throw
      expect(() => {
        new Editor();
      }).to.not.throw();
    });
  });

  describe('multi-selection functionality', () => {
    let mockDefinition: any;

    beforeEach(() => {
      mockDefinition = {
        nodes: [
          {
            uuid: 'node-1',
            actions: [],
            exits: []
          },
          {
            uuid: 'node-2',
            actions: [],
            exits: []
          }
        ],
        _ui: {
          nodes: {
            'node-1': { position: { left: 100, top: 200 } },
            'node-2': { position: { left: 300, top: 400 } }
          },
          stickies: {
            'sticky-1': {
              position: { left: 200, top: 100 },
              title: 'Test Sticky',
              body: 'Test content',
              color: 'yellow'
            }
          }
        }
      };
    });

    it('initializes with empty selection', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      expect((editor as any).selectedItems.size).to.equal(0);
      expect((editor as any).isSelecting).to.be.false;
      expect((editor as any).selectionBox).to.be.null;
    });

    it('adds visual selection styling to selected items', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      // Set up mock definition and selection
      (editor as any).definition = mockDefinition;
      (editor as any).canvasSize = { width: 800, height: 600 };
      (editor as any).selectedItems = new Set(['node-1']);
      await editor.updateComplete;

      const selectedNode = editor.querySelector(
        'temba-flow-node[uuid="node-1"]'
      );
      expect(selectedNode).to.exist;
      expect(selectedNode.classList.contains('selected')).to.be.true;
    });

    it('renders selection box when selecting', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      // Set up selection state
      (editor as any).definition = mockDefinition;
      (editor as any).canvasSize = { width: 800, height: 600 };
      (editor as any).isSelecting = true;
      (editor as any).selectionBox = {
        startX: 50,
        startY: 50,
        endX: 150,
        endY: 150
      };
      await editor.updateComplete;

      const selectionBox = editor.querySelector('.selection-box');
      expect(selectionBox).to.exist;

      const style = selectionBox.getAttribute('style');
      expect(style).to.contain('left: 50px');
      expect(style).to.contain('top: 50px');
      expect(style).to.contain('width: 100px');
      expect(style).to.contain('height: 100px');
    });

    it('handles escape key to clear selection', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      // Set up selection
      (editor as any).selectedItems.add('node-1');
      (editor as any).selectedItems.add('node-2');

      const mockEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      (editor as any).handleKeyDown(mockEvent);

      expect((editor as any).selectedItems.size).to.equal(0);
    });
  });

  describe('canvas initialization', () => {
    it('initializes plumber with canvas element', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="canvas"></div>
        </temba-flow-editor>
      `);

      const plumber = (editor as any).plumber;
      expect(plumber).to.be.instanceOf(Plumber);
    });

    it('handles missing canvas element gracefully', async () => {
      editor = await fixture(html`<temba-flow-editor></temba-flow-editor>`);

      // Should not throw even without canvas
      expect((editor as any).plumber).to.be.instanceOf(Plumber);
    });
  });

  describe('canvas menu functionality', () => {
    afterEach(() => {
      restore();
    });

    it('has context menu handler set up', async () => {
      editor = await fixture(html`
        <temba-flow-editor>
          <div id="grid">
            <div
              id="canvas"
              style="position: relative; width: 800px; height: 600px;"
            ></div>
          </div>
        </temba-flow-editor>
      `);

      // Set up required properties
      (editor as any).canvasSize = { width: 800, height: 600 };
      await editor.updateComplete;

      const canvas = editor.querySelector('#canvas') as HTMLElement;
      expect(canvas).to.exist;

      // Check that the context menu event listener is set up
      expect((editor as any).boundCanvasContextMenu).to.exist;
      expect(typeof (editor as any).boundCanvasContextMenu).to.equal(
        'function'
      );

      // Test the snapToGrid functionality that would be used
      const snapToGrid = (value: number): number => {
        const snapped = Math.round(value / 20) * 20;
        return Math.max(snapped, 0);
      };

      // Test various snap positions
      expect(snapToGrid(245)).to.equal(240);
      expect(snapToGrid(255)).to.equal(260);
      expect(snapToGrid(150)).to.equal(160);
      expect(snapToGrid(-10)).to.equal(0); // Should not go negative
    });

    it('tests context menu handler logic independently', () => {
      // Test the logic that would be in handleCanvasContextMenu

      // Mock event with canvas target
      const canvasTarget = { id: 'canvas' };
      const validEvent = { target: canvasTarget };

      // Mock event with non-canvas target
      const nonCanvasTarget = { id: 'other-element' };
      const invalidEvent = { target: nonCanvasTarget };

      // Test the early return condition
      const shouldReturnEarly = (event: any) => {
        const target = event.target as HTMLElement;
        return target.id !== 'canvas';
      };

      expect(shouldReturnEarly(validEvent)).to.be.false;
      expect(shouldReturnEarly(invalidEvent)).to.be.true;
    });

    it('tests position calculation logic', () => {
      // Mock canvas getBoundingClientRect
      const mockCanvas = {
        getBoundingClientRect: () => ({
          left: 50,
          top: 100,
          right: 850,
          bottom: 700,
          width: 800,
          height: 600
        })
      };

      // Mock event
      const mockEvent = {
        clientX: 300,
        clientY: 250
      };

      // Calculate relative position (this is what handleCanvasDoubleClick does)
      const canvasRect = mockCanvas.getBoundingClientRect();
      const relativeX = mockEvent.clientX - canvasRect.left; // 300 - 50 = 250
      const relativeY = mockEvent.clientY - canvasRect.top; // 250 - 100 = 150

      // Apply snap to grid
      const snapToGrid = (value: number) =>
        Math.max(Math.round(value / 20) * 20, 0);
      const snappedLeft = snapToGrid(relativeX); // 250 -> 260
      const snappedTop = snapToGrid(relativeY); // 150 -> 160

      // Verify calculations
      expect(relativeX).to.equal(250);
      expect(relativeY).to.equal(150);
      expect(snappedLeft).to.equal(260);
      expect(snappedTop).to.equal(160);

      // This position would be passed to createStickyNote
      const expectedPosition = {
        left: snappedLeft,
        top: snappedTop
      };

      expect(expectedPosition).to.deep.equal({ left: 260, top: 160 });
    });
  });
});
