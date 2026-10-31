// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import * as reference from '../../spec/reference/verification.mjs';
import {
  portableValue,
  keyOrderPair,
  nfcPair,
  asciiString,
  unicodeString,
  pythonWhitespace,
  reverseInsertion,
} from './arbitraries.mjs';
import {equalBytes, pairBytes, verificationError, bytes} from './oracles.mjs';
import {propertyTest} from './harness.mjs';
/** @import {Configuration} from './harness.mjs' */
/** @param {typeof reference} subject @param {Configuration} [config] */
export function registerCanonicalization(subject = reference, config = {}) {
  /** @param {string} id @param {string} profile @param {number} seed */
  const meta = (id, profile, seed) => ({id, profile, seed});
  const portable = 'gd-portable-json-v1',
    historical = 'deterministic-json-sort-keys-v0',
    nfc = 'gd-deterministic-json-v1';
  propertyTest(
    meta('portable-key-order', portable, 31001),
    fc.property(keyOrderPair, ([bmp, supplementary]) => {
      const b = String.fromCodePoint(bmp),
        s = String.fromCodePoint(supplementary);
      /** @type {Uint8Array | undefined} */ let actual;
      assert.doesNotThrow(() => {
        actual = subject.canonical({[b]: 1, [s]: 2});
      });
      assert(actual instanceof Uint8Array);
      equalBytes(actual, pairBytes(s, 2, b, 1));
    }),
    config,
  );
  propertyTest(
    meta('historical-key-order', historical, 31002),
    fc.property(keyOrderPair, ([bmp, supplementary]) => {
      const b = String.fromCodePoint(bmp),
        s = String.fromCodePoint(supplementary);
      equalBytes(subject.canonical({[s]: 2, [b]: 1}, {historical: true}), pairBytes(b, 1, s, 2));
    }),
    config,
  );
  propertyTest(
    meta('nfc-key-order', nfc, 31013),
    fc.property(
      fc.tuple(fc.integer({min: 0xe000, max: 0xf8ff}), fc.integer({min: 0xf0000, max: 0xffffd})),
      ([bmp, supplementary]) => {
        // Private-use code points are NFC-inert; no verifier-dependent filtering.
        const b = String.fromCodePoint(bmp),
          s = String.fromCodePoint(supplementary);
        equalBytes(subject.canonical({[s]: 2, [b]: 1}, {historical: true, nfc: true}), pairBytes(b, 1, s, 2));
      },
    ),
    config,
  );
  propertyTest(
    meta('json-insertion-order', 'portable / historical / NFC safe-integer domain', 31003),
    fc.property(portableValue, value => {
      // A relational property, supplemented by independent literal and Python witnesses.
      for (const options of [{}, {historical: true}, {historical: true, nfc: true}]) {
        assert.doesNotThrow(() => subject.canonical(value, options));
        assert.deepEqual(subject.canonical(value, options), subject.canonical(reverseInsertion(value), options));
        const left = {10: value, 2: {z: false, a: true}, '01': null};
        const right = {'01': null, 2: {a: true, z: false}, 10: value};
        assert.deepEqual(subject.canonical(left, options), subject.canonical(right, options));
      }
    }),
    config,
  );
  propertyTest(
    meta('array-order', portable, 31004),
    fc.property(fc.integer({min: -1000000, max: 1000000}), n => {
      equalBytes(subject.canonical([n, n + 1]), `[${n},${n + 1}]`);
      assert.notDeepEqual(subject.canonical([n, n + 1]), subject.canonical([n + 1, n]));
    }),
    config,
  );
  propertyTest(
    meta('json-escape-equivalence', portable, 31005),
    fc.property(unicodeString, value => {
      let escaped = '"';
      for (let i = 0; i < value.length; i++) escaped += '\\u' + value.charCodeAt(i).toString(16).padStart(4, '0');
      escaped += '"';
      assert.doesNotThrow(() => subject.strictParse(escaped));
      assert.deepEqual(
        subject.canonical(subject.strictParse(escaped)),
        subject.canonical(subject.strictParse(JSON.stringify(value))),
      );
      equalBytes(subject.canonical(subject.strictParse(escaped)), JSON.stringify(value));
    }),
    config,
  );
  propertyTest(
    meta('nfc-preservation', 'portable / historical / NFC', 31006),
    fc.property(asciiString, nfcPair, (prefix, [decomposed, composed]) => {
      for (const options of [{}, {historical: true}]) {
        equalBytes(subject.canonical(prefix + decomposed, options), JSON.stringify(prefix + decomposed));
        assert.notDeepEqual(
          subject.canonical(prefix + decomposed, options),
          subject.canonical(prefix + composed, options),
        );
      }
      equalBytes(
        subject.canonical(prefix + decomposed, {historical: true, nfc: true}),
        JSON.stringify(prefix + composed),
      );
    }),
    config,
  );
  propertyTest(
    meta('nfc-collision', nfc, 31007),
    fc.property(asciiString, nfcPair, (prefix, [decomposed, composed]) => {
      const value = {[prefix + decomposed]: 1, [prefix + composed]: 2};
      assert.throws(
        () => subject.canonical(value, {historical: true, nfc: true}),
        verificationError('normalized_key_collision'),
      );
      assert.doesNotThrow(() => subject.canonical(value));
      assert.doesNotThrow(() => subject.canonical(value, {historical: true}));
    }),
    config,
  );
  propertyTest(
    meta('portable-roundtrip', portable, 31008),
    fc.property(portableValue, value => {
      assert.doesNotThrow(() => subject.canonical(value));
      const first = subject.canonical(value);
      assert.doesNotThrow(() => subject.strictParse(first));
      assert.deepEqual(subject.canonical(subject.strictParse(first)), first);
    }),
    config,
  );
  propertyTest(
    meta('text-profile', 'utf8-nfc-lf-trimmed-v0', 31009),
    fc.property(
      fc.array(fc.constantFrom(...pythonWhitespace), {maxLength: 8}),
      nfcPair,
      fc.constantFrom(...pythonWhitespace),
      (padding, [decomposed, composed], middle) => {
        const pad = String.fromCodePoint(...padding),
          interior = String.fromCodePoint(middle);
        equalBytes(
          subject.textBytes(pad + 'pre' + decomposed + '\r\nA' + interior + 'B\rCpost' + pad),
          'pre' +
            composed +
            '\nA' +
            (middle === 13 ? '\n' : middle === 0x2000 ? '\u2002' : middle === 0x2001 ? '\u2003' : interior) +
            'B\nCpost',
        );
        equalBytes(subject.textBytes('\ufeff' + decomposed + '\ufeff'), '\ufeff' + composed + '\ufeff');
      },
    ),
    config,
  );
  propertyTest(
    {...meta('text-whitespace-witnesses', 'utf8-nfc-lf-trimmed-v0', 31010), runs: 1},
    fc.property(fc.constant(null), () => {
      assert.equal(pythonWhitespace.length, 29);
      for (const point of pythonWhitespace)
        equalBytes(subject.textBytes(String.fromCodePoint(point) + 'x' + String.fromCodePoint(point)), 'x');
      equalBytes(subject.textBytes(''), '');
    }),
    config,
  );
  propertyTest(
    meta('surrogate-rejection', 'Unicode rejection: portable and text', 31011),
    fc.property(fc.integer({min: 0xd800, max: 0xdfff}), asciiString, (point, prefix) => {
      const value = prefix + String.fromCharCode(point);
      assert.throws(() => subject.textBytes(value), verificationError('invalid_unicode'));
      assert.throws(() => subject.canonical(value), verificationError('invalid_unicode'));
      assert.throws(() => subject.strictParse(JSON.stringify(value)), verificationError('invalid_unicode'));
    }),
    config,
  );
  propertyTest(
    meta('unit-envelope-coverage', 'attested-interpretive-unit-envelope-v0', 31012),
    fc.property(unicodeString, portableValue, (value, uncovered) => {
      const unit = {
        unitId: 'u',
        sourcePath: 'fixture.json',
        selector: '$.x',
        claimClass: 'fictional',
        authorityScope: 'fixture',
        canonicalSource: 'urn:fixture',
        canonicalText: value,
        digest: 'sha-256:' + '0'.repeat(64),
        digestScope: 'canonical_interpretive_unit_envelope',
        canonicalization: 'attested-interpretive-unit-envelope-v0',
        forbiddenTransformations: uncovered,
      };
      const expected =
        '{"authorityScope":"fixture","canonicalSource":"urn:fixture","canonicalText":' +
        JSON.stringify(value) +
        ',"claimClass":"fictional","selector":"$.x","sourcePath":"fixture.json","unitId":"u"}';
      equalBytes(subject.unitPreimage(unit, '{"x":false}'), expected);
      equalBytes(
        subject.unitPreimage({...unit, forbiddenTransformations: null, extra: uncovered}, '{"x":false}'),
        expected,
      );
      assert.notDeepEqual(
        subject.unitPreimage({...unit, canonicalText: value + 'x'}, '{"x":false}'),
        bytes.encode(expected),
      );
    }),
    config,
  );
  /** @type {{cases: Array<{id:string, profile:string, input:{kind:string,rawJson?:string,hex?:string,text?:string},
   * steps:Array<{function:string,options?:{historical?:boolean,nfc?:boolean}}>,expected:{status:string,stage?:string,errorName?:string,errorMessage?:string,canonicalText?:string,text?:string}}>}} */
  const vectors = JSON.parse(readFileSync(new URL('./acceptance-vectors.json', import.meta.url), 'utf8'));
  for (const [index, vector] of vectors.cases.entries()) {
    propertyTest(
      {...meta('vector-' + vector.id, vector.profile, 31100 + index), runs: 1},
      fc.property(fc.constant(null), () => {
        /** @type {unknown} */ let value =
          vector.input.kind === 'utf8-bytes-hex'
            ? Uint8Array.from(Buffer.from(vector.input.hex ?? '', 'hex'))
            : (vector.input.rawJson ?? vector.input.text);
        for (const step of vector.steps) {
          const perform = () =>
            step.function === 'strictParse'
              ? subject.strictParse(/** @type {string|Uint8Array} */ (value), step.options)
              : step.function === 'canonical'
                ? subject.canonical(value, step.options)
                : subject.textBytes(/** @type {string} */ (value));
          if (vector.expected.status === 'reject' && vector.expected.stage === step.function) {
            assert.throws(perform, {name: vector.expected.errorName, message: vector.expected.errorMessage});
            return;
          }
          assert.doesNotThrow(() => {
            value = perform();
          });
        }
        assert.equal(vector.expected.status, 'accept', 'expected rejection was not reached');
        equalBytes(/** @type {Uint8Array} */ (value), vector.expected.canonicalText ?? vector.expected.text ?? '');
      }),
      config,
    );
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) registerCanonicalization();
