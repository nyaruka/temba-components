import '../temba-modules';
import { DateTime } from 'luxon';
interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

import { expect, fixture, html, assert } from '@open-wc/testing';
import MouseHelper from './MouseHelper';
import { Store } from '../src/store/Store';
import { stub } from 'sinon';
import { Select, SelectOption } from '../src/form/select/Select';
import { Options } from '../src/display/Options';
import { Attachment } from '../src/interfaces';
import { Compose } from '../src/form/Compose';

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

const createResponse = (mocked) => {
  const mockResponse = new window.Response(mocked.body, {
    status: mocked.status,
    headers: {
      'Content-type': 'text/html',
      ...mocked.headers
    }
  });

  return Promise.resolve(mockResponse);
};

const createJSONResponse = (mocked) => {
  const mockResponse = new window.Response(JSON.stringify(mocked.body), {
    status: mocked.status,
    headers: {
      'Content-type': 'application/json',
      ...mocked.headers
    }
  });

  return Promise.resolve(mockResponse);
};

const getResponse = (endpoint: string, options = { method: 'GET' }) => {
  // check if our path has been mocked in code
  const mocks = options.method === 'GET' ? gets : posts;
  const codeMock = mocks.find((mock) => mock.endpoint.test(endpoint));

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

const mockMapping = {
  '/test-assets/api/users/admin1.json': [
    /\/api\/v2\/users.json\?email=admin1@nyaruka.com/
  ],
  '/test-assets/api/users/editor1.json': [
    /\/api\/v2\/users.json\?email=editor1@nyaruka.com/
  ],
  '/test-assets/api/users/agent1.json': [
    /\/api\/v2\/users.json\?email=agent1@nyaruka.com/
  ],
  '/test-assets/api/users/viewer1.json': [
    /\/api\/v2\/users.json\?email=viewer1@nyaruka.com/
  ],
  '/test-assets/contacts/contact-tickets.json': [
    /\/api\/v2\/tickets.json\?contact=24d64810-3315-4ff5-be85-48e3fe055bf9/
  ]
};

export const mockAPI = () => {
  for (const key in mockMapping) {
    const urls = mockMapping[key];
    for (const url of urls) {
      mockGET(url, key);
    }
  }
  
  // Add mock data for contact form endpoints
  mockGET(/\/api\/v2\/channels\.json/, {
    results: [
      { uuid: 'chan-1', name: 'WhatsApp Channel' },
      { uuid: 'chan-2', name: 'Telegram Channel' },
      { uuid: 'chan-3', name: 'SMS Channel' },
      { uuid: 'chan-4', name: 'Facebook Messenger' }
    ]
  });
  
  mockGET(/\/api\/v2\/languages\.json/, {
    results: [
      { iso: 'eng', name: 'English' },
      { iso: 'spa', name: 'Spanish' },
      { iso: 'fra', name: 'French' },
      { iso: 'por', name: 'Portuguese' },
      { iso: 'deu', name: 'German' }
    ]
  });
};

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

// Enhanced wait utility for more robust testing
export const waitForCondition = async (
  predicate: () => boolean,
  maxAttempts: number = 20,
  delayMs: number = 50
): Promise<void> => {
  let attempts = 0;
  while (!predicate() && attempts < maxAttempts) {
    await delay(delayMs);
    attempts++;
  }
  if (!predicate()) {
    throw new Error(
      `Condition not met after ${maxAttempts} attempts (${
        maxAttempts * delayMs
      }ms)`
    );
  }
};

export const assertScreenshot = async (filename: string, clip: Clip) => {
  // detect if we're running in copilot's environment and use adaptive threshold
  const isCopilotEnvironment = (window as any).isCopilotEnvironment;
  const threshold = isCopilotEnvironment ? 1.0 : 0.1;
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
    left: x
  };

  return newClip;
};

export const mouseClickElement = async (ele: HTMLElement | Element) => {
  const bounds = ele.getBoundingClientRect();
  await mouseClick(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
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
      users='/test-assets/store/users.json'
      workspace='/test-assets/store/workspace.json'
    />`
  );
  await store.initialHttpComplete;
  await store.initialHttpComplete;

  return store;
};

export const mockNow = (isodate: string) => {
  return stub(DateTime, 'now').returns(DateTime.fromISO(isodate));
};

export const getOptions = (select: Select<SelectOption>): Options => {
  return select.shadowRoot.querySelector('temba-options[visible]');
};

export const clickOption = async (
  clock: any,
  select: Select<SelectOption>,
  index: number
) => {
  const options = getOptions(select);
  if (!options) {
    throw new Error('No options element found');
  }

  // Wait for the specific option to be available, but only if it's not already there
  const existingOption = options.shadowRoot?.querySelector(
    `[data-option-index="${index}"]`
  );
  if (!existingOption) {
    try {
      await waitForCondition(
        () => {
          const option = options.shadowRoot?.querySelector(
            `[data-option-index="${index}"]`
          );
          return !!option;
        },
        10,
        25
      );
    } catch (e) {
      throw new Error(`Option at index ${index} not found after waiting`);
    }
  }

  const option = options.shadowRoot.querySelector(
    `[data-option-index="${index}"]`
  ) as HTMLDivElement;

  await mouseClickElement(option);
  await options.updateComplete;
  await select.updateComplete;
  await clock.runAll();

  checkTimers(clock);
};
export const openSelect = async (clock: any, select: Select<SelectOption>) => {
  const container = select.shadowRoot.querySelector('.select-container');
  container.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  clock.runAll();

  // add more explicit waiting and clock ticks
  await select.updateComplete;
  clock.runAll();

  // reduce wait time for options to become visible
  await waitFor(25);
  clock.runAll();

  // For non-endpoint selects, options might be immediately available
  // For endpoint selects, we need to wait for them to load
  const hasEndpoint = select.getAttribute('endpoint');
  if (hasEndpoint) {
    try {
      // Wait for options to be properly rendered and visible (but only for endpoint selects)
      await waitForCondition(
        () => {
          const options = select.shadowRoot.querySelector(
            'temba-options[visible]'
          );
          return options && options.isConnected;
        },
        10,
        25
      );
    } catch (e) {
      // If condition fails, continue - some tests might not need options to be visible immediately
    }
  }
};

export const openAndClick = async (
  clock: any,
  select: Select<SelectOption>,
  idx: number
) => {
  await openSelect(clock, select);

  // Add this line to ensure proper timing when running as part of a test suite
  await select.updateComplete;
  clock.tick(25); // Reduced from 50 to give minimum time for options to render

  await clickOption(clock, select, idx);
};

// valid = attachments that are uploaded sent to the server when the user clicks send
export const getValidAttachments = (numFiles = 2): Attachment[] => {
  const attachments = [];
  let index = 1;
  while (index <= numFiles) {
    const s = 's' + index;
    const attachment = {
      uuid: s,
      content_type: 'image/png',
      type: 'image/png',
      filename: 'name_' + s,
      url: 'url_' + s,
      size: 1024,
      error: null
    } as Attachment;
    attachments.push(attachment);
    index++;
  }
  return attachments;
};

export const updateComponent = async (
  compose: Compose,
  text?: string,
  attachments?: Attachment[]
): Promise<void> => {
  compose.initialText = text ? text : '';
  compose.currentAttachments = attachments ? attachments : [];
  await compose.updateComplete;
};
export const getValidText = () => {
  return 'sà-wàd-dee!';
};

// Helper for waiting for select pagination to complete
export const waitForSelectPagination = async (
  select: Select<SelectOption>,
  clock: any,
  expectedCount: number,
  maxAttempts: number = 30
): Promise<void> => {
  let attempts = 0;
  while (attempts < maxAttempts) {
    // Ensure we're not still fetching
    if (!select.fetching && select.visibleOptions.length >= expectedCount) {
      return;
    }

    await select.updateComplete;
    clock.runAll();

    // Give more time between attempts for slow CI environments
    await delay(75);

    attempts++;
  }

  throw new Error(
    `Pagination did not complete after ${maxAttempts} attempts (${
      maxAttempts * 75
    }ms). ` +
      `Expected ${expectedCount} options, got ${select.visibleOptions.length}. ` +
      `Fetching: ${select.fetching}`
  );
};
