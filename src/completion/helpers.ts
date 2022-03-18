import { html, TemplateResult } from 'lit';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import { directive, Directive, Part, PartInfo, PartType } from 'lit/directive';
import ExcellentParser, { Expression } from './ExcellentParser';
import {
  CompletionOption,
  CompletionProperty,
  CompletionResult,
  CompletionSchema,
  CompletionType,
  KeyedAssets,
} from '../interfaces';
import { Store } from '../store/Store';
import { Remarkable } from 'remarkable';

const md = new Remarkable();

const messageParser = new ExcellentParser('@', [
  'contact',
  'fields',
  'globals',
  'urns',
]);

const sessionParser = new ExcellentParser('@', [
  'contact',
  'fields',
  'globals',
  'urns',
  'results',
  'input',
  'run',
  'child',
  'parent',
  'node',
  'webhook',
  'ticket',
  'trigger',
  'resume',
]);

// Class-based directive API
export class RenderMarkdown extends Directive {
  // State stored in class field
  value: string | undefined;
  constructor(partInfo: PartInfo) {
    super(partInfo);
    // When necessary, validate part in constructor using `part.type`
    if (partInfo.type !== PartType.CHILD) {
      throw new Error('renderMarkdown only supports child expressions');
    }
  }
  // Optional: override update to perform any direct DOM manipulation
  // DirectiveParameters<this>
  update(part: Part, [initialValue]: any) {
    /* Any imperative updates to DOM/parts would go here */
    return this.render(initialValue);
  }
  // Do SSR-compatible rendering (arguments are passed from call site)
  render(initialValue: string) {
    // Previous state available on class field
    if (this.value === undefined) {
      this.value = initialValue;
    }
    return html`${unsafeHTML(md.render(this.value))}`;
  }
}

export const renderMarkdown = directive(RenderMarkdown);

export const renderCompletionOption = (
  option: CompletionOption,
  selected: boolean
): TemplateResult => {
  if (option.signature) {
    const argStart = option.signature.indexOf('(');
    const name = option.signature.substr(0, argStart);
    const args = option.signature.substr(argStart);

    return html`
      <div style="${selected ? 'font-weight: 400' : ''}">
        <div style="display:inline-block;margin-right: 5px">ƒ</div>
        <div style="display:inline-block">${name}</div>
        ${selected
          ? html`
              <div
                style="display:inline-block; font-weight: 300; font-size: 85%"
              >
                ${args}
              </div>
              <div class="detail">${renderMarkdown(option.summary)}</div>
            `
          : null}
      </div>
    `;
  }

  return html`
    <div>
      <div style="${selected ? 'font-weight: 400' : ''}">${option.name}</div>
      ${selected
        ? html` <div style="font-size: 85%">${option.summary}</div> `
        : null}
    </div>
  `;
};

export const getFunctions = (
  functions: CompletionOption[],
  query: string
): CompletionOption[] => {
  if (!query) {
    return functions;
  }
  return functions.filter((option: CompletionOption) => {
    if (option.signature) {
      return option.signature.indexOf((query || '').toLowerCase()) === 0;
    }
    return false;
  });
};

/**
 * Takes a dot query and returns the completions options at the current level
 * @param dotQuery query such as "contact.first_n"
 */
export const getCompletions = (
  schema: CompletionSchema,
  dotQuery: string,
  keyedAssets: KeyedAssets = {},
  session: boolean
): CompletionOption[] => {
  const parts = (dotQuery || '').split('.');
  let currentProps: CompletionProperty[] = session
    ? schema.root
    : schema.root_no_session;

  if (!currentProps) {
    return [];
  }

  let prefix = '';
  let part = '';
  while (parts.length > 0) {
    part = parts.shift();
    if (part) {
      // eslint-disable-next-line
      const nextProp = currentProps.find(
        (prop: CompletionProperty) => prop.key === part
      );
      if (nextProp) {
        // eslint-disable-next-line
        const nextType = schema.types.find(
          (type: CompletionType) => type.name === nextProp.type
        );
        if (nextType && nextType.properties) {
          currentProps = nextType.properties;
          prefix += part + '.';
        } else if (nextType && nextType.property_template) {
          prefix += part + '.';
          const template = nextType.property_template;
          if (keyedAssets[nextType.name]) {
            currentProps = keyedAssets[nextType.name].map((key: string) => ({
              key: template.key.replace('{key}', key),
              help: template.help.replace('{key}', key),
              type: template.type,
            }));
          } else {
            currentProps = [];
          }
        } else {
          // eslint-disable-next-line
          currentProps = currentProps.filter((prop: CompletionProperty) =>
            prop.key.startsWith(part.toLowerCase())
          );
          break;
        }
      } else {
        // eslint-disable-next-line
        currentProps = currentProps.filter((prop: CompletionProperty) =>
          prop.key.startsWith(part.toLowerCase())
        );
        break;
      }
    }
  }

  return currentProps.map((prop: CompletionProperty) => {
    const name =
      prop.key === '__default__'
        ? prefix.substr(0, prefix.length - 1)
        : prefix + prop.key;
    return { name, summary: prop.help };
  });
};

export const getOffset = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
};

export const getVerticalScroll = (ele: Node) => {
  let current = ele;
  const verticalScroll = 0;
  while (current) {
    current = current.parentNode;
  }
  return verticalScroll;
};

export const getCompletionName = (option: CompletionOption): string => {
  return (
    option.name || option.signature.substr(0, option.signature.indexOf('('))
  );
};

export const getCompletionSignature = (option: CompletionOption): string => {
  return option.signature.substr(option.signature.indexOf('('));
};

/**
 * Determines the pixel position of position inside a textarea or input
 * TODO: Explore somethign like contenteditable to avoid this madness
 * see: https://jh3y.medium.com/how-to-where-s-the-caret-getting-the-xy-position-of-the-caret-a24ba372990a
 */
const getCursorXY = (input, selectionPoint) => {
  const { offsetLeft: inputX, offsetTop: inputY } = input;
  const div = document.createElement('div');
  const copyStyle = getComputedStyle(input);
  for (const prop of copyStyle) {
    div.style[prop] = copyStyle[prop];
  }
  div.style.position = 'relative';
  const swap = '.';
  const inputValue =
    input.tagName === 'INPUT' ? input.value.replace(/ /g, swap) : input.value;
  const textContent = inputValue.substr(0, selectionPoint);
  div.textContent = textContent;
  if (input.tagName === 'TEXTAREA') div.style.height = 'auto';
  if (input.tagName === 'INPUT') div.style.width = 'auto';
  const span = document.createElement('span');
  span.textContent = inputValue.substr(selectionPoint) || '.';
  div.appendChild(span);
  document.body.appendChild(div);
  const { offsetLeft: spanX, offsetTop: spanY } = span;
  document.body.removeChild(div);
  return {
    left: inputX + spanX,
    top: inputY + spanY,
  };
};

export const updateInputElementWithCompletion = (
  currentQuery: string,
  ele: HTMLInputElement,
  option: CompletionOption
) => {
  let insertText = '';

  if (option.signature) {
    // they selected a function
    insertText = option.signature.substr(0, option.signature.indexOf('(') + 1);
  } else {
    insertText = option.name;
  }

  const queryLength = currentQuery.length;

  if (ele) {
    const value = ele.value;
    const insertionPoint = ele.selectionStart - queryLength;

    // strip out our query
    // const insertionPoint = value.lastIndexOf(value.substring(0, this.inputElement.selectionStart));
    const leftSide = value.substr(0, insertionPoint);
    const remaining = value.substr(insertionPoint + queryLength);
    const caret = leftSide.length + insertText.length;

    // set our value and our new caret
    ele.value = leftSide + insertText + remaining;
    ele.setSelectionRange(caret, caret);

    // now scroll our text box if necessary
    const position = getCursorXY(ele, caret);
    if (position.left > ele.width) {
      ele.scrollLeft = position.left;
    }

    ele.dispatchEvent(new Event('input'));
  }
};

export const executeCompletionQuery = (
  ele: HTMLInputElement,
  store: Store,
  session: boolean
): CompletionResult => {
  const result: CompletionResult = {
    currentFunction: null,
    options: [],
    anchorPosition: null,
    query: null,
  };

  // we need a store to do anything useful
  if (!store) {
    return result;
  }

  const cursor = ele.selectionStart;
  const input = ele.value.substring(0, cursor);

  const parser = session ? sessionParser : messageParser;
  const expressions = parser.findExpressions(input);
  const currentExpression = expressions.find(
    (expr: Expression) =>
      expr.start <= cursor &&
      (expr.end > cursor || (expr.end === cursor && !expr.closed))
  );

  if (currentExpression) {
    const includeFunctions = currentExpression.text.indexOf('(') > -1;
    if (includeFunctions) {
      const functionQuery = parser.functionContext(currentExpression.text);
      if (functionQuery) {
        const fns = getFunctions(store.getFunctions(), functionQuery);
        if (fns.length > 0) {
          result.currentFunction = fns[0];
        }
      }
    }

    for (let i = currentExpression.text.length; i >= 0; i--) {
      const curr = currentExpression.text[i];
      if (
        curr === '@' ||
        curr === '(' ||
        curr === ' ' ||
        curr === ',' ||
        curr === ')' ||
        i === 0
      ) {
        // don't include non-expression chars
        if (
          curr === '(' ||
          curr === ' ' ||
          curr === ',' ||
          curr === ')' ||
          curr === '@'
        ) {
          i++;
        }

        const caret = getCursorXY(ele, currentExpression.start + i);

        result.anchorPosition = {
          left: caret.left - 2 - ele.scrollLeft,
          top: caret.top - ele.scrollTop,
        };

        result.query = currentExpression.text.substr(
          i,
          currentExpression.text.length - i
        );

        result.options = [
          ...getCompletions(
            store.getCompletionSchema(),
            result.query,
            store.getKeyedAssets(),
            session
          ),
          ...(includeFunctions
            ? getFunctions(store.getFunctions(), result.query)
            : []),
        ];

        return result;
      }
    }
  } else {
    result.options = [];
    result.query = '';
  }
  return result;
};
