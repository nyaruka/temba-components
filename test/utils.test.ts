import '../temba-modules';

interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

import { stub } from 'sinon';
import { expect, fixture } from '@open-wc/testing';

export interface CodeMock {
  endpoint: RegExp;
  body: string;
  headers: any;
}

const gets: CodeMock[] = [];
const posts: CodeMock[] = [];
let normalFetch;

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
  style = ''
) => {
  const spec = `<${tag} ${getAttributes(attrs)}>${slot}</${tag}>`;

  if (width > 0 || style) {
    const parentNode = document.createElement('div');
    if (width > 0) {
      parentNode.setAttribute('style', `width: ${width}px;${style}`);
    } else {
      parentNode.setAttribute('style', `${style}`);
    }
    return await fixture(spec, { parentNode });
  }

  return await fixture(spec);
};

const createResponse = mocked => {
  const mockResponse = new window.Response(mocked.body, {
    status: 200,
    headers: {
      'Content-type': 'text/html',
      ...mocked.headers,
    },
  });

  return Promise.resolve(mockResponse);
};

const createJSONResponse = mocked => {
  const mockResponse = new window.Response(JSON.stringify(mocked.body), {
    status: 200,
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

export const mockGET = (endpoint: RegExp, body: any, headers: {} = {}) => {
  gets.push({ endpoint, body, headers });
};

export const mockPOST = (endpoint: RegExp, body: any, headers: {} = {}) => {
  posts.push({ endpoint, body, headers });
};

export const checkTimers = (clock: any) => {
  expect(
    Object.keys(clock.timers).length,
    `Timers still to be run ${JSON.stringify(clock.timers)}`
  ).to.equal(0);
};

export const delay = (millis: number) => {
  return new Promise(function (resolve) {
    setTimeout(resolve, millis);
  });
};

export const assertScreenshot = async (
  filename: string,
  clip: Clip,
  threshold = 0.1,
  exclude: Clip[] = []
) => {
  // const screenShotsEnabled = !!__karma__.config.args.find(
  // (option: string) => option === '--screenshots'
  // );

  // await (window as any).waitFor(300);

  // console.log((window as any).watched);
  if ((window as any).watched) {
    // return;
  }

  const mochaUI = document.querySelector('#mocha');
  mochaUI.classList.add('screenshots');

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
  } finally {
    mochaUI.classList.remove('screenshots');
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
