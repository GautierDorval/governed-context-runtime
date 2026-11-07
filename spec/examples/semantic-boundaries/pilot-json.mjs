// SPDX-License-Identifier: Apache-2.0
// Provider JSON permits finite decimals; the package's integer-only wire profile does not.
export function parseProviderJson(text) {
  if (typeof text !== 'string' || text.length > 4_194_304 || !text.isWellFormed()) throw new TypeError('provider_json');
  let at = 0;
  const fail = () => { throw new TypeError('provider_json'); };
  const ws = () => { while (/[\x20\t\r\n]/.test(text[at] ?? 'x')) at++; };
  function string() {
    const start = at++;
    while (at < text.length) {
      const ch = text[at++];
      if (ch === '\\') { at++; continue; }
      if (ch === '"') {
        const value = JSON.parse(text.slice(start, at));
        if (!value.isWellFormed()) fail();
        return value;
      }
    }
    fail();
  }
  function value(depth) {
    if (depth > 64) fail();
    ws();
    if (text[at] === '"') return string();
    if (text[at] === '[' || text[at] === '{') {
      const object = text[at++] === '{';
      const result = object ? Object.create(null) : [];
      const end = object ? '}' : ']';
      ws();
      if (text[at] === end) { at++; return result; }
      while (at < text.length) {
        if (object) {
          ws(); if (text[at] !== '"') fail();
          const key = string();
          if (Object.hasOwn(result, key)) fail();
          ws(); if (text[at++] !== ':') fail();
          result[key] = value(depth + 1);
        } else result.push(value(depth + 1));
        ws(); if (text[at] === end) { at++; return result; }
        if (text[at++] !== ',') fail();
      }
      fail();
    }
    for (const [literal, result] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(literal, at)) { at += literal.length; return result; }
    }
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(at));
    if (!match) fail();
    at += match[0].length;
    const number = Number(match[0]);
    if (!Number.isFinite(number) || (Number.isInteger(number) && !Number.isSafeInteger(number))) fail();
    return number;
  }
  const parsed = value(0);
  ws(); if (at !== text.length) fail();
  return parsed;
}

export async function digestBytes(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function assertValue(value, code) {
  if (!value) throw new TypeError(code);
}
