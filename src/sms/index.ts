/**
 * This is the same SMS splitter we've been using but we've
 * updated it here to use it with ESM imports
 * See https://github.com/Codesleuth/split-sms
 */

import { gsmSplit } from './gsmsplitter';
import { validateMessage } from './gsmvalidator';
import { unicodeSplit } from './unicodesplitter';

export const UNICODE = 'Unicode';
export const GSM = 'GSM';

function calculateRemaining(parts, singleBytes, multiBytes, charBytes) {
  var max = parts.length === 1 ? singleBytes : multiBytes;
  return (max - parts[parts.length - 1].bytes) / charBytes;
}

export const splitSMS = function (message: string, options: any = {}) {
  var characterset = options && options.characterset;

  options = {
    summary: options && options.summary,
  };

  var isGsm =
    (characterset === undefined && validateMessage(message)) ||
    characterset === GSM;
  var splitResult, singleBytes, multiBytes, charBytes;

  if (isGsm) {
    splitResult = gsmSplit(message, options);
    singleBytes = 160;
    multiBytes = 153;
    charBytes = 1;
  } else {
    splitResult = unicodeSplit(message, options);
    singleBytes = 140;
    multiBytes = 134;
    charBytes = 2;
  }

  var remainingInPart = calculateRemaining(
    splitResult.parts,
    singleBytes,
    multiBytes,
    charBytes
  );

  return {
    characterSet: isGsm ? GSM : UNICODE,
    parts: splitResult.parts,
    bytes: splitResult.totalBytes,
    length: splitResult.totalLength,
    remainingInPart: remainingInPart,
  };
};
