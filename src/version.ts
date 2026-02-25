declare const __TEMBA_COMPONENTS_VERSION__: string | undefined;

export const TEMBA_COMPONENTS_VERSION =
  typeof __TEMBA_COMPONENTS_VERSION__ === 'string' &&
  __TEMBA_COMPONENTS_VERSION__.length > 0
    ? __TEMBA_COMPONENTS_VERSION__
    : 'dev';
