// SPDX-License-Identifier: Apache-2.0
// Coverage of verifier paths that the published fixture never reached: the historical text
// profile utf8-nfc-lf-trimmed-v0, indexed selectors and artifact profile dispatch. Expected
// bytes are written out by hand from the recipe, never computed by the function under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {textBytes, select, artifactPreimage} from '../spec/reference/verification.mjs';

const bytes = (...values) => Uint8Array.from(values);
const refuses = (fn, code) =>
  assert.throws(fn, error => error.name === 'VerificationError' && error.message === code, code);

test('text profile: plain ASCII is unchanged', () => {
  assert.deepEqual(textBytes('abc'), bytes(0x61, 0x62, 0x63));
});

test('text profile: CRLF and lone CR become LF; internal spaces are kept', () => {
  assert.deepEqual(textBytes('a\r\nb\rc'), bytes(0x61, 0x0a, 0x62, 0x0a, 0x63));
  assert.deepEqual(textBytes('a  b\tc'), bytes(0x61, 0x20, 0x20, 0x62, 0x09, 0x63));
});

test('text profile: only the Python str.strip whitespace set is trimmed, at both ends', () => {
  assert.deepEqual(textBytes(' \t\n\u000b\u000c\r\u001c\u001d\u001e\u001fx\u0085        　'), bytes(0x78));
  // U+FEFF is not Python whitespace: it is kept (JavaScript trim would remove it).
  assert.deepEqual(textBytes('﻿x'), bytes(0xef, 0xbb, 0xbf, 0x78));
  // U+0085 is Python whitespace (JavaScript trim would keep it).
  assert.deepEqual(textBytes('\u0085x\u0085'), bytes(0x78));
  // Zero-width space is not whitespace in either language.
  assert.deepEqual(textBytes('​x'), bytes(0xe2, 0x80, 0x8b, 0x78));
});

test('text profile: NFC is applied after trimming; precomposed and combined forms converge', () => {
  assert.deepEqual(textBytes('é'), bytes(0xc3, 0xa9));
  assert.deepEqual(textBytes('é'), bytes(0xc3, 0xa9));
  assert.deepEqual(textBytes('  é  '), bytes(0xc3, 0xa9));
  // Hangul conjoining jamo compose under NFC.
  assert.deepEqual(textBytes('가'), bytes(0xea, 0xb0, 0x80));
});

test('text profile: empty and whitespace-only documents become empty bytes', () => {
  assert.deepEqual(textBytes(''), bytes());
  assert.deepEqual(textBytes(' \n\t\r\n '), bytes());
});

test('text profile: malformed input is refused explicitly', () => {
  refuses(() => textBytes(42), 'text_required');
  refuses(() => textBytes(null), 'text_required');
  refuses(() => textBytes('a\ud800b'), 'invalid_unicode');
  refuses(() => textBytes('\udc00'), 'invalid_unicode');
});

test('artifact profiles: JSON and text paths take distinct recipes; ambiguous extensions are refused', () => {
  const json = new TextEncoder().encode('{"b":1, "a":"é"}\n');
  assert.deepEqual([...artifactPreimage('public/x.json', json)], [...new TextEncoder().encode('{"a":"é","b":1}')]);
  const text = new TextEncoder().encode(' {"b":1}\r\n');
  assert.deepEqual(artifactPreimage('public/x.md', text), bytes(0x7b, 0x22, 0x62, 0x22, 0x3a, 0x31, 0x7d));
  refuses(() => artifactPreimage('public/x.JSON', json), 'ambiguous_artifact_extension');
  refuses(() => artifactPreimage('public/x.md', text, 'deterministic-json-sort-keys-v0'), 'artifact_profile');
  refuses(() => artifactPreimage('public/x.json', json, 'utf8-nfc-lf-trimmed-v0'), 'artifact_profile');
});

const doc = {a: {b: 'deep'}, list: ['zero', 'one', 'two'], f: false, z: 0, n: null, e: '', 'a.b': 'dotted'};

test('selectors: root, keys, nested keys and first/last valid indices', () => {
  assert.equal(select(doc, '$'), doc);
  assert.equal(select(doc, '$.a.b'), 'deep');
  assert.equal(select(doc, '$.list[0]'), 'zero');
  assert.equal(select(doc, '$.list[2]'), 'two');
  assert.equal(select({rows: [{v: 1}, {v: 2}]}, '$.rows[1].v'), 2);
});

test('selectors: false, zero, null and empty string are values, not missing selections', () => {
  assert.equal(select(doc, '$.f'), false);
  assert.equal(select(doc, '$.z'), 0);
  assert.equal(select(doc, '$.n'), null);
  assert.equal(select(doc, '$.e'), '');
  refuses(() => select(doc, '$.n.x'), 'selector_missing');
});

test('selectors: absent keys, out-of-range indices and wrong container types are missing', () => {
  refuses(() => select(doc, '$.missing'), 'selector_missing');
  refuses(() => select(doc, '$.list[3]'), 'selector_missing');
  refuses(() => select(doc, '$.a[0]'), 'selector_missing');
  refuses(() => select(doc, '$.list.length'), 'selector_missing');
  refuses(() => select({}, '$.toString'), 'selector_missing');
  refuses(() => select({}, '$.__proto__'), 'selector_missing');
  // A key containing a dot cannot be addressed by this grammar.
  refuses(() => select(doc, '$.a.b.c'), 'selector_missing');
  assert.notEqual(select(doc, '$.a.b'), 'dotted');
});

test('selectors: syntax outside the closed grammar is refused', () => {
  for (const selector of [
    'a.b',
    '$a',
    '$.',
    '$..a',
    '$.list[-1]',
    '$.list[01]',
    '$.list[+1]',
    '$.list[1.0]',
    '$.list[0][1]',
    '$.list[]',
    '$.[0]',
    '$.a b[x]',
    '$.list[ 1]',
  ]) {
    refuses(() => select(doc, selector), 'unsupported_selector');
  }
  refuses(() => select(doc, 42), 'unsupported_selector');
  refuses(() => select(doc, null), 'unsupported_selector');
});
