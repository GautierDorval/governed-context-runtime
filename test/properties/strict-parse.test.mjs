// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {strictParse, canonical} from '../../spec/reference/verification.mjs';
import {asciiString, unicodeString} from './arbitraries.mjs';
import {propertyTest} from './harness.mjs';
import {verificationError, bytes} from './oracles.mjs';
/** @param {string} id @param {number} seed @param {string} [profile] */
const meta = (id, seed, profile = 'gd-portable-json-v1') => ({id, seed, profile});
propertyTest(
  meta('raw-decoded-duplicates', 31201),
  fc.property(asciiString, keyTail => {
    const key = 'k' + keyTail,
      literal = JSON.stringify(key),
      escaped = '"\\u006b' + JSON.stringify(keyTail).slice(1);
    for (const duplicate of [literal, escaped]) {
      const raw = '{' + literal + ':1,' + duplicate + ':2}';
      assert.throws(() => strictParse(raw), verificationError('duplicate_key'));
      assert.throws(() => strictParse('[{"nested":' + raw + '}]'), verificationError('duplicate_key'));
    }
    assert.doesNotThrow(() => strictParse('{' + literal + ':1}'));
  }),
);
propertyTest(
  meta('portable-number-lexemes', 31202),
  fc.property(fc.integer({min: 1, max: 1000000}), n => {
    assert.equal(strictParse(String(n)), n);
    for (const raw of [n + '.0', n + 'e0', n + '.5', n + 'e-4'])
      assert.throws(() => strictParse(raw), verificationError('non_integer_lexeme'));
  }),
);
propertyTest(
  meta('historical-number-lexemes', 31203, 'deterministic-json-sort-keys-v0'),
  fc.property(fc.integer({min: -1000000, max: 1000000}), n => {
    const value = n + 0.5;
    assert.equal(strictParse(String(value), {historical: true}), value);
    assert.throws(
      () => strictParse(String(n) + '.0', {historical: true}),
      verificationError('historical_numeric_unsupported'),
    );
    assert.throws(
      () => strictParse(String(n) + 'e0', {historical: true}),
      verificationError('historical_numeric_unsupported'),
    );
  }),
);
propertyTest(
  {...meta('raw-number-boundaries', 31204, 'portable and historical declared numeric domains'), runs: 1},
  fc.property(fc.constant(null), () => {
    for (const raw of ['-9007199254740991', '0', '9007199254740991']) {
      assert.equal(strictParse(raw), Number(raw));
      assert.equal(strictParse(raw, {historical: true}), Number(raw));
    }
    /** @type {Array<[string,string]>} */
    const rejected = [
      ['-0', 'negative_zero'],
      ['9007199254740992', 'unsafe_integer'],
      ['-9007199254740992', 'unsafe_integer'],
      ['NaN', 'invalid_number'],
      ['Infinity', 'invalid_number'],
      ['-Infinity', 'invalid_number'],
      ['01', 'invalid_json'],
      ['+1', 'invalid_json'],
      ['-', 'invalid_json'],
    ];
    for (const [raw, reason] of rejected)
      for (const historical of [false, true])
        assert.throws(() => strictParse(raw, {historical}), verificationError(reason));
    for (const raw of ['1.0', '1e0', '0.5', '0.0001', '1e400'])
      assert.throws(() => strictParse(raw), verificationError('non_integer_lexeme'));
    for (const raw of ['0.0001', '-0.0001', '1e-4', '-1e-4', '0.0001000000001', '1.5', '4503599627370495.5'])
      assert.equal(strictParse(raw, {historical: true}), Number(raw));
    for (const raw of [
      '0.0000999999999',
      '-0.0000999999999',
      '1e-5',
      '1.0',
      '1e0',
      '-0.0',
      '1e16',
      '1e400',
      '9999999999999999.5',
      '9007199254740990.5',
    ])
      assert.throws(() => strictParse(raw, {historical: true}), verificationError('historical_numeric_unsupported'));
  }),
);
propertyTest(
  meta('raw-utf8', 31205),
  fc.property(unicodeString, value => {
    assert.equal(strictParse(bytes.encode(JSON.stringify(value))), value);
    for (const hex of ['22ff22', '22c0af22', '22eda08022', '22f490808022', '22e28222'])
      assert.throws(() => strictParse(Uint8Array.from(Buffer.from(hex, 'hex'))), verificationError('invalid_utf8'));
    assert.throws(
      () => strictParse(Uint8Array.from(Buffer.from('efbbbf7b7d', 'hex'))),
      verificationError('bom_forbidden'),
    );
    assert.throws(() => strictParse('\ufeff{}'), verificationError('bom_forbidden'));
  }),
);
propertyTest(
  meta('raw-structure', 31206),
  fc.property(fc.integer({min: 0, max: 1000000}), n => {
    for (const raw of ['', ' ', '[1,]', '{"x":1,}', '[', '{', String(n) + ' true', String(n) + '/*tail*/', '"unclosed'])
      assert.throws(() => strictParse(raw), verificationError('invalid_json'));
    assert.equal(strictParse(' \r\n' + n + '\t '), n);
  }),
);
propertyTest(
  {...meta('depth-boundary', 31207), runs: 1},
  fc.property(fc.constant(null), () => {
    // Root value is depth zero. A scalar under 64 array edges is admitted; under 65 it is refused.
    for (const depth of [0, 1, 63, 64]) {
      const raw = '['.repeat(depth) + '0' + ']'.repeat(depth);
      assert.doesNotThrow(() => strictParse(raw));
      assert.deepEqual(canonical(strictParse(raw)), bytes.encode(raw));
    }
    const raw = '['.repeat(65) + '0' + ']'.repeat(65);
    assert.throws(() => strictParse(raw), verificationError('depth_limit'));
    let value = 0;
    /** @type {unknown} */ let nested = value;
    for (let i = 0; i < 65; i++) nested = [nested];
    assert.throws(() => canonical(nested), verificationError('depth_limit'));
  }),
);
