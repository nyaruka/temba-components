import { css } from 'lit';
import { TokenType, Token } from './tokenizer';

export const TOKEN_CLASS_MAP: Record<string, string> = {
  [TokenType.Text]: 'tok-text',
  [TokenType.ExpressionPrefix]: 'tok-prefix',
  [TokenType.Identifier]: 'tok-id',
  [TokenType.FunctionName]: 'tok-fn',
  [TokenType.StringLiteral]: 'tok-str',
  [TokenType.NumberLiteral]: 'tok-num',
  [TokenType.Keyword]: 'tok-kw',
  [TokenType.Operator]: 'tok-op',
  [TokenType.ContextRef]: 'tok-ctx',
  [TokenType.Separator]: 'tok-sep',
  [TokenType.Whitespace]: 'tok-ws',
  [TokenType.Arrow]: 'tok-arrow',
  [TokenType.Bracket]: 'tok-bracket',
  [TokenType.EscapedAt]: 'tok-text',
  [TokenType.Paren]: 'tok-paren'
};

/** Expression token types get monospace font. */
export const EXPRESSION_TOKENS = new Set([
  TokenType.ExpressionPrefix,
  TokenType.Identifier,
  TokenType.FunctionName,
  TokenType.StringLiteral,
  TokenType.NumberLiteral,
  TokenType.Keyword,
  TokenType.Operator,
  TokenType.ContextRef,
  TokenType.Separator,
  TokenType.Whitespace,
  TokenType.Arrow,
  TokenType.Bracket,
  TokenType.Paren
]);

export function getTokenClass(token: Token): string {
  if (token.type === TokenType.Paren && token.balanced === false) {
    return 'tok-paren-unmatched';
  }
  return TOKEN_CLASS_MAP[token.type] || 'tok-text';
}

/** Shared CSS for token syntax highlighting. */
export const tokenCss = css`
  .tok-text {
    color: inherit;
  }

  .tok-prefix {
    color: var(--expression-color, #0086e0);
    font-weight: 600;
  }

  .tok-id {
    color: var(--expression-color, #0086e0);
  }

  .tok-fn {
    color: var(--expression-fn-color, #0086e0);
    font-weight: 900;
  }

  .tok-str {
    color: var(--expression-string-color, #06a810);
  }

  .tok-num {
    color: var(--expression-number-color, #c25ceb);
  }

  .tok-kw {
    color: var(--expression-keyword-color, #1750eb);
  }

  .tok-op {
    color: var(--expression-operator-color, #666);
  }

  .tok-ctx {
    color: var(--expression-color, #0086e0);
  }

  .tok-sep {
    color: var(--expression-operator-color, #666);
  }

  .tok-arrow {
    color: var(--expression-operator-color, #666);
  }

  .tok-bracket {
    color: var(--expression-operator-color, #666);
  }

  .tok-ws {
    /* whitespace tokens — no special color */
  }

  .tok-newline {
    /* Newline chars rendered via white-space: pre-wrap on parent */
  }

  .tok-paren {
    color: #999;
  }

  .tok-paren-unmatched {
    color: var(--expression-paren-unmatched-color, #ff0011);
    font-weight: 900;
  }

  .tok-fn-invalid {
    text-decoration: wavy underline #ff0011;
    text-underline-offset: 3px;
  }

  .tok-mono {
    font-family: var(
      --expression-font-family,
      'SFMono-Regular',
      'Consolas',
      'Liberation Mono',
      'Menlo',
      monospace
    );
    font-size: 0.95em;
  }
`;
