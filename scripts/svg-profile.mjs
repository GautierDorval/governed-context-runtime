// SPDX-License-Identifier: Apache-2.0
// Closed SVG profile for the static diagrams and visuals of this package. A strict XML reader
// accepts only what the profile names: no DTD, entity declaration, processing instruction,
// comment, CDATA section, namespace prefix, style, script, animation, link or URL. It reads
// bytes and returns findings; it never renders, fetches or rewrites an asset.

const MAX_BYTES = 64 * 1024;
const MAX_DEPTH = 4;
const MAX_ELEMENTS = 400;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const number = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const colour = /^(?:#[0-9a-f]{3}|#[0-9a-f]{6}|none)$/i;
const identifier = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const pathData = /^[MLHVCSQTAZmlhvcsqtaz0-9 ,.-]{1,4096}$/;

/** @type {Record<string, (value: string) => boolean>} */
const VALUES = {
  xmlns: value => value === SVG_NAMESPACE,
  width: value => number.test(value),
  height: value => number.test(value),
  x: value => number.test(value),
  y: value => number.test(value),
  rx: value => number.test(value),
  'stroke-width': value => number.test(value),
  'font-size': value => number.test(value),
  viewBox: value => value.split(' ').length === 4 && value.split(' ').every(part => number.test(part)),
  role: value => value === 'img',
  'aria-labelledby': value => identifier.test(value),
  id: value => identifier.test(value),
  fill: value => colour.test(value),
  stroke: value => colour.test(value),
  'font-family': value => value === 'Arial, sans-serif',
  'font-weight': value => value === '400' || value === '700',
  d: value => pathData.test(value),
};

/** Elements, their admitted attributes and whether they hold text. */
const ELEMENTS = {
  svg: {attributes: ['xmlns', 'width', 'height', 'viewBox', 'role', 'aria-labelledby'], text: false},
  title: {attributes: ['id'], text: true},
  rect: {attributes: ['x', 'y', 'width', 'height', 'rx', 'fill', 'stroke', 'stroke-width'], text: false},
  path: {attributes: ['d', 'fill', 'stroke', 'stroke-width'], text: false},
  text: {attributes: ['x', 'y', 'font-family', 'font-size', 'font-weight', 'fill'], text: true},
};
const PARENTS = {svg: [''], title: ['svg'], rect: ['svg'], path: ['svg'], text: ['svg']};
const PREDEFINED = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};
// XML 1.0 whitespace and Char production; JavaScript whitespace is wider and is not used here.
const XML_BLANK = /^[ \t\r\n]*$/;
/** @param {number} code */
const xmlChar = code =>
  code === 0x9 ||
  code === 0xa ||
  code === 0xd ||
  (code >= 0x20 && code <= 0xd7ff) ||
  (code >= 0xe000 && code <= 0xfffd) ||
  (code >= 0x10000 && code <= 0x10ffff);

/**
 * Decodes the five predefined entities and numeric character references; any other reference is refused.
 * @param {string} raw
 * @returns {string | null}
 */
function decode(raw) {
  let failed = false;
  const value = raw.replace(/&([^;&]*);?/g, (match, name) => {
    if (!match.endsWith(';')) return ((failed = true), '');
    if (Object.hasOwn(PREDEFINED, name)) return PREDEFINED[/** @type {keyof typeof PREDEFINED} */ (name)];
    const numeric = /^#(?:([0-9]{1,7})|x([0-9a-fA-F]{1,6}))$/.exec(name);
    const code = numeric ? Number.parseInt(numeric[1] ?? numeric[2], numeric[1] ? 10 : 16) : NaN;
    if (!numeric || !xmlChar(code)) return ((failed = true), '');
    return String.fromCodePoint(code);
  });
  return failed ? null : value;
}

/**
 * Checks one SVG asset against the closed profile.
 * @param {Uint8Array} bytes
 * @returns {string[]} findings; an empty list means the asset is admitted
 */
export function checkSvg(bytes) {
  if (bytes.length > MAX_BYTES) return ['size: more than ' + MAX_BYTES + ' bytes'];
  let source;
  try {
    source = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);
  } catch {
    return ['encoding: not UTF-8'];
  }
  if (source.charCodeAt(0) === 0xfeff) return ['encoding: byte order mark'];
  for (const char of source) if (!xmlChar(char.codePointAt(0) ?? 0)) return ['encoding: character outside XML 1.0'];
  /** @type {string[]} */
  const findings = [];
  /** @type {string[]} */
  const stack = [];
  /** @type {Set<string>} */
  const ids = new Set();
  /** @type {string[]} */
  const labels = [];
  let elements = 0;
  let index = 0;
  let closedRoot = false;
  const fail = (/** @type {string} */ finding) => (findings.push(finding + ' at offset ' + index), findings);
  while (index < source.length) {
    if (source[index] !== '<') {
      const end = source.indexOf('<', index);
      const raw = source.slice(index, end === -1 ? source.length : end);
      const parent = stack.at(-1) ?? '';
      const blank = XML_BLANK.test(raw);
      if (!blank && (!parent || !ELEMENTS[/** @type {keyof typeof ELEMENTS} */ (parent)].text))
        return fail('text outside a text element');
      if (closedRoot && !blank) return fail('content after the root element');
      if (raw.includes(']]>')) return fail('character data containing ]]>');
      if (decode(raw) === null) return fail('character reference outside the profile');
      index = end === -1 ? source.length : end;
      continue;
    }
    if (source.startsWith('</', index)) {
      const match = /^<\/([A-Za-z][A-Za-z0-9]*)>/.exec(source.slice(index));
      if (!match || match[1] !== stack.at(-1)) return fail('malformed or mismatched end tag');
      stack.pop();
      if (!stack.length) closedRoot = true;
      index += match[0].length;
      continue;
    }
    const tag = /^<([A-Za-z][A-Za-z0-9:_.-]*)((?:[ \t\r\n]+[^ \t\r\n=/>]+="[^"<]*")*)[ \t\r\n]*(\/?)>/.exec(
      source.slice(index),
    );
    if (!tag) return fail('markup outside the profile (declaration, instruction, comment, CDATA or malformed tag)');
    const [whole, name, attributeText, selfClosing] = tag;
    if (closedRoot) return fail('content after the root element');
    if (!Object.hasOwn(ELEMENTS, name)) return fail('element outside the profile: ' + name);
    const element = ELEMENTS[/** @type {keyof typeof ELEMENTS} */ (name)];
    const parent = stack.at(-1) ?? '';
    if (!PARENTS[/** @type {keyof typeof PARENTS} */ (name)].includes(parent))
      return fail('element in an unexpected position: ' + name);
    if (++elements > MAX_ELEMENTS) return fail('too many elements');
    /** @type {Set<string>} */
    const seen = new Set();
    for (const attribute of attributeText.matchAll(/[ \t\r\n]+([^ \t\r\n=/>]+)="([^"<]*)"/g)) {
      const [, key, raw] = attribute;
      if (seen.has(key)) return fail('duplicate attribute: ' + key);
      seen.add(key);
      if (!element.attributes.includes(key)) return fail('attribute outside the profile: ' + name + '@' + key);
      const value = decode(raw);
      if (value === null || value !== raw) return fail('character reference in an attribute: ' + name + '@' + key);
      if (!VALUES[key](value)) return fail('value outside the profile: ' + name + '@' + key);
      if (key === 'id') ids.add(value);
      if (key === 'aria-labelledby') labels.push(value);
    }
    if (name === 'svg' && (!seen.has('xmlns') || !seen.has('viewBox')))
      return fail('root without the SVG namespace or viewBox');
    if (!selfClosing) {
      stack.push(name);
      if (stack.length > MAX_DEPTH) return fail('nesting too deep');
    } else if (!stack.length) closedRoot = true;
    index += whole.length;
  }
  if (stack.length || !closedRoot) return fail('unclosed or missing root element');
  for (const label of labels) if (!ids.has(label)) findings.push('aria-labelledby without a matching id: ' + label);
  return findings;
}
