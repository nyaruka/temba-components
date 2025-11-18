/* eslint-disable @typescript-eslint/no-this-alias */
import { html, TemplateResult } from 'lit-html';
import { Button } from './display/Button';
import { Dialog } from './layout/Dialog';
import { Attachment, ContactField, Shortcut, Ticket, User } from './interfaces';
import ColorHash from 'color-hash';
import { Toast } from './display/Toast';
import { v4 as generateUUID } from 'uuid';

export const DEFAULT_MEDIA_ENDPOINT = '/api/v2/media.json';

export const colorHash = new ColorHash();

export type Asset = KeyedAsset & Ticket & ContactField & Shortcut;

export const DATE_FORMAT =
  /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;

interface KeyedAsset {
  key?: string;
}

interface AssetPage {
  assets: Asset[];
  next: string;
}

export interface ResultsPage {
  results: any[];
  next: string;
}

export enum Color {
  BLUE = 'color:#5078b5;',
  GREEN = 'color:#62bd6a;',
  RED = 'color:#e36049;',
  PURPLE = 'color:#a626a4;'
}

export const log = (message: string | object, styling = '', details = []) => {
  if (styling === '') {
    // eslint-disable-next-line no-console
    console.log(message);
    return;
  }

  if (typeof message === 'object') {
    // eslint-disable-next-line no-console
    console.log('%c' + JSON.stringify(message, null, 2), styling);
    return;
  }
  // eslint-disable-next-line no-console
  console.log('%c' + message, styling, ...details);
};

/** Get the value for a named cookie */
export const getHTTPCookie = (name: string): string => {
  for (const cookie of document.cookie.split(';')) {
    const idx = cookie.indexOf('=');
    let key = cookie.substr(0, idx);
    let value = cookie.substr(idx + 1);

    // no spaces allowed
    key = key.trim();
    value = value.trim();

    if (key === name) {
      return value;
    }
  }
  return null;
};

export const getHeaders = (headers: any = {}) => {
  let csrf = getHTTPCookie('csrftoken');
  if (!csrf) {
    const tokenEle = document.querySelector(
      '[name=csrfmiddlewaretoken]'
    ) as HTMLInputElement;
    if (tokenEle) {
      csrf = tokenEle.value;
    }
  }

  const fetchHeaders: any = csrf ? { 'X-CSRFToken': csrf } : {};

  // include the current org id
  const org_id = (window as any).org_id;
  if (org_id) {
    fetchHeaders['X-Temba-Org'] = org_id;
  }

  // mark us as ajax
  fetchHeaders['X-Requested-With'] = 'XMLHttpRequest';

  Object.keys(headers).forEach((key) => {
    // if we are adding a service org, we omit temba-org
    if (key === 'X-Temba-Service-Org') {
      delete fetchHeaders['X-Temba-Org'];
    }

    fetchHeaders[key] = headers[key];
  });
  return fetchHeaders;
};

export const getUrl = (
  url: string,
  controller: AbortController = null,
  headers: { [key: string]: string } = {}
): Promise<WebResponse> => {
  return new Promise<WebResponse>((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: getHeaders(headers)
    };

    if (controller) {
      options['signal'] = controller.signal;
    }

    fetch(url, options)
      .then((response) => {
        if (response.status < 200 || response.status >= 300) {
          reject(response);
          return;
        }

        response.text().then((body: string) => {
          let json = {};
          try {
            json = JSON.parse(body);
            // eslint-disable-next-line no-empty
          } catch (err) {}
          resolve({
            controller,
            body,
            json,
            url: response.url,
            headers: response.headers,
            status: response.status
          });
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export type ClassMap = {
  [className: string]: boolean;
};

export const getClasses = (map: ClassMap): string => {
  const classNames: string[] = [];
  Object.keys(map).forEach((className: string) => {
    if (map[className]) {
      classNames.push(className);
    }
  });

  let result = classNames.join(' ');
  if (result.trim().length > 0) {
    result = ' ' + result;
  }
  return result.trim();
};

export const fetchResultsPage = (
  url: string,
  controller: AbortController = null,
  headers: { [key: string]: string } = {}
): Promise<ResultsPage> => {
  return new Promise<ResultsPage>((resolve, reject) => {
    getUrl(url, controller, headers)
      .then((response: WebResponse) => {
        resolve({
          results: response.json.results,
          next: response.json.next
        });
      })
      .catch((error) => {
        return reject(error);
      });
  });
};

export const fetchResults = async (
  url: string,
  headers: { [key: string]: string } = {}
): Promise<any[]> => {
  if (!url) {
    return new Promise<any[]>((resolve) => resolve([]));
  }

  let results: any[] = [];
  let pageUrl = url;
  while (pageUrl) {
    const resultsPage = await fetchResultsPage(pageUrl, null, headers);
    if (resultsPage.results) {
      results = results.concat(resultsPage.results);
    }
    pageUrl = resultsPage.next;
  }
  return results;
};

export const getAssetPage = (url: string): Promise<AssetPage> => {
  return new Promise<AssetPage>((resolve, reject) => {
    getUrl(url)
      .then((response: WebResponse) => {
        if (response.status >= 200 && response.status < 300) {
          resolve({
            assets: response.json.results,
            next: response.json.next
          });
        } else {
          reject(response);
        }
      })
      .catch((error) => reject(error));
  });
};

export const getAssets = async (url: string): Promise<Asset[]> => {
  if (!url) {
    return new Promise<Asset[]>((resolve) => resolve([]));
  }

  let assets: Asset[] = [];
  let pageUrl = url;
  while (pageUrl) {
    const assetPage = await getAssetPage(pageUrl);
    if (assetPage.assets) {
      assets = assets.concat(assetPage.assets);
      pageUrl = assetPage.next;
    } else {
      pageUrl = null;
    }
  }
  return assets;
};

export interface WebResponse {
  json: any;
  body?: string;
  status: number;
  url?: string;
  headers: Headers;
  controller?: AbortController;
  redirected?: boolean;
}

export const postUrl = (
  url: string,
  payload: any,
  headers: any = {},
  contentType = null
): Promise<WebResponse> => {
  const fetchHeaders = getHeaders(headers);

  if (contentType) {
    fetchHeaders['Content-Type'] = contentType;
  }

  const options = {
    method: 'POST',
    headers: fetchHeaders,
    body: payload
  };

  return new Promise<WebResponse>((resolve, reject) => {
    fetch(url, options)
      .then(async (response) => {
        if (response.status >= 500) {
          reject(response);
          return;
        }

        const toasts = response.headers.get('X-Temba-Toasts');
        if (toasts) {
          const toastEle = document.querySelector('temba-toast') as Toast;
          if (toastEle) {
            toastEle.addMessages(JSON.parse(toasts));
          }
        }

        response.text().then((body: string) => {
          let json = {};
          try {
            json = JSON.parse(body);
            // eslint-disable-next-line no-empty
          } catch (err) {}
          resolve({
            body,
            json,
            headers: response.headers,
            status: response.status,
            redirected: response.redirected,
            url: response.url
          });
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const postJSON = (url: string, payload: any): Promise<WebResponse> => {
  return postUrl(url, JSON.stringify(payload), false, 'application/json');
};

export const postFormData = (
  url: string,
  formData: FormData,
  headers: any = {}
): Promise<WebResponse> => {
  return new Promise<WebResponse>((resolve, reject) => {
    postUrl(url, formData, headers)
      .then((response) => {
        if (response.status >= 200 && response.status < 400) {
          resolve(response);
        } else {
          if (url === DEFAULT_MEDIA_ENDPOINT) {
            reject(response);
          } else {
            reject('Server failure');
          }
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const postForm = (
  url: string,
  payload: any | FormData,
  headers: any = {}
): Promise<WebResponse> => {
  const formData = new FormData();
  Object.keys(payload).forEach((key: string) => {
    formData.append(key, payload[key]);
  });
  return postFormData(url, formData, headers);
};

/**
 */
export const renderIf =
  (predicate: boolean | any) =>
  (then: () => TemplateResult, otherwise?: () => TemplateResult) => {
    return predicate ? then() : otherwise ? otherwise() : html``;
  };

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
};

export const getElementOffset = (
  ele: HTMLElement
): {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
} => {
  const rect = ele.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return {
    top: rect.top + scrollTop,
    left: rect.left + scrollLeft,
    bottom: rect.top + rect.height,
    right: rect.left + rect.width,
    width: rect.width,
    height: rect.height
  };
};

export const plural = (count: number, singular: string, plural: string) => {
  return count === 1 ? singular : plural;
};

export const range = (start: number, end: number) =>
  Array.from({ length: end - start }, (v: number, k: number) => k + start);

export const fillTemplate = (
  template: string,
  replacements: { [key: string]: string | number }
): TemplateResult => {
  for (const key in replacements) {
    const className = key + '-replaced';
    replacements[
      key
    ] = `<span class="${className}">${replacements[key]}</span>`;
  }

  const templateDiv = document.createElement('div');
  // templateDiv.innerHTML = dynamicTemplate(template, replacements);
  return html` ${templateDiv} `;
};

/*!
 * Serialize all form data into a query string
 * (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {Node}   form The form to serialize
 * @return {String}      The serialized form data
 */
export const serialize = function (form: any) {
  // Setup our serialized data
  const serialized = [];

  // Loop through each field in the form
  for (let i = 0; i < form.elements.length; i++) {
    const field = form.elements[i];

    // Don't serialize fields without a name, submits, buttons, file and reset inputs, and disabled fields
    if (
      !field.name ||
      field.disabled ||
      field.type === 'file' ||
      field.type === 'reset' ||
      field.type === 'submit' ||
      field.type === 'button'
    )
      continue;

    // If a multi-select, get all selections
    if (field.type === 'select-multiple') {
      for (let n = 0; n < field.options.length; n++) {
        if (!field.options[n].selected) continue;
        if (field.options[n].value) {
          serialized.push(
            encodeURIComponent(field.name) +
              '=' +
              encodeURIComponent(field.options[n].value)
          );
        }
      }
    }

    // Convert field data to a query string
    else if (
      (field.type !== 'checkbox' && field.type !== 'radio') ||
      field.checked
    ) {
      let value = field.value;
      if (!value && field.checked) {
        value = '1';
      }

      if (value) {
        serialized.push(
          encodeURIComponent(field.name) + '=' + encodeURIComponent(value)
        );
      }
    }
  }
  return serialized.join('&');
};

export const getScrollParent = (node: any): any => {
  const parent = node.parentNode || node.host;
  if (parent) {
    const isElement = parent instanceof HTMLElement;
    const overflowY = isElement && window.getComputedStyle(parent).overflowY;
    const isScrollable =
      overflowY &&
      !(overflowY.includes('hidden') || overflowY.includes('visible'));

    if (!parent) {
      return null;
    } else if (isScrollable && parent.scrollHeight >= parent.clientHeight) {
      return parent;
    }

    return getScrollParent(parent);
  }
  return null;
};

export const isElementVisible = (el: any, holder?: any) => {
  holder = holder || document.body;
  const { top, bottom } = el.getBoundingClientRect();
  const holderRect = holder.getBoundingClientRect();

  return top <= holderRect.top
    ? bottom > holderRect.top
    : bottom < holderRect.bottom;
};

const HOUR = 3600;
const DAY = HOUR * 24;
const MONTH = DAY * 30;

export class Stubbable {
  public getCurrentDate() {
    return new Date();
  }
}

export const stubbable = new Stubbable();

export const timeSince = (
  date: Date,
  options: { compareDate?: Date; hideRecentText?: boolean; suffix?: string } = {
    suffix: ''
  }
) => {
  const { compareDate, hideRecentText, suffix } = options;
  const now = compareDate || stubbable.getCurrentDate();
  const secondsPast = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsPast < 60) {
    if (compareDate) {
      return secondsPast + 's' + suffix;
    }

    if (!hideRecentText && suffix) {
      return suffix;
    }
    return 'just now';
  }

  if (secondsPast < HOUR) {
    return Math.round(secondsPast / 60) + 'm' + suffix;
  }

  if (secondsPast <= DAY) {
    return Math.round(secondsPast / HOUR) + 'h' + suffix;
  }

  if (secondsPast <= MONTH) {
    return Math.round(secondsPast / DAY) + 'd' + suffix;
  }

  if (secondsPast < MONTH * 6) {
    return Math.round(secondsPast / MONTH) + 'mth' + suffix;
  } else {
    const day = date.getDate();
    const month = date
      .toDateString()
      .match(/ [a-zA-Z]*/)[0]
      .replace(' ', '');
    const year =
      date.getFullYear() == now.getFullYear() ? '' : ' ' + date.getFullYear();
    return day + ' ' + month + year;
  }
};

export const isDate = (value: any): boolean => {
  if (toString.call(value) === '[object Date]') {
    return true;
  }
  /* c8 ignore next 3 */
  if (typeof value.replace === 'function') {
    value.replace(/^\s+|\s+$/gm, '');
  }

  // value = value.split("+")[0];
  return DATE_FORMAT.test(value);
};

export const debounce = (fn: any, millis: number, immediate = false) => {
  let timeout: any;
  return function (...args: any) {
    const context = this;
    const later = function () {
      timeout = null;
      if (!immediate) {
        fn.apply(context, args);
      }
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, millis);
    if (callNow) {
      fn.apply(context, args);
    }
  };
};

export const throttle = (fn: any, millis: number) => {
  let ready = true;
  return function (...args: any) {
    const context = this;
    if (!ready) {
      return;
    }

    ready = false;
    fn.apply(context, args);
    setTimeout(() => {
      ready = true;
    }, millis);
  };
};

export interface NamedObject {
  name: string;
}

export const truncate = (input: string, max: number): string => {
  if (input.length > max) {
    return input.substring(0, max) + '...';
  }

  return input;
};

export const oxford = (items: any[], joiner = 'and'): any => {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    // TemplateResults get a different treatment
    if (typeof items[0] === 'object') {
      return html`${items[0]} ${joiner} ${items[1]}`;
    }
    return items.join(' ' + joiner + ' ');
  }

  // TemplateResults get a different treatment
  if (typeof items[0] === 'object') {
    return items.map((tr: TemplateResult, idx: number) => {
      if (idx < items.length - 1) {
        return html`${tr}, `;
      }
      return html`${joiner} ${tr}`;
    });
  }

  const allButLast = items.slice(0, -1);
  const last = items[items.length - 1];
  return allButLast.join(', ') + ', ' + joiner + ' ' + last;
};

export const oxfordFn = (
  items: any[],
  fn: (item: any) => any,
  joiner = 'and'
): any => {
  return oxford(items.map(fn), joiner);
};

export const oxfordNamed = (items: NamedObject[], joiner = 'and'): any => {
  return oxfordFn(items, (value: any) => value.name, joiner);
};

export const getDialog = (button: Button): Dialog => {
  return (button.getRootNode() as ShadowRoot).host as Dialog;
};

export const setCookie = (name: string, value: any, path = undefined) => {
  if (!path) {
    // default path is the first word in the url
    const url = document.location.pathname;
    path = url.substring(0, url.indexOf('/', 1));
  }
  const now = new Date();
  now.setTime(now.getTime() + 60 * 1000 * 60 * 24 * 30);
  document.cookie = `${name}=${value};expires=${now.toUTCString()};path=${path}`;
};

export const getCookie = (name: string) => {
  let cookieValue = null;
  if (document.cookie && document.cookie != '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) == name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

export const getCookieBoolean = (name: string) => {
  return (getCookie(name) || '') === 'true';
};

export enum COOKIE_KEYS {
  SETTINGS = 'settings',
  MENU_COLLAPSED = 'menu-collapsed',
  TICKET_SHOW_DETAILS = 'tickets.show-details'
}

export const capitalize = (
  [first, ...rest]: string[] | string,
  locale = navigator.language
) =>
  first === undefined ? '' : first.toLocaleUpperCase(locale) + rest.join('');

export const formatFileType = (type: string): string => {
  return type.split('/')[1];
};
export const formatFileSize = (
  bytes: number,
  decimalPoint?: number
): string => {
  if (bytes == 0) return '0 KB';
  const k = 1024,
    dm = decimalPoint || 2,
    sizes = ['B', 'KB', 'MB', 'GB'], //, 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const isImageAttachment = (attachment: Attachment) => {
  if (attachment) {
    return attachment.content_type.split('/')[0] === 'image';
  }
  return false;
};

export const stopEvent = (event: Event) => {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
};

/**
 * Extracts 2-letter initials from text like a workspace or user name
 * @param text the input text
 * @returns the initials
 */
export const extractInitials = (text: string) => {
  text = text.trim();

  // split into words, first allowing hypens inside words,
  // then splitting by hypen to try to get more than one word
  let words =
    text.match(/(([\p{L}\p{N}]+-[\p{L}\p{N}]+)|([\p{L}\p{N}]+))/gu) || [];
  if (words.length == 1) {
    words = text.match(/[\p{L}\p{N}]+/gu);
  }

  // for the case of no words use ? and for only one word take first 2 characters
  if (words.length == 0) {
    return '?';
  } else if (words.length == 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  // use initial letters of words with preference to first word and capital letters
  const firstLetters = words.map((w) => w.substring(0, 1));
  const firstCapitals = firstLetters.filter(
    (l, index) => l == l.toUpperCase() || index == 0
  );
  if (firstCapitals.length >= 2) {
    return (firstCapitals[0] + firstCapitals[1]).toUpperCase();
  } else {
    return (firstLetters[0] + firstLetters[1]).toUpperCase();
  }
};

export const hslToHex = (h, s, l) => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0'); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const darkenColor = (color: string, factor: number): string => {
  // If rgba or rgb
  const rgbaMatch = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/
  );
  if (rgbaMatch) {
    // eslint-disable-next-line prefer-const
    let [r, g, b, a] = rgbaMatch
      .slice(1)
      .map((v, i) => (i < 3 ? parseInt(v) : parseFloat(v)));
    r = Math.max(0, Math.floor(r * (1 - factor)));
    g = Math.max(0, Math.floor(g * (1 - factor)));
    b = Math.max(0, Math.floor(b * (1 - factor)));
    if (rgbaMatch[4] !== undefined) {
      return `rgba(${r},${g},${b},${a})`;
    }
    return `rgb(${r},${g},${b})`;
  }
  // If hex
  if (color.startsWith('#')) {
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const num = parseInt(hex, 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    r = Math.max(0, Math.floor(r * (1 - factor)));
    g = Math.max(0, Math.floor(g * (1 - factor)));
    b = Math.max(0, Math.floor(b * (1 - factor)));
    return `rgb(${r},${g},${b})`;
  }
  // fallback
  return color;
};

export const renderAvatar = (input: {
  name?: string;
  user?: User;
  icon?: string;
  position?: string;
  scale?: number;
}) => {
  if (!input.position) {
    input.position = 'right';
  }

  let text = input.name;
  if (input.user && input.user.first_name && input.user.last_name) {
    text = `${input.user.first_name} ${input.user.last_name}`;
  }

  let initials = '';
  let color = '';

  // just a url
  if (input.user && input.user.avatar) {
    color = `url('${input.user.avatar}') center / contain no-repeat`;
  } else if (text) {
    color = colorHash.hex(text);
    initials = extractInitials(text);
  }

  const avatar = html`
    <div
      style="display:flex; flex-direction: column; align-items:center;transform:scale(${input.scale ||
      1});"
    >
      <div
        class="avatar-circle"
        style="
            display: flex;
            height: 30px;
            width: 30px;
            flex-direction: row;
            align-items: center;
            color: #fff;
            border-radius: 100%;
            font-weight: 400;
            overflow: hidden;
            font-size: 12px;
            box-shadow: inset 0 0 0 3px rgba(0, 0, 0, 0.1);
            background:${color}"
      >
        ${initials
          ? html` <div
              style="border: 0px solid red; display:flex; flex-direction: column; align-items:center;flex-grow:1"
            >
              <div style="border:0px solid blue;">${initials}</div>
            </div>`
          : null}
      </div>
    </div>
  `;
  return avatar;
};

export const showModax = (title: string, endpoint: string) => {
  (window as any).showModax(title, endpoint);
};
export const sanitizeUnintendedUnicode = (text: string): string => {
  if (text) {
    return text
      .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
      .replace(/[\u2013\u2014]/g, '-') // En/em dash
      .replace(/\u2026/g, '...') // Horizontal ellipsis
      .replace(/\u2002/g, ' '); // En space
  }
  return text;
};
export const getCenter = (a: DOMRect, b: DOMRect) => {
  return a.left + a.width / 2 - b.width / 2;
};
export const getMiddle = (a: DOMRect, b: DOMRect) => {
  return a.top + a.height / 2 - b.height / 2;
};

// Export the UUID function from the uuid package
export { generateUUID };

// Helper types for router creation
export interface RouterCategory {
  uuid: string;
  name: string;
  exit_uuid: string;
}

export interface RouterExit {
  uuid: string;
  destination_uuid: string | null;
}

export interface RouterCase {
  uuid: string;
  type: string;
  arguments: string[];
  category_uuid: string;
}

export interface CreateCategoryParams {
  name: string;
  existingCategories: any[];
  existingExits: any[];
  existingCases?: any[];
  caseConfig?: {
    type: string;
    arguments: string[];
  };
}

// Helper function to create or preserve a category with its exit and case
export const createOrPreserveCategory = (
  params: CreateCategoryParams
): {
  category: RouterCategory;
  exit: RouterExit;
  case?: RouterCase;
} => {
  const { name, existingCategories, existingExits, existingCases, caseConfig } =
    params;

  // Find existing category
  const existingCategory = existingCategories.find((cat) => cat.name === name);
  const existingExit = existingCategory
    ? existingExits.find((exit) => exit.uuid === existingCategory.exit_uuid)
    : null;
  const existingCase =
    existingCategory && existingCases
      ? existingCases.find(
          (case_) => case_.category_uuid === existingCategory.uuid
        )
      : null;

  // Use existing UUIDs or generate new ones
  const categoryUuid = existingCategory?.uuid || generateUUID();
  const exitUuid = existingExit?.uuid || generateUUID();
  const caseUuid = existingCase?.uuid || generateUUID();

  const category: RouterCategory = {
    uuid: categoryUuid,
    name: name,
    exit_uuid: exitUuid
  };

  const exit: RouterExit = {
    uuid: exitUuid,
    destination_uuid: existingExit?.destination_uuid || null
  };

  const result: {
    category: RouterCategory;
    exit: RouterExit;
    case?: RouterCase;
  } = { category, exit };

  if (caseConfig) {
    result.case = {
      uuid: caseUuid,
      type: caseConfig.type,
      arguments: caseConfig.arguments,
      category_uuid: categoryUuid
    };
  }

  return result;
};

// Helper function to create a complete router with standard Success/Failure categories
export const createSuccessFailureRouter = (
  operand: string,
  successCaseConfig: { type: string; arguments: string[] },
  existingCategories: any[] = [],
  existingExits: any[] = [],
  existingCases: any[] = []
) => {
  const success = createOrPreserveCategory({
    name: 'Success',
    existingCategories,
    existingExits,
    existingCases,
    caseConfig: successCaseConfig
  });

  const failure = createOrPreserveCategory({
    name: 'Failure',
    existingCategories,
    existingExits
  });

  return {
    router: {
      type: 'switch' as const,
      categories: [success.category, failure.category],
      default_category_uuid: failure.category.uuid,
      operand: operand,
      cases: success.case ? [success.case] : []
    },
    exits: [success.exit, failure.exit]
  };
};

// Helper function to create a multi-category router with Other/Failure defaults
export const createMultiCategoryRouter = (
  operand: string,
  userCategories: string[],
  categoryToCaseMap: (categoryName: string) => {
    type: string;
    arguments: string[];
  },
  existingCategories: any[] = [],
  existingExits: any[] = [],
  existingCases: any[] = []
) => {
  const categories: RouterCategory[] = [];
  const exits: RouterExit[] = [];
  const cases: RouterCase[] = [];

  // Add user categories
  userCategories.forEach((categoryName) => {
    const result = createOrPreserveCategory({
      name: categoryName,
      existingCategories,
      existingExits,
      existingCases,
      caseConfig: categoryToCaseMap(categoryName)
    });

    categories.push(result.category);
    exits.push(result.exit);
    if (result.case) {
      cases.push(result.case);
    }
  });

  // Add "Other" category (default)
  const other = createOrPreserveCategory({
    name: 'Other',
    existingCategories,
    existingExits
  });
  categories.push(other.category);
  exits.push(other.exit);

  // Add "Failure" category
  const failure = createOrPreserveCategory({
    name: 'Failure',
    existingCategories,
    existingExits,
    existingCases,
    caseConfig: {
      type: 'has_only_text',
      arguments: ['<ERROR>']
    }
  });
  categories.push(failure.category);
  exits.push(failure.exit);
  if (failure.case) {
    cases.push(failure.case);
  }

  return {
    router: {
      type: 'switch' as const,
      categories: categories,
      default_category_uuid: other.category.uuid,
      operand: operand,
      cases: cases
    },
    exits: exits
  };
};

// Helper function to check if a category is a system category
export const isSystemCategory = (categoryName: string): boolean => {
  return ['No Response', 'Other', 'All Responses', 'Timeout'].includes(
    categoryName
  );
};

// Helper function to check if a UUID belongs to a system category
export const isSystemCategoryUuid = (
  uuid: string,
  categories: any[]
): boolean => {
  const category = categories.find((cat) => cat.uuid === uuid);
  return category ? isSystemCategory(category.name) : false;
};

// Helper function to generate default category name based on operator and operands
export const generateDefaultCategoryName = (
  operator: string,
  getOperatorConfig: (type: string) => any | undefined,
  value1?: string,
  value2?: string
): string => {
  const operatorConfig = getOperatorConfig(operator);
  if (!operatorConfig) return '';

  // Fixed category names (no operands)
  if (operatorConfig.operands === 0) {
    return operatorConfig.categoryName || '';
  }

  // Dynamic category names based on operands
  const cleanValue1 = (value1 || '').trim();
  const cleanValue2 = (value2 || '').trim();

  // Helper to capitalize first letter
  const capitalize = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Handle different operator types
  switch (operator) {
    // Word/phrase operators - capitalize first letter of value
    case 'has_any_word':
    case 'has_all_words':
    case 'has_phrase':
    case 'has_only_phrase':
    case 'has_beginning':
      return cleanValue1 ? capitalize(cleanValue1) : '';

    // Pattern operators - show as-is
    case 'has_pattern':
      return cleanValue1;

    // Number comparison operators - include symbol
    case 'has_number_eq':
      return cleanValue1 ? `= ${cleanValue1}` : '';
    case 'has_number_lt':
      return cleanValue1 ? `< ${cleanValue1}` : '';
    case 'has_number_lte':
      return cleanValue1 ? `≤ ${cleanValue1}` : '';
    case 'has_number_gt':
      return cleanValue1 ? `> ${cleanValue1}` : '';
    case 'has_number_gte':
      return cleanValue1 ? `≥ ${cleanValue1}` : '';

    // Number between - range format
    case 'has_number_between':
      if (cleanValue1 && cleanValue2) {
        return `${cleanValue1} - ${cleanValue2}`;
      }
      return '';

    // Date operators - format with relative expressions
    case 'has_date_lt':
    case 'has_date_lte':
      if (cleanValue1) {
        // Parse relative date expression (e.g., "today + 5" or "today - 3")
        const match = cleanValue1.match(/^(today)\s*([+-])\s*(\d+)$/i);
        if (match) {
          const [, base, operator, days] = match;
          const dayWord = days === '1' ? 'day' : 'days';
          return `Before ${base} ${operator} ${days} ${dayWord}`;
        }
        // Fallback for other date formats
        return `Before ${cleanValue1}`;
      }
      return '';

    case 'has_date_gt':
    case 'has_date_gte':
      if (cleanValue1) {
        // Parse relative date expression
        const match = cleanValue1.match(/^(today)\s*([+-])\s*(\d+)$/i);
        if (match) {
          const [, base, operator, days] = match;
          const dayWord = days === '1' ? 'day' : 'days';
          return `After ${base} ${operator} ${days} ${dayWord}`;
        }
        // Fallback for other date formats
        return `After ${cleanValue1}`;
      }
      return '';

    case 'has_date_eq':
      if (cleanValue1) {
        // Parse relative date expression
        const match = cleanValue1.match(/^(today)\s*([+-])\s*(\d+)$/i);
        if (match) {
          const [, base, operator, days] = match;
          const dayWord = days === '1' ? 'day' : 'days';
          return `${base} ${operator} ${days} ${dayWord}`;
        }
        return cleanValue1;
      }
      return '';

    default:
      // Fallback - capitalize first value
      return cleanValue1 ? capitalize(cleanValue1) : '';
  }
};

// Helper function to create a rules-based router (used by wait_for_response and split_by_expression)
export const createRulesRouter = (
  operand: string,
  userRules: any[],
  getOperatorConfig: (type: string) => any | undefined,
  existingCategories: any[] = [],
  existingExits: any[] = [],
  existingCases: any[] = []
) => {
  const categories: RouterCategory[] = [];
  const exits: RouterExit[] = [];
  const cases: RouterCase[] = [];

  // Filter existing categories to get only user-defined rules (exclude system categories)
  const existingUserCategories = existingCategories.filter(
    (cat) => !isSystemCategory(cat.name)
  );

  // Track categories as we create them (case-insensitive lookup)
  const createdCategories = new Map<
    string,
    { uuid: string; name: string; exit_uuid: string }
  >();

  // Process rules in their original order to preserve rule order
  userRules.forEach((rule, ruleIndex) => {
    const categoryKey = rule.category.trim().toLowerCase();
    const categoryName = rule.category.trim(); // Use original casing

    let categoryInfo = createdCategories.get(categoryKey);

    if (!categoryInfo) {
      // First time seeing this category - create it

      // Smart category matching: try by name first, then fall back to position
      let existingCategory = existingUserCategories.find(
        (cat) => cat.name.toLowerCase() === categoryKey
      );

      // If no match by name, try by position (for category rename scenarios)
      const categoryCreationOrder = Array.from(createdCategories.keys()).length;
      if (
        !existingCategory &&
        categoryCreationOrder < existingUserCategories.length
      ) {
        const candidateCategory = existingUserCategories[categoryCreationOrder];
        // Double-check that this candidate is not a system category UUID
        if (
          candidateCategory &&
          !isSystemCategoryUuid(candidateCategory.uuid, existingCategories)
        ) {
          existingCategory = candidateCategory;
        }
      }

      const existingExit = existingCategory
        ? existingExits.find((exit) => exit.uuid === existingCategory.exit_uuid)
        : null;

      // Generate UUIDs, ensuring we don't reuse system category UUIDs
      let exitUuid = existingExit?.uuid || generateUUID();
      let categoryUuid = existingCategory?.uuid || generateUUID();

      // Additional safety check: if somehow we got a system category UUID, generate new ones
      if (isSystemCategoryUuid(categoryUuid, existingCategories)) {
        categoryUuid = generateUUID();
        exitUuid = generateUUID();
      }

      categoryInfo = {
        uuid: categoryUuid,
        name: categoryName,
        exit_uuid: exitUuid
      };

      createdCategories.set(categoryKey, categoryInfo);

      // Add category and exit
      categories.push({
        uuid: categoryUuid,
        name: categoryName,
        exit_uuid: exitUuid
      });

      exits.push({
        uuid: exitUuid,
        destination_uuid: existingExit?.destination_uuid || null
      });
    }

    // Create case for this rule
    let existingCase = existingCases[ruleIndex];

    // If we can't find by position, try to find by matching rule content
    if (!existingCase && existingCases.length > 0) {
      existingCase = existingCases.find((case_) => {
        // Find the category for this case
        const caseCategory = existingCategories.find(
          (cat) => cat.uuid === case_.category_uuid
        );

        // Match by operator type and category name
        return (
          case_.type === rule.operator &&
          caseCategory?.name.toLowerCase() === categoryKey
        );
      });
    }

    const caseUuid = existingCase?.uuid || generateUUID();

    // Parse rule value based on operator configuration
    const operatorConfig = getOperatorConfig(rule.operator);
    let arguments_: string[] = [];

    if (operatorConfig) {
      if (operatorConfig.operands === 0) {
        // No operands needed
        arguments_ = [];
      } else if (operatorConfig.operands === 2) {
        // Split value for two operands (e.g., "1 10" for between)
        arguments_ = rule.value.split(' ').filter((arg: string) => arg.trim());
      } else {
        // Single operand - but split words for operators that expect multiple words
        if (rule.value && rule.value.trim()) {
          // Split on spaces and filter out empty strings
          arguments_ = rule.value
            .trim()
            .split(/\s+/)
            .filter((arg: string) => arg.length > 0);
        } else {
          arguments_ = [];
        }
      }
    } else {
      // Fallback for unknown operators - split on spaces if value exists
      if (rule.value && rule.value.trim()) {
        arguments_ = rule.value
          .trim()
          .split(/\s+/)
          .filter((arg: string) => arg.length > 0);
      } else {
        arguments_ = [];
      }
    }

    cases.push({
      uuid: caseUuid,
      type: rule.operator,
      arguments: arguments_,
      category_uuid: categoryInfo.uuid
    });
  });

  // Add default category (always present)
  // Name is "Other" if there are user rules, "All Responses" if there are no user rules
  const defaultCategoryName = userRules.length > 0 ? 'Other' : 'All Responses';

  // Try to find existing default category by name (prefer exact match)
  let existingDefaultCategory = existingCategories.find(
    (cat) => cat.name === defaultCategoryName
  );

  // If no exact match, try to find the other possible default category name
  if (!existingDefaultCategory) {
    const alternateName = userRules.length > 0 ? 'All Responses' : 'Other';
    existingDefaultCategory = existingCategories.find(
      (cat) => cat.name === alternateName
    );
  }

  const existingDefaultExit = existingDefaultCategory
    ? existingExits.find(
        (exit) => exit.uuid === existingDefaultCategory.exit_uuid
      )
    : null;

  const defaultExitUuid = existingDefaultExit?.uuid || generateUUID();
  const defaultCategoryUuid = existingDefaultCategory?.uuid || generateUUID();

  categories.push({
    uuid: defaultCategoryUuid,
    name: defaultCategoryName,
    exit_uuid: defaultExitUuid
  });

  exits.push({
    uuid: defaultExitUuid,
    destination_uuid: existingDefaultExit?.destination_uuid || null
  });

  // Find the default category (either "Other" or "All Responses")
  const defaultCategory = categories.find(
    (cat) => cat.name === 'Other' || cat.name === 'All Responses'
  );

  return {
    router: {
      type: 'switch' as const,
      categories: categories,
      default_category_uuid: defaultCategory?.uuid,
      operand: operand,
      cases: cases
    },
    exits: exits
  };
};

export const titleCase = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
