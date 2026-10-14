// SPDX-License-Identifier: Apache-2.0
// Targeted editorial checks: French typography in prose, paired numbers between the English and
// French source fields, the README rendering of its source and the French diagrams. These checks
// find mechanical drift; they do not establish that two texts mean the same thing, which remains
// a review task. Code spans, code blocks, link targets and URLs are excluded from typography.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';

const read = (/** @type {string} */ path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
/** @type {{en: Record<string, string>, fr: Record<string, string>, [key: string]: unknown}} */
const source = JSON.parse(await read('docs/source.json'));
const NBSP = String.fromCharCode(0xa0),
  NNBSP = String.fromCharCode(0x202f);

/** @param {string} text */
const prose = text =>
  text
    .replace(/```[\s\S]*?```/g, 'CODE')
    .replace(/`[^`]*`/g, 'CODE')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/https?:\/\/\S+/g, 'URL');

/** @param {string} text @returns {string[]} */
function frenchFindings(text) {
  const body = prose(text);
  /** @type {string[]} */
  const findings = [];
  const excerpt = (/** @type {number} */ at) => JSON.stringify(body.slice(Math.max(0, at - 20), at + 12));
  for (const match of body.matchAll(/([^\n])([;:!?%])/g)) {
    const [, before, mark] = match;
    const at = match.index ?? 0;
    if (mark === ':' && /[0-9]/.test(before)) continue; // times such as 12:00 UTC
    if (before !== NBSP && before !== NNBSP && /[\p{L}\p{N})»*]|\s/u.test(before))
      findings.push('missing non-breaking space before ' + mark + ' ' + excerpt(at));
  }
  for (const match of body.matchAll(/«(.)|(.)»/g)) {
    const inner = match[1] ?? match[2];
    if (inner !== NNBSP) findings.push('guillemets without narrow non-breaking space ' + excerpt(match.index ?? 0));
  }
  for (const [pattern, name] of /** @type {[RegExp, string][]} */ ([
    [/\u2013/g, 'en dash'],
    [/\u2014/g, 'em dash'],
    [/[^\s] {2,}[^\s]/g, 'double space'],
    [/\bfixtures?\b/gi, 'fixture in French prose'],
  ]))
    for (const match of body.matchAll(pattern)) findings.push(name + ' ' + excerpt(match.index ?? 0));
  return findings;
}

test('French guides and source fields follow the typographic rules outside code', async () => {
  const guides = (await readdir(new URL('../docs/fr/', import.meta.url))).filter(name => name.endsWith('.md'));
  assert(guides.length >= 2);
  for (const name of guides) assert.deepEqual(frenchFindings(await read('docs/fr/' + name)), [], 'docs/fr/' + name);
  for (const [field, value] of Object.entries(source.fr)) assert.deepEqual(frenchFindings(value), [], 'fr.' + field);
});

test('the typography check itself refuses the defects it is meant to find', () => {
  for (const bad of [
    'réponse; toute',
    'démonstration : x',
    'Note: x',
    '« texte »',
    'a \u2013 b',
    'a \u2014 b',
    'deux  espaces',
    'La fixture fictive',
  ])
    assert.notDeepEqual(frenchFindings(bad), [], bad);
  for (const good of [
    'réponse' + NBSP + '; toute',
    'à 12:00 UTC',
    '«' + NNBSP + 'texte' + NNBSP + '»',
    '`code: x`',
    '[lien](https://a.example/b?c=d)',
  ])
    assert.deepEqual(frenchFindings(good), [], good);
});

test('paired English and French fields carry the same numbers', () => {
  const numbers = (/** @type {string} */ text) =>
    [...text.replace(/(\d)[\u202f\u00a0](?=\d{3}\b)/g, '$1').matchAll(/\d+(?:\.\d+)?/g)].map(match => match[0]).sort();
  assert.deepEqual(Object.keys(source.en).sort(), Object.keys(source.fr).sort());
  for (const field of Object.keys(source.en))
    assert.deepEqual(numbers(source.fr[field]), numbers(source.en[field]), field);
});

test('the README opening paragraph ends with the benefits field of its source', async () => {
  const readme = await read('README.md');
  const opening = readme.split('\n\n').find(paragraph => paragraph.startsWith('A versioned context pack'));
  assert(opening, 'opening paragraph');
  assert(opening.endsWith(' ' + source.en.benefits), 'rendered from docs/source.json');
  // The benefits field opens with a full sentence, not a verbless list.
  assert.match(source.en.benefits, /^Each pack is declared for one task, carries .+ and makes .+ explicit\./);
  assert.match(source.fr.benefits, /^Chaque pack est déclaré pour une tâche, porte .+ et rend explicites .+\./);
});

test('French guides use the French diagrams and every English diagram has a French variant', async () => {
  const frenchGuide = await read('docs/fr/README.md');
  const englishGuide = await read('docs/en/README.md');
  for (const match of englishGuide.matchAll(/\(\.\.\/\.\.\/assets\/([a-z]+)\.svg\)/g)) {
    assert(frenchGuide.includes('(../../assets/' + match[1] + '.fr.svg)'), match[1]);
    assert(!frenchGuide.includes('(../../assets/' + match[1] + '.svg)'), match[1]);
    await read('assets/' + match[1] + '.fr.svg');
  }
});

test('the tested-client tables have the same rows and outcomes in English and French', async () => {
  /** @param {string} text @param {string} heading */
  const rows = (text, heading) => {
    const section = text.split('\n## ').find(part => part.startsWith(heading));
    assert(section, heading);
    return section
      .split('\n')
      .filter(
        line => line.startsWith('| ') && !line.startsWith('| Client type') && !line.startsWith('| Type de client'),
      );
  };
  const english = rows(await read('docs/en/instance.md'), 'Tested clients');
  const french = rows(await read('docs/fr/instance.md'), 'Clients testés');
  assert.equal(french.length, english.length);
  /** @param {string} row */
  const outcome = row => row.split('|').at(-2)?.trim().split(/[ :]/)[0];
  const pairs = {Passed: 'Réussi', Refused: 'Refusé', Tool: 'Résultat', Not: 'Non'};
  english.forEach((row, i) =>
    assert.equal(outcome(french[i]), pairs[/** @type {keyof typeof pairs} */ (outcome(row))], row),
  );
});
