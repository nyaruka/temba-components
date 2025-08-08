import { beforeAll, afterAll, expect, vi } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Set up Chai matchers for Vitest spies (since we're using @open-wc/testing with Chai)
const setupChaiMatchers = () => {
  // Access global chai if available
  const chai = (globalThis as any).chai;
  if (chai) {
    chai.use(function (chai: any, utils: any) {
      chai.Assertion.addMethod('toHaveBeenCalled', function () {
        const spy = this._obj;
        const hasBeenCalled = spy.mock && spy.mock.calls.length > 0;
        this.assert(
          hasBeenCalled,
          'expected spy to have been called',
          'expected spy not to have been called'
        );
      });

      chai.Assertion.addMethod('toHaveBeenCalledWith', function (...args: any[]) {
        const spy = this._obj;
        const hasBeenCalledWith = spy.mock && spy.mock.calls.some((call: any[]) => 
          call.length === args.length && call.every((arg: any, i: number) => 
            JSON.stringify(arg) === JSON.stringify(args[i])
          )
        );
        this.assert(
          hasBeenCalledWith,
          `expected spy to have been called with ${JSON.stringify(args)}`,
          `expected spy not to have been called with ${JSON.stringify(args)}`
        );
      });

      chai.Assertion.addMethod('toHaveBeenCalledTimes', function (times: number) {
        const spy = this._obj;
        const callCount = spy.mock ? spy.mock.calls.length : 0;
        this.assert(
          callCount === times,
          `expected spy to have been called ${times} times but was called ${callCount} times`,
          `expected spy not to have been called ${times} times`
        );
      });
    });
  }
};

// Global browser function stubs for non-browser environment
declare global {
  var click: (selector: string) => Promise<void>
  var typeInto: (selector: string, text: string, replace?: boolean, enter?: boolean) => Promise<void>
  var pressKey: (key: string, times?: number, options?: any) => Promise<void>
  var type: (text: string) => Promise<void>
  var mouseClick: (x: number, y: number) => Promise<void>
  var moveMouse: (x: number, y: number) => Promise<void>
  var waitFor: (millis: number) => Promise<void>
  var setViewport: (options: any) => Promise<void>
  var stub: any // Add global stub for compatibility
}

// Mock fetch setup for API testing
let originalFetch: typeof fetch
const mockGets: Array<{endpoint: RegExp, body: any, headers: any, status: string}> = []
const mockPosts: Array<{endpoint: RegExp, body: any, headers: any, status: string}> = []

export const mockGET = (endpoint: RegExp, body: any, headers: any = {}, status = '200') => {
  mockGets.push({ endpoint, body, headers, status })
}

export const mockPOST = (endpoint: RegExp, body: any, headers: any = {}, status = '200') => {
  mockPosts.push({ endpoint, body, headers, status })
}

export const clearMockPosts = () => {
  mockPosts.length = 0
}

// Basic mock response creation
const createResponse = (mock: any) => {
  return new Response(mock.body, {
    status: parseInt(mock.status),
    statusText: mock.status === '200' ? 'OK' : 'Error',
    headers: {
      'Content-Type': 'text/html',
      ...mock.headers
    }
  })
}

const createJSONResponse = (mock: any) => {
  return new Response(JSON.stringify(mock.body), {
    status: parseInt(mock.status),
    statusText: mock.status === '200' ? 'OK' : 'Error',
    headers: {
      'Content-Type': 'application/json',
      ...mock.headers
    }
  })
}

const getResponse = (endpoint: string, options = { method: 'GET' }) => {
  const mocks = options.method === 'GET' ? mockGets : mockPosts
  const mock = mocks.find(m => m.endpoint.test(endpoint))
  
  if (mock) {
    if (typeof mock.body === 'string') {
      if (mock.body.startsWith('/')) {
        // Mock points to a file, read from filesystem
        const filePath = resolve(process.cwd(), mock.body.substring(1))
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8')
          return Promise.resolve(new Response(content, {
            status: 200,
            headers: {
              'Content-Type': mock.body.endsWith('.json') ? 'application/json' : 'text/html',
              ...mock.headers
            }
          }))
        } else {
          return Promise.reject(new Error(`File not found: ${filePath}`))
        }
      } else {
        return Promise.resolve(createResponse(mock))
      }
    } else {
      return Promise.resolve(createJSONResponse(mock))
    }
  }
  
  // Handle test-assets directly by reading from filesystem
  if (endpoint.startsWith('/test-assets/') || endpoint.startsWith('http://localhost:3000/test-assets/')) {
    const path = endpoint.replace('http://localhost:3000', '').substring(1)
    const filePath = resolve(process.cwd(), path)
    
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8')
      return Promise.resolve(new Response(content, {
        status: 200,
        headers: {
          'Content-Type': path.endsWith('.json') ? 'application/json' : 'text/html'
        }
      }))
    } else {
      return Promise.reject(new Error(`File not found: ${filePath}`))
    }
  }
  
  // For test environment, don't allow actual network requests - simulate network errors instead
  return Promise.reject(new Error(`Network error: ${endpoint}`))
}

// Set up browser and fetch mocking
beforeAll(() => {
  // Set up Chai matchers
  setupChaiMatchers();
  
  // Mock browser interaction functions
  if (typeof globalThis !== 'undefined') {
    globalThis.click = async (selector: string) => {
      console.log(`Mock click: ${selector}`)
      // For now just simulate
    }
    
    globalThis.typeInto = async (selector: string, text: string, replace?: boolean, enter?: boolean) => {
      console.log(`Mock typeInto: ${selector} = "${text}"`)
      // For now just simulate
    }
    
    globalThis.pressKey = async (key: string, times: number = 1, options?: any) => {
      console.log(`Mock pressKey: ${key} ${times} times`)
      // For now just simulate
    }
    
    globalThis.type = async (text: string) => {
      console.log(`Mock type: "${text}"`)
      // For now just simulate
    }
    
    globalThis.mouseClick = async (x: number, y: number) => {
      console.log(`Mock mouseClick: (${x}, ${y})`)
      // For now just simulate
    }
    
    globalThis.moveMouse = async (x: number, y: number) => {
      console.log(`Mock moveMouse: (${x}, ${y})`)
      // For now just simulate
    }
    
    globalThis.waitFor = async (millis: number) => {
      return new Promise(resolve => setTimeout(resolve, millis))
    }
    
    globalThis.setViewport = async (options: any) => {
      console.log(`Mock setViewport:`, options)
      // For now just simulate
    }
    
    // Add global stub function for compatibility with legacy tests
    globalThis.stub = (...args: any[]) => {
      if (args.length === 0) {
        return vi.fn()
      } else if (args.length === 2) {
        // stub(object, methodName) syntax
        return vi.spyOn(args[0], args[1])
      } else {
        // Fallback to simple mock
        return vi.fn()
      }
    }
    
    // Set up fetch mocking
    if (globalThis.fetch) {
      originalFetch = globalThis.fetch
      globalThis.fetch = getResponse as any
    }
  }
})

afterAll(() => {
  if (typeof globalThis !== 'undefined' && originalFetch) {
    globalThis.fetch = originalFetch
  }
})