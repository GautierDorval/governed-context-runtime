// SPDX-License-Identifier: Apache-2.0
// The closed SVG profile admits the published visuals and refuses active or ambiguous markup,
// including the two cases reported against the former regular-expression filter: an SMIL <set>
// that rewrites an href and a CSS @import. Every input is a string; nothing is rendered or fetched.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {checkSvg} from '../scripts/svg-profile.mjs';

const encode = (/** @type {string} */ text) => new TextEncoder().encode(text);
const OPEN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" role="img" aria-labelledby="t"><title id="t">T</title>';
const wrap = (/** @type {string} */ body) => encode(OPEN + body + '</svg>\n');
const refused = (/** @type {Uint8Array} */ bytes, /** @type {RegExp} */ reason) => {
  const findings = checkSvg(bytes);
  assert(findings.length > 0, 'expected a refusal');
  assert.match(findings.join('; '), reason);
};

test('every published SVG asset is admitted', async () => {
  const assets = (await readdir(new URL('../assets/', import.meta.url))).filter(name => name.endsWith('.svg'));
  assert(assets.length >= 4);
  for (const name of assets)
    assert.deepEqual(checkSvg(await readFile(new URL('../assets/' + name, import.meta.url))), [], name);
  assert.deepEqual(checkSvg(wrap('<text x="1" y="2" fill="#000">a &amp; b &#233; &#xe9;</text>')), []);
});

test('the reported SMIL and CSS cases are refused, although the former filter accepted them', () => {
  // The regular expression used by check-package.mjs up to the 2026-10-13 edition, kept here as the reproduced finding.
  const FORMER_FILTER = /<script|<foreignObject|<!ENTITY|<!DOCTYPE|\bon\w+\s*=|\b(?:href|src)\s*=|url\s*\(/i;
  const smil = '<a href="#x"><set attributeName="href" to="javascript:alert(1)"/></a>'.replace('href="#x"', 'id="x"');
  const css = '<style>@import "https://example.invalid/x.css";</style>';
  for (const body of [smil, css]) {
    assert.equal(FORMER_FILTER.test(OPEN + body + '</svg>'), false, 'reproduction: the former filter accepted ' + body);
    assert.notDeepEqual(checkSvg(wrap(body)), []);
  }
  refused(
    wrap('<a href="#x"><set attributeName="href" to="javascript:alert(1)"/></a>'),
    /element outside the profile: a/,
  );
  refused(wrap('<set attributeName="href" to="https://example.invalid/"/>'), /element outside the profile: set/);
  refused(wrap('<style>@import url(https://example.invalid/x.css);</style>'), /element outside the profile: style/);
  refused(
    wrap('<rect x="0" y="0" width="1" height="1" style="fill:url(https://example.invalid/#p)"/>'),
    /attribute outside the profile: rect@style/,
  );
});

test('scripts, events, links, foreign content, animation and unknown elements are refused', () => {
  for (const [body, reason] of [
    ['<script>alert(1)</script>', /element outside the profile: script/],
    ['<rect x="0" y="0" width="1" height="1" onload="alert(1)"/>', /attribute outside the profile: rect@onload/],
    ['<foreignObject width="1" height="1"></foreignObject>', /element outside the profile: foreignObject/],
    ['<animate attributeName="fill" to="#000"/>', /element outside the profile: animate/],
    ['<use href="https://example.invalid/sprite.svg#a"/>', /element outside the profile: use/],
    ['<image href="https://example.invalid/a.png" width="1" height="1"/>', /element outside the profile: image/],
    ['<g><rect x="0" y="0" width="1" height="1"/></g>', /element outside the profile: g/],
    ['<path d="M0 0" fill="url(#p)"/>', /value outside the profile: path@fill/],
    ['<text x="1" y="1" font-family="Comic Sans MS">a</text>', /value outside the profile: text@font-family/],
    ['<rect x="0" y="0" width="1" height="1" class="c"/>', /attribute outside the profile: rect@class/],
  ])
    refused(wrap(/** @type {string} */ (body)), /** @type {RegExp} */ (reason));
});

test('case variants, prefixes and character references do not bypass the profile', () => {
  refused(wrap('<SCRIPT>alert(1)</SCRIPT>'), /element outside the profile: SCRIPT/);
  refused(wrap('<Rect x="0" y="0" width="1" height="1"/>'), /element outside the profile: Rect/);
  refused(wrap('<rect X="0" y="0" width="1" height="1"/>'), /attribute outside the profile: rect@X/);
  refused(
    wrap('<svg:script xmlns:svg="http://www.w3.org/2000/svg">x</svg:script>'),
    /element outside the profile: svg:script/,
  );
  refused(
    wrap('<rect x="0" y="0" width="1" height="1" xlink:href="#a"/>'),
    /attribute outside the profile: rect@xlink:href/,
  );
  refused(wrap('<rect x="0" y="0" width="1" height="1" fill="&#35;000"/>'), /character reference in an attribute/);
  refused(wrap('<text x="1" y="1">&nbsp;</text>'), /character reference outside the profile/);
  refused(wrap('<text x="1" y="1">&#0;</text>'), /character reference outside the profile/);
  refused(wrap('<text x="1" y="1">a &amp b</text>'), /character reference outside the profile/);
  refused(
    encode(OPEN.replace('xmlns="http://www.w3.org/2000/svg"', 'xmlns="http://www.w3.org/1999/xhtml"') + '</svg>'),
    /value outside the profile: svg@xmlns/,
  );
});

test('declarations, instructions, comments and CDATA are refused before any rendering', () => {
  refused(
    encode('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + OPEN + '</svg>'),
    /markup outside the profile/,
  );
  refused(
    encode('<?xml-stylesheet href="https://example.invalid/x.css"?>' + OPEN + '</svg>'),
    /markup outside the profile/,
  );
  refused(wrap('<!-- note -->'), /markup outside the profile/);
  refused(wrap('<text x="1" y="1"><![CDATA[<script>]]></text>'), /markup outside the profile/);
});

test('malformed, nested, oversized and trailing content is refused', () => {
  refused(encode(OPEN + '<text x="1" y="1">a</title></svg>'), /mismatched end tag/);
  refused(encode(OPEN + '<text x="1" y="1">a</text>'), /unclosed or missing root/);
  refused(wrap('<text x="1" y="1" y="2">a</text>'), /duplicate attribute/);
  refused(wrap('<rect x=\'0\' y="0" width="1" height="1"/>'), /markup outside the profile/);
  refused(wrap('<text x="1" y="1"><title>a</title></text>'), /unexpected position: title/);
  refused(wrap('loose text'), /text outside a text element/);
  refused(
    encode(OPEN + '</svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>'),
    /after the root element/,
  );
  refused(encode(OPEN + '<text x="1" y="1">' + 'a'.repeat(70000) + '</text></svg>'), /size/);
  refused(new Uint8Array([0x3c, 0xff, 0xfe]), /encoding/);
  refused(encode(OPEN.slice(0, 40)), /markup outside the profile/);
});

test('an aria label must point to a declared title', () => {
  refused(
    encode(OPEN.replace('aria-labelledby="t"', 'aria-labelledby="missing"') + '</svg>'),
    /without a matching id: missing/,
  );
});
