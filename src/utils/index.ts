/* eslint-disable @typescript-eslint/no-this-alias */
import { html, TemplateResult } from 'lit-html';
import { Button } from '../button/Button';
import { Dialog } from '../dialog/Dialog';
import { Attachment, ContactField, Ticket, User } from '../interfaces';
import ColorHash from 'color-hash';

export const DEFAULT_MEDIA_ENDPOINT = '/api/v2/media.json';

const colorHash = new ColorHash();

export type Asset = KeyedAsset & Ticket & ContactField;

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
  const csrf = getHTTPCookie('csrftoken');
  const fetchHeaders: any = csrf ? { 'X-CSRFToken': csrf } : {};

  // mark us as ajax
  fetchHeaders['X-Requested-With'] = 'XMLHttpRequest';

  Object.keys(headers).forEach(key => {
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
      headers: getHeaders(headers),
    };

    if (controller) {
      options['signal'] = controller.signal;
    }

    fetch(url, options)
      .then(response => {
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
            status: response.status,
          });
        });
      })
      .catch(error => {
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
  controller: AbortController = null
): Promise<ResultsPage> => {
  return new Promise<ResultsPage>((resolve, reject) => {
    getUrl(url, controller)
      .then((response: WebResponse) => {
        resolve({
          results: response.json.results,
          next: response.json.next,
        });
      })
      .catch(error => reject(error));
  });
};

export const fetchResults = async (url: string): Promise<any[]> => {
  if (!url) {
    return new Promise<any[]>(resolve => resolve([]));
  }

  let results: any[] = [];
  let pageUrl = url;
  while (pageUrl) {
    const resultsPage = await fetchResultsPage(pageUrl);
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
            next: response.json.next,
          });
        } else {
          reject(response);
        }
      })
      .catch(error => reject(error));
  });
};

export const getAssets = async (url: string): Promise<Asset[]> => {
  if (!url) {
    return new Promise<Asset[]>(resolve => resolve([]));
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
    body: payload,
  };

  return new Promise<WebResponse>((resolve, reject) => {
    fetch(url, options)
      .then(async response => {
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
            url: response.url,
          });
        });
      })
      .catch(error => {
        reject(error);
      });
  });
};

export const postJSON = (url: string, payload: any): Promise<WebResponse> => {
  return postUrl(url, JSON.stringify(payload), false, 'application/json');
};

export const postFormData = (
  url: string,
  formData: FormData
): Promise<WebResponse> => {
  return new Promise<WebResponse>((resolve, reject) => {
    postUrl(url, formData, true)
      .then(response => {
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
      .catch(err => {
        console.error(err);
        reject(err);
      });
  });
};

export const postForm = (
  url: string,
  payload: any | FormData
): Promise<WebResponse> => {
  const formData = new FormData();
  Object.keys(payload).forEach((key: string) => {
    formData.append(key, payload[key]);
  });
  return postFormData(url, formData);
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
        b: parseInt(result[3], 16),
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
    height: rect.height,
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

export const isElementVisible = (el: any, holder: any) => {
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
    suffix: '',
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

export const isDate = (value: string): boolean => {
  if (toString.call(value) === '[object Date]') {
    return true;
  }
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

  return items.join(', ') + joiner + items[items.length - 1];
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
  TICKET_SHOW_DETAILS = 'tickets.show-details',
}

export const capitalize = ([first, ...rest], locale = navigator.language) =>
  first === undefined ? '' : first.toLocaleUpperCase(locale) + rest.join('');

export const formatFileType = (type: string): string => {
  return type.split('/')[1];
};
export const formatFileSize = (bytes: number, decimalPoint: number): string => {
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

export const getFullName = (user: User) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }

  return user.email;
};

/**
 * Extracts 2-letter initials from text like a workspace or user name
 * @param text the input text
 * @returns the initials
 */
export const extractInitials = (text: string) => {
  // for empty or single chars, use placeholder or that char
  if (text.length == 0) {
    return '?';
  } else if (text.length == 1) {
    return text.toUpperCase();
  }

  const words = text.match(/\w+/g);

  // for single words, use first two letters
  if (words.length == 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  // use initial letters of words with preference to first word and capital letters
  const firstLetters = words.map(w => w.substring(0, 1));
  const firstCaptitals = firstLetters.filter(
    (l, index) => l == l.toUpperCase() || index == 0
  );
  if (firstCaptitals.length >= 2) {
    return (firstCaptitals[0] + firstCaptitals[1]).toUpperCase();
  } else {
    return (firstLetters[0] + firstLetters[1]).toUpperCase();
  }
};

export const hslToHex = (h, s, l) => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0'); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const renderAvatar = (input: {
  name?: string;
  user?: User;
  icon?: string;
  image?: string;
  position?: string;
  tip?: boolean;
}) => {
  if (!input.position) {
    input.position = 'right';
  }

  // just a url
  if (input.image) {
    return html`<img src="${input.image}" />`;
  }

  let text = input.name;
  if (input.user) {
    text = `${input.user.first_name} ${input.user.last_name}`;
  }

  if (!text) {
    return null;
  }

  const color = colorHash.hex(text);
  const initials = extractInitials(text);
  const avatar = html`
    <div
      style="border: 0px solid red; display:flex; flex-direction: column; align-items:center;"
    >
      <div
        class="avatar-circle"
        style="
            display: flex;
            height: 2em;
            width: 2em;
            flex-direction: row;
            align-items: center;
            color: #fff;
            border-radius: 100%;
            font-weight: 400;
            border: 0.3em solid rgba(0,0,0,.05);
            background:${color}"
      >
        <div
          style="border: 0px solid red; display:flex; flex-direction: column; align-items:center;flex-grow:1"
        >
          <div style="border:0px solid blue;">${initials}</div>
        </div>
      </div>
    </div>
  `;
  return input.tip
    ? html`
        <temba-tip text=${text} position=${input.position}>
          ${avatar}
        </temba-tip>
      `
    : avatar;
};
