/* eslint-disable no-empty-pattern */
// declare module 'fetch-mock/esm/client';

declare function typeInto(selector: string, text: string, replace: boolean);

declare function type(text: string);
declare function click(selector: string);
declare function pressKey(key, times: number);
declare function waitFor(millis: number);
declare function setViewport({}: any);

declare function readStaticFile(filename: string);
