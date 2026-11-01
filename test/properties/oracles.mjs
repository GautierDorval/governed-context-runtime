// SPDX-License-Identifier: Apache-2.0
// Literal/recipe witnesses, not a second copy of the verifier's serializer.
import assert from 'node:assert/strict';
export const bytes = new TextEncoder();
export const text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
/** @param {Uint8Array} actual @param {string} expected */
export function equalBytes(actual, expected) {
  assert.deepEqual(actual, bytes.encode(expected));
}
/** Expected refusals must never turn a subject crash into a contractual assertion.
 * @param {string} message */
export const verificationError = message => /** @param {unknown} error */ error => {
  if (!(error instanceof Error) || error.constructor !== Error || error.name !== 'VerificationError') throw error;
  return error.message === message;
};
/**
 * Expected serialization of precisely two known, distinct single-code-point keys. Native
 * JSON.stringify only quotes each string: the order is supplied by the recipe witness.
 * @param {string} first @param {number} firstValue @param {string} second @param {number} secondValue
 */
export const pairBytes = (first, firstValue, second, secondValue) =>
  `{${JSON.stringify(first)}:${firstValue},${JSON.stringify(second)}:${secondValue}}`;
