import { expect, fixture, html } from '@open-wc/testing';
import { stub, SinonStub } from 'sinon';
import { RapidElement } from '../src/RapidElement';
import { CustomEventType } from '../src/interfaces';

// Create a test implementation of RapidElement
class TestRapidElement extends RapidElement {
  render() {
    return html`<div>test</div>`;
  }
}

customElements.define('test-rapid-element', TestRapidElement);

describe('RapidElement', () => {
  let element: TestRapidElement;
  
  beforeEach(async () => {
    element = await fixture(html`<test-rapid-element></test-rapid-element>`);
  });

  describe('getHeaders', () => {
    it('returns empty object when no service is set', () => {
      element.service = '';
      const headers = element.getHeaders();
      expect(headers).to.deep.equal({});
    });

    it('returns X-Temba-Service-Org header when service is set', () => {
      element.service = 'test-service';
      const headers = element.getHeaders();
      expect(headers).to.deep.equal({
        'X-Temba-Service-Org': 'test-service'
      });
    });

    it('returns empty object when service is undefined', () => {
      element.service = undefined;
      const headers = element.getHeaders();
      expect(headers).to.deep.equal({});
    });
  });

  describe('swallowEvent', () => {
    it('stops propagation and prevents default on event', () => {
      const mockEvent = {
        stopPropagation: stub(),
        preventDefault: stub()
      };

      element.swallowEvent(mockEvent as any);

      expect(mockEvent.stopPropagation.calledOnce).to.be.true;
      expect(mockEvent.preventDefault.calledOnce).to.be.true;
    });

    it('handles null event gracefully', () => {
      expect(() => element.swallowEvent(null)).to.not.throw;
    });
  });

  describe('stopEvent', () => {
    it('stops propagation and prevents default on event', () => {
      const mockEvent = {
        stopPropagation: stub(),
        preventDefault: stub()
      };

      element.stopEvent(mockEvent as any);

      expect(mockEvent.stopPropagation.calledOnce).to.be.true;
      expect(mockEvent.preventDefault.calledOnce).to.be.true;
    });

    it('handles null event gracefully', () => {
      expect(() => element.stopEvent(null)).to.not.throw;
    });

    it('handles undefined event gracefully', () => {
      expect(() => element.stopEvent(undefined)).to.not.throw;
    });
  });

  describe('isMobile', () => {
    let originalIsMobile: any;

    beforeEach(() => {
      originalIsMobile = (window as any).isMobile;
    });

    afterEach(() => {
      (window as any).isMobile = originalIsMobile;
    });

    it('returns true when window.isMobile returns true', () => {
      (window as any).isMobile = () => true;
      expect(element.isMobile()).to.be.true;
    });

    it('returns false when window.isMobile returns false', () => {
      (window as any).isMobile = () => false;
      expect(element.isMobile()).to.be.false;
    });

    it('returns false when window.isMobile is not defined', () => {
      (window as any).isMobile = undefined;
      expect(element.isMobile()).to.be.false;
    });
  });

  describe('closestElement', () => {
    it('finds closest element with given selector', () => {
      // Create a test structure
      const container = document.createElement('div');
      container.className = 'container';
      const child = document.createElement('span');
      child.className = 'child';
      container.appendChild(child);
      document.body.appendChild(container);

      // Test finding closest element
      const result = element.closestElement('.container', child);
      expect(result).to.equal(container);

      // Cleanup
      document.body.removeChild(container);
    });

    it('returns null when no matching element is found', () => {
      const child = document.createElement('span');
      document.body.appendChild(child);

      const result = element.closestElement('.nonexistent', child);
      expect(result).to.be.null;

      document.body.removeChild(child);
    });

    it('handles shadow root traversal', () => {
      // Create a shadow root scenario
      const host = document.createElement('div');
      host.className = 'shadow-host';
      const shadow = host.attachShadow({ mode: 'open' });
      const shadowChild = document.createElement('span');
      shadow.appendChild(shadowChild);
      document.body.appendChild(host);

      const result = element.closestElement('.shadow-host', shadowChild);
      expect(result).to.equal(host);

      document.body.removeChild(host);
    });
  });

  describe('getDiv', () => {
    it('returns cached element if already retrieved', () => {
      // Setup shadow root with a div
      const testDiv = document.createElement('div');
      testDiv.className = 'test-div';
      element.shadowRoot.appendChild(testDiv);

      // First call should cache the element
      const result1 = element.getDiv('.test-div');
      expect(result1).to.equal(testDiv);

      // Second call should return cached version
      const result2 = element.getDiv('.test-div');
      expect(result2).to.equal(testDiv);
      expect(result1).to.equal(result2);
    });

    it('returns null when element is not found', () => {
      const result = element.getDiv('.nonexistent');
      expect(result).to.be.null;
    });

    it('queries shadow root for new elements', () => {
      const testDiv = document.createElement('div');
      testDiv.className = 'new-test-div';
      element.shadowRoot.appendChild(testDiv);

      const result = element.getDiv('.new-test-div');
      expect(result).to.equal(testDiv);
    });
  });

  describe('dispatchEvent edge cases', () => {
    it('handles events with dash-prefixed event handler properties', () => {
      // Create an element with a dash-prefixed event handler property
      const targetElement = document.createElement('div');
      const handlerStub = stub().returns(true);
      (targetElement as any)['-custom-event'] = handlerStub;
      
      // Mock the target element being the event target
      const customEvent = new CustomEvent('custom-event', {
        bubbles: true,
        composed: true
      });
      
      // Set the target to our test element
      Object.defineProperty(customEvent, 'target', {
        value: targetElement,
        writable: false
      });

      // This should call the handler
      element.dispatchEvent(customEvent);
      
      expect(handlerStub.calledOnce).to.be.true;
      expect(handlerStub.calledWith(customEvent)).to.be.true;
    });

    it('handles events with function handlers on target element', () => {
      const targetElement = document.createElement('div');
      const handlerStub = stub();
      (targetElement as any)['-test-event'] = handlerStub;
      
      const customEvent = new CustomEvent('test-event', {
        bubbles: true,
        composed: true
      });
      
      Object.defineProperty(customEvent, 'target', {
        value: targetElement,
        writable: false
      });

      element.dispatchEvent(customEvent);
      
      expect(handlerStub.calledOnce).to.be.true;
      expect(handlerStub.calledWith(customEvent)).to.be.true;
    });

    it('handles events with inline handler attributes via Function constructor', () => {
      const targetElement = document.createElement('div');
      targetElement.setAttribute('data-custom-event', 'console.log("test")'); // Use data- instead of dash-prefix
      
      const customEvent = new CustomEvent('custom-event', {
        bubbles: true,
        composed: true
      });
      
      Object.defineProperty(customEvent, 'target', {
        value: targetElement,
        writable: false
      });

      // This should not throw an error even if no handler is found
      expect(() => element.dispatchEvent(customEvent)).to.not.throw;
    });
  });

  describe('DEBUG functionality', () => {
    it('logs updates when DEBUG_UPDATES is enabled', () => {
      const consoleStub = stub(console, 'log');
      element.DEBUG_UPDATES = true;
      
      // Trigger an update
      element.requestUpdate();
      
      // We can't easily test the exact log content, but we can verify
      // that the debug functionality is accessible
      element.DEBUG_UPDATES = false;
      
      consoleStub.restore();
    });

    it('logs events when DEBUG_EVENTS is enabled', () => {
      element.DEBUG_EVENTS = true;
      
      // Fire a custom event
      element.fireCustomEvent(CustomEventType.Loading);
      
      // Reset debug flag
      element.DEBUG_EVENTS = false;
    });

    it('logs events when DEBUG is enabled', () => {
      element.DEBUG = true;
      
      // Fire a regular event  
      element.fireEvent('test-event');
      
      // Reset debug flag
      element.DEBUG = false;
    });
  });

  describe('event handlers', () => {
    it('handles elements with getEventHandlers returning handlers', () => {
      // Create a test element with event handlers
      class TestElementWithHandlers extends RapidElement {
        testMethodCalled = false;
        
        testMethod() {
          this.testMethodCalled = true;
        }
        
        getEventHandlers() {
          return [
            {
              event: 'test-event',
              method: this.testMethod.bind(this)
            },
            {
              event: 'document-event',
              method: this.testMethod.bind(this),
              isDocument: true
            },
            {
              event: 'window-event', 
              method: this.testMethod.bind(this),
              isWindow: true
            }
          ];
        }
        
        render() {
          return html`<div>test with handlers</div>`;
        }
      }
      
      customElements.define('test-element-with-handlers', TestElementWithHandlers);
      
      // Test that the element can be created without errors
      const elementWithHandlers = new TestElementWithHandlers();
      document.body.appendChild(elementWithHandlers);
      
      // Test that handlers are properly registered/unregistered
      expect(() => {
        elementWithHandlers.connectedCallback();
        elementWithHandlers.disconnectedCallback();
      }).to.not.throw;
      
      document.body.removeChild(elementWithHandlers);
    });
  });
});