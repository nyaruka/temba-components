import { fixture, assert, expect } from '@open-wc/testing';
import { StickyNote } from '../src/flow/StickyNote';
import { StickyNote as StickyNoteData } from '../src/store/flow-definition';
import { assertScreenshot, getClip, getComponent, mockGET, mockPOST } from './utils.test';
import { html } from 'lit';
import { stub, restore } from 'sinon';
import { Store } from '../src/store/Store';

// The component should already be registered via temba-modules.ts import,
// but we need to use the correct tag name for testing

describe('StickyNote', () => {
  let stickyNote: StickyNote;

  beforeEach(async () => {
    // Mock the store
    const mockStore = await fixture(html`<temba-store></temba-store>`);
    assert.instanceOf(mockStore, Store);
  });

  afterEach(() => {
    restore();
  });

  describe('component creation', () => {
    it('creates render root as element itself', () => {
      const stickyNote = new StickyNote();
      expect(stickyNote.createRenderRoot()).to.equal(stickyNote);
    });
  });

  describe('rendering', () => {
    it('renders a yellow sticky note with title and body', async () => {
      const testData: StickyNoteData = {
        position: { left: 100, top: 200 },
        title: 'Test Title',
        body: 'Test body content',
        color: 'yellow'
      };

      const component = document.createElement('temba-sticky-note') as StickyNote;
      component.uuid = 'test-uuid';
      component.data = testData;
      
      document.body.appendChild(component);
      await component.updateComplete;

      assert.instanceOf(component, StickyNote);
      
      const stickyElement = component.querySelector('.sticky-note');
      assert.exists(stickyElement);
      assert.isTrue(stickyElement.classList.contains('yellow'));
      
      const titleElement = component.querySelector('.sticky-title');
      assert.exists(titleElement);
      expect(titleElement.textContent).to.equal('Test Title');
      
      const bodyElement = component.querySelector('.sticky-body');
      assert.exists(bodyElement);
      expect(bodyElement.textContent).to.equal('Test body content');

      await assertScreenshot('sticky-note/yellow', { x: 0, y: 0, width: 220, height: 150 });
      
      document.body.removeChild(component);
    });

    it('renders different colors correctly', async () => {
      const colors: Array<'yellow' | 'blue' | 'pink' | 'green' | 'gray'> = ['yellow', 'blue', 'pink', 'green', 'gray'];

      for (const color of colors) {
        const testData: StickyNoteData = {
          position: { left: 50, top: 50 },
          title: `${color} note`,
          body: `This is a ${color} sticky note`,
          color: color
        };

        const component = document.createElement('temba-sticky-note') as StickyNote;
        component.uuid = `test-${color}`;
        component.data = testData;
        
        document.body.appendChild(component);
        await component.updateComplete;

        const stickyElement = component.querySelector('.sticky-note');
        assert.exists(stickyElement);
        assert.isTrue(stickyElement.classList.contains(color));

        await assertScreenshot(`sticky-note/${color}`, { x: 0, y: 0, width: 220, height: 150 });
        
        document.body.removeChild(component);
      }
    });

    it('positions the sticky note correctly', async () => {
      const testData: StickyNoteData = {
        position: { left: 300, top: 400 },
        title: 'Positioned Note',
        body: 'This note is positioned',
        color: 'blue'
      };

      const component = document.createElement('temba-sticky-note') as StickyNote;
      component.uuid = 'positioned-uuid';
      component.data = testData;
      
      document.body.appendChild(component);
      await component.updateComplete;

      const stickyElement = component.querySelector('.sticky-note') as HTMLElement;
      assert.exists(stickyElement);
      expect(stickyElement.style.left).to.equal('300px');
      expect(stickyElement.style.top).to.equal('400px');
      
      document.body.removeChild(component);
    });
  });

  describe('inline editing', () => {
    let component: StickyNote;
    let testData: StickyNoteData;

    beforeEach(async () => {
      testData = {
        position: { left: 100, top: 100 },
        title: 'Editable Title',
        body: 'Editable body',
        color: 'green'
      };

      component = document.createElement('temba-sticky-note') as StickyNote;
      component.uuid = 'editable-uuid';
      component.data = testData;
      
      document.body.appendChild(component);
      await component.updateComplete;
    });

    afterEach(() => {
      if (component.parentNode) {
        document.body.removeChild(component);
      }
    });

    it('enables title editing on click', async () => {
      const titleElement = component.querySelector('.sticky-title') as HTMLElement;
      assert.exists(titleElement);
      
      // Initially not editable
      expect(titleElement.getAttribute('contenteditable')).to.equal('false');
      
      // Click to enable editing
      titleElement.click();
      await component.updateComplete;
      
      expect(titleElement.getAttribute('contenteditable')).to.equal('true');
    });

    it('enables body editing on click', async () => {
      const bodyElement = component.querySelector('.sticky-body') as HTMLElement;
      assert.exists(bodyElement);
      
      // Initially not editable
      expect(bodyElement.getAttribute('contenteditable')).to.equal('false');
      
      // Click to enable editing
      bodyElement.click();
      await component.updateComplete;
      
      expect(bodyElement.getAttribute('contenteditable')).to.equal('true');
    });
  });

  describe('keyboard interactions', () => {
    let component: StickyNote;
    let testData: StickyNoteData;

    beforeEach(async () => {
      testData = {
        position: { left: 100, top: 100 },
        title: 'Keyboard Test',
        body: 'Testing keyboard',
        color: 'gray'
      };

      component = document.createElement('temba-sticky-note') as StickyNote;
      component.uuid = 'keyboard-uuid';
      component.data = testData;
      
      document.body.appendChild(component);
      await component.updateComplete;
    });

    afterEach(() => {
      if (component.parentNode) {
        document.body.removeChild(component);
      }
    });

    it('exits editing mode on Enter key', async () => {
      const titleElement = component.querySelector('.sticky-title') as HTMLElement;
      assert.exists(titleElement);
      
      // Start editing
      titleElement.click();
      await component.updateComplete;
      
      expect(titleElement.getAttribute('contenteditable')).to.equal('true');
      
      // Press Enter
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      
      // Mock blur to simulate the Enter key handler calling blur()
      const blurStub = stub(titleElement, 'blur');
      titleElement.dispatchEvent(enterEvent);
      
      expect(enterEvent.defaultPrevented).to.be.true;
      expect(blurStub.calledOnce).to.be.true;
      
      blurStub.restore();
    });

    it('exits editing mode on Escape key', async () => {
      const bodyElement = component.querySelector('.sticky-body') as HTMLElement;
      assert.exists(bodyElement);
      
      // Start editing
      bodyElement.click();
      await component.updateComplete;
      
      expect(bodyElement.getAttribute('contenteditable')).to.equal('true');
      
      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      
      // Mock blur to simulate the Escape key handler calling blur()
      const blurStub = stub(bodyElement, 'blur');
      bodyElement.dispatchEvent(escapeEvent);
      
      expect(blurStub.calledOnce).to.be.true;
      
      blurStub.restore();
    });
  });

  describe('empty state placeholders', () => {
    it('shows placeholder text for empty title and body', async () => {
      const testData: StickyNoteData = {
        position: { left: 100, top: 100 },
        title: '',
        body: '',
        color: 'blue'
      };

      const component = document.createElement('temba-sticky-note') as StickyNote;
      component.uuid = 'empty-uuid';
      component.data = testData;
      
      document.body.appendChild(component);
      await component.updateComplete;

      const titleElement = component.querySelector('.sticky-title') as HTMLElement;
      const bodyElement = component.querySelector('.sticky-body') as HTMLElement;
      
      assert.exists(titleElement);
      assert.exists(bodyElement);
      
      // Empty elements should show placeholder text via CSS ::before
      expect(titleElement.textContent).to.equal('');
      expect(bodyElement.textContent).to.equal('');

      // Take screenshot - create a simple clip since getClip doesn't work with direct DOM elements
      const stickyElement = component.querySelector('.sticky-note') as HTMLElement;
      const rect = stickyElement.getBoundingClientRect();
      const clip = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
      await assertScreenshot('sticky-note/empty-placeholders', clip);
      
      document.body.removeChild(component);
    });
  });
});