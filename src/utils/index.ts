import axios, { AxiosResponse, CancelToken, AxiosRequestConfig } from "axios";
import { html, TemplateResult } from "lit-html";
import { notEqual } from "lit-element";
const dynamicTemplate = require("es6-dynamic-template");

export interface Asset {
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
export const getCookie = (name: string): string => {
  for (const cookie of document.cookie.split(";")) {
    const idx = cookie.indexOf("=");
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

  let result = classNames.join(" ");
  if (result.trim().length > 0) {
    result = " " + result;
  }
  return result;
};

export const fetchResultsPage = (url: string): Promise<ResultsPage> => {
  return new Promise<ResultsPage>((resolve, reject) => {
    getUrl(url)
      .then((response: AxiosResponse) => {
        resolve({
          results: response.data.results,
          next: response.data.next,
        });
      })
      .catch((error) => reject(error));
  });
};

export const fetchResults = async (url: string): Promise<any[]> => {
  if (!url) {
    return new Promise<any[]>((resolve, reject) => resolve([]));
  }

  let results: any[] = [];
  let pageUrl = url;
  while (pageUrl) {
    const resultsPage = await fetchResultsPage(pageUrl);
    results = results.concat(resultsPage.results);
    pageUrl = resultsPage.next;
  }
  return results;
};

export const getAssetPage = (url: string): Promise<AssetPage> => {
  return new Promise<AssetPage>((resolve, reject) => {
    getUrl(url)
      .then((response: AxiosResponse) => {
        resolve({
          assets: response.data.results,
          next: response.data.next,
        });
      })
      .catch((error) => reject(error));
  });
};

export const getAssets = async (url: string): Promise<Asset[]> => {
  if (!url) {
    return new Promise<Asset[]>((resolve, reject) => resolve([]));
  }

  let assets: Asset[] = [];
  let pageUrl = url;
  while (pageUrl) {
    const assetPage = await getAssetPage(pageUrl);
    assets = assets.concat(assetPage.assets);
    pageUrl = assetPage.next;
  }
  return assets;
};

export const getHeaders = (pjax: boolean) => {
  const csrf = getCookie("csrftoken");
  const headers: any = csrf ? { "X-CSRFToken": csrf } : {};

  // mark us as ajax
  headers["X-Requested-With"] = "XMLHttpRequest";

  if (pjax) {
    headers["X-PJAX"] = "true";
  }

  return headers;
};

export const getUrl = (
  url: string,
  cancelToken: CancelToken = null,
  pjax: boolean = false
): Promise<AxiosResponse> => {
  const config: AxiosRequestConfig = { headers: getHeaders(pjax) };
  if (cancelToken) {
    config.cancelToken = cancelToken;
  }
  return axios.get(url, config);
};

export const postUrl = (
  url: string,
  payload: any,
  pjax: boolean = false
): Promise<AxiosResponse> => {
  return axios.post(url, payload, { headers: getHeaders(pjax) });
};

/**
 */
export const renderIf = (predicate: boolean | any) => (
  then: () => TemplateResult,
  otherwise?: () => TemplateResult
) => {
  return predicate ? then() : otherwise ? otherwise() : html``;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
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
    const className = key + "-replaced";
    replacements[
      key
    ] = `<span class="${className}">${replacements[key]}</span>`;
  }

  const templateDiv = document.createElement("div");
  templateDiv.innerHTML = dynamicTemplate(template, replacements);
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
      field.type === "file" ||
      field.type === "reset" ||
      field.type === "submit" ||
      field.type === "button"
    )
      continue;

    // If a multi-select, get all selections
    if (field.type === "select-multiple") {
      for (var n = 0; n < field.options.length; n++) {
        if (!field.options[n].selected) continue;
        serialized.push(
          encodeURIComponent(field.name) +
            "=" +
            encodeURIComponent(field.options[n].value)
        );
      }
    }

    // Convert field data to a query string
    else if (
      (field.type !== "checkbox" && field.type !== "radio") ||
      field.checked
    ) {
      serialized.push(
        encodeURIComponent(field.name) + "=" + encodeURIComponent(field.value)
      );
    }
  }

  return serialized.join("&");
};

export const getScrollParent = (node: any): any => {
  const parent = node.parentNode || node.host;
  if (parent) {
    const isElement = parent instanceof HTMLElement;
    const overflowY = isElement && window.getComputedStyle(parent).overflowY;
    const isScrollable =
      overflowY &&
      !(overflowY.includes("hidden") || overflowY.includes("visible"));

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
const WEEK = DAY * 7;
const MONTH = DAY * 30;

export const timeSince = (date: Date) => {
  const now = new Date();
  const secondsPast = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsPast < 60) {
    return "just now";
  }

  if (secondsPast < HOUR) {
    return Math.round(secondsPast / 60) + "m";
  }

  if (secondsPast <= DAY) {
    return Math.round(secondsPast / HOUR) + "h";
  }

  if (secondsPast <= MONTH) {
    return Math.round(secondsPast / DAY) + "d";
  }

  if (secondsPast < MONTH * 6) {
    return Math.round(secondsPast / MONTH) + "mth";
  } else {
    const day = date.getDate();
    const month = date
      .toDateString()
      .match(/ [a-zA-Z]*/)[0]
      .replace(" ", "");
    const year =
      date.getFullYear() == now.getFullYear() ? "" : " " + date.getFullYear();
    return day + " " + month + year;
  }
};

export const isDate = (value: string): boolean => {
  let dateFormat;
  if (toString.call(value) === "[object Date]") {
    return true;
  }
  if (typeof value.replace === "function") {
    value.replace(/^\s+|\s+$/gm, "");
  }

  // value = value.split("+")[0];
  dateFormat = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;
  return dateFormat.test(value);
};

export const debounce = (
  fn: Function,
  millis: number,
  immediate: boolean = false
) => {
  let timeout: any;
  return function () {
    const context = this;
    const args = arguments;

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

export const throttle = (fn: Function, millis: number) => {
  let ready: boolean = true;
  return function () {
    const context = this;
    const args = arguments;

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

export interface NamedOjbect {
  name: string;
}

export const oxford = (items: any[], joiner: string = "and") => {
  const beginning = items.splice(0, items.length - 1);
  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return items.join(" " + joiner + " ");
  }

  return items.join(", ") + joiner + items[items.length - 1];
};

export const oxfordFn = (items: any[], fn: (item: any) => TemplateResult) => {
  return oxford(items.map(fn));
};

export const oxfordNamed = (items: NamedOjbect[], joiner: string = "and") => {
  return oxford(items.map((value) => value.name));
};
