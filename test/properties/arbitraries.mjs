// SPDX-License-Identifier: Apache-2.0
import fc from 'fast-check';
/** @typedef {null | boolean | number | string | Json[] | {[key: string]: Json}} Json */
export const BOUNDS = Object.freeze({stringCodePoints: 32, stringUtf16Units: 64, members: 8, depth: 6});
export const unicodeString = fc.oneof(
  fc.string({unit: 'binary', maxLength: 32}),
  fc.constantFrom('', 'e\u0301', '\u00e9', '\ue000', '\u{10000}', '\u0000', '"\\\n', '__proto__', '10'),
);
export const asciiString = fc.string({unit: 'grapheme-ascii', maxLength: 24});
export const keyOrderPair = fc.tuple(fc.integer({min: 0xe000, max: 0xffff}), fc.integer({min: 0x10000, max: 0x10ffff}));
export const nfcPair = fc.constantFrom(['e\u0301', '\u00e9'], ['A\u030a', '\u00c5'], ['n\u0303', '\u00f1']);
export const pythonWhitespace = Object.freeze([
  ...Array.from({length: 5}, (_, i) => 9 + i),
  ...Array.from({length: 5}, (_, i) => 28 + i),
  0x85,
  0xa0,
  0x1680,
  ...Array.from({length: 11}, (_, i) => 0x2000 + i),
  0x2028,
  0x2029,
  0x202f,
  0x205f,
  0x3000,
]);
/**
 * Construct admitted values without querying the verifier. Indexed key prefixes prevent both
 * decoded and NFC collisions. Dedicated properties exercise unprefixed/numeric/colliding keys.
 * @param {number} [depth] @param {boolean} [historical] @param {number} [members]
 * @returns {fc.Arbitrary<Json>}
 */
export function jsonValue(depth = 6, historical = false, members = 8) {
  const integer = fc.integer({min: -9007199254740991, max: 9007199254740991});
  const number = historical
    ? fc.oneof(
        integer,
        fc.integer({min: -1000000, max: 1000000}).map(n => n + 0.5),
      )
    : integer;
  const leaf = fc.oneof(fc.constant(null), fc.boolean(), number, unicodeString);
  if (depth === 0) return leaf;
  const child = jsonValue(depth - 1, historical, members);
  const array = fc.array(child, {maxLength: members});
  const object = fc
    .array(
      fc.tuple(
        unicodeString.map(s => Array.from(s).slice(0, 30).join('')),
        child,
      ),
      {maxLength: members},
    )
    .map(entries => Object.fromEntries(entries.map(([key, value], i) => [`k${i}:${key}`, value])));
  return fc.oneof({weight: 6, arbitrary: leaf}, {weight: 1, arbitrary: array}, {weight: 1, arbitrary: object});
}
export const portableValue = jsonValue();
export const historicalValue = jsonValue(3, true, 4);
/** @param {Json} value @returns {Json} */
export function reverseInsertion(value) {
  if (Array.isArray(value)) return value.map(reverseInsertion);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([k, v]) => [k, reverseInsertion(v)]),
    );
  return value;
}
