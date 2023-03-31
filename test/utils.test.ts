import '../temba-modules';
import { DateTime } from 'luxon';
interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

import { expect, fixture, html, assert, waitUntil } from '@open-wc/testing';
import MouseHelper from './MouseHelper';
import { Store } from '../src/store/Store';
import { replace, stub } from 'sinon';

export interface CodeMock {
  endpoint: RegExp;
  body: string;
  headers: any;
  status: string;
}

const gets: CodeMock[] = [];
let posts: CodeMock[] = [];
let normalFetch;

export const showMouse = async () => {
  const mouse = await fixture(html`<mouse-helper />`);
  assert.instanceOf(mouse, MouseHelper);
};

export const getAttributes = (attrs: any = {}) => {
  return `${Object.keys(attrs)
    .map((name: string) => {
      if (typeof attrs[name] === 'boolean' && attrs[name]) {
        return name;
      }
      return `${name}='${attrs[name]}'`;
    })
    .join(' ')}`;
};

export const getComponent = async (
  tag,
  attrs: any = {},
  slot = '',
  width = 250,
  height = 0,
  style = ''
) => {
  const spec = `<${tag} ${getAttributes(attrs)}>${slot}</${tag}>`;
  const parentNode = document.createElement('div');
  const styleAttribute = `
    ${width > 0 ? `width:${width}px;` : ``} 
    ${height > 0 ? `height:${height}px;` : ``}
    ${style ? style : ``}
  `;
  parentNode.setAttribute('style', styleAttribute);
  return await fixture(spec, { parentNode });
};

const createResponse = mocked => {
  const mockResponse = new window.Response(mocked.body, {
    status: mocked.status,
    headers: {
      'Content-type': 'text/html',
      ...mocked.headers,
    },
  });

  return Promise.resolve(mockResponse);
};

const createJSONResponse = mocked => {
  const mockResponse = new window.Response(JSON.stringify(mocked.body), {
    status: mocked.status,
    headers: {
      'Content-type': 'application/json',
      ...mocked.headers,
    },
  });

  return Promise.resolve(mockResponse);
};

const getResponse = (endpoint: string, options) => {
  // check if our path has been mocked in code
  const mocks = options.method === 'GET' ? gets : posts;
  const codeMock = mocks.find(mock => mock.endpoint.test(endpoint));

  if (codeMock) {
    if (typeof codeMock.body === 'string') {
      // see if we are being mocked to a file
      if (codeMock.body.startsWith('/')) {
        endpoint = codeMock.body;
      } else {
        return createResponse(codeMock);
      }
    } else {
      return createJSONResponse(codeMock);
    }
  }

  // otherwise fetch over http
  return normalFetch(endpoint, options);
};

before(async () => {
  normalFetch = window.fetch;
  stub(window, 'fetch').callsFake(getResponse);
  await setViewport({ width: 1024, height: 768, deviceScaleFactor: 2 });
});

after(() => {
  (window.fetch as any).restore();
});

export const mockGET = (
  endpoint: RegExp,
  body: any,
  headers: any = {},
  status = '200'
) => {
  gets.push({ endpoint, body, headers, status });
};

export const mockPOST = (
  endpoint: RegExp,
  body: any,
  headers: any = {},
  status = '200'
) => {
  posts.push({ endpoint, body, headers, status });
};

export const clearMockPosts = () => {
  posts = [];
};

export const checkTimers = (clock: any) => {
  expect(!!clock.timers).to.equal(true, 'Expected timers not found');
  expect(
    Object.keys(clock.timers).length,
    `Timers still to be run ${JSON.stringify(clock.timers)}`
  ).to.equal(0);
};

export const delay = (millis: number) => {
  return new Promise(function (resolve) {
    window.setTimeout(resolve, millis);
  });
};

export const assertScreenshot = async (
  filename: string,
  clip: Clip,
  waitFor?: { clock?: any; predicate?: () => boolean }
) => {
  if (waitFor) {
    if (waitFor.clock) {
      waitFor.clock.restore();
    }
    await waitUntil(waitFor.predicate);
  }

  const threshold = 0.1;
  const exclude: Clip[] = [];

  try {
    await (window as any).matchPageSnapshot(
      `${filename}.png`,
      clip,
      exclude,
      threshold
    );
  } catch (error) {
    if (error.message) {
      throw new Error(
        `${error.message} ${
          error.expected
            ? `Expected ${error.expected} but got ${error.actual}`
            : ''
        } ${error.files ? `\n${error.files.join('\n')}` : ''}`
      );
    }
    throw new Error(error);
  }
};

export const getClip = (ele: HTMLElement) => {
  let clip: any = ele.getBoundingClientRect();
  if (!clip.width || !clip.height) {
    clip = ele.shadowRoot.firstElementChild.getBoundingClientRect();
  }

  const padding = 10;
  const width = clip.width + padding * 2;
  const height = clip.height + padding * 2;
  const y = clip.y - padding;
  const x = clip.x - padding;

  const newClip = {
    x,
    y,
    width,
    height,
    bottom: y + height,
    right: x + width,
    top: y,
    left: x,
  };

  return newClip;
};

export const getHTMLAttrs = (attrs: any = {}) => {
  return Object.keys(attrs)
    .map((name: string) => `${name}='${attrs[name]}'`)
    .join(' ');
};

export const getHTML = (tag: string, attrs: any = {}) => {
  return `<${tag} ${getHTMLAttrs(attrs)}></${tag}>`;
};

export const loadStore = async () => {
  const store: Store = await fixture(
    `<temba-store 
      completion='/test-assets/store/editor.json'
      groups='/test-assets/store/groups.json'
      languages='/test-assets/store/languages.json'
      fields='/test-assets/store/fields.json'
    />`
  );
  await store.initialHttpComplete;
  await store.initialHttpComplete;

  return store;
};

export const mockNow = (isodate: string) => {
  const now = DateTime.fromISO(isodate);
  // mock the current time
  replace(DateTime, 'now', () => {
    return now;
  });
};
