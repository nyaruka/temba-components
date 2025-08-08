import { beforeAll, afterAll } from 'vitest'

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
    headers: {
      'Content-Type': 'text/html',
      ...mock.headers
    }
  })
}

const createJSONResponse = (mock: any) => {
  return new Response(JSON.stringify(mock.body), {
    status: parseInt(mock.status),
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
        // Mock points to a file, use original fetch
        return originalFetch(endpoint, options)
      } else {
        return Promise.resolve(createResponse(mock))
      }
    } else {
      return Promise.resolve(createJSONResponse(mock))
    }
  }
  
  // Fall back to original fetch
  return originalFetch(endpoint, options)
}

// Set up browser and fetch mocking
beforeAll(() => {
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