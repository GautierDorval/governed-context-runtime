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

test('entry documents bind the hosted service, reference and illustrative context to their source', async () => {
  const readme = await read('README.md');
  const today = readme.indexOf('## What you can use today');
  const demo = readme.indexOf('## Try it locally');
  assert(today > 0 && today < demo);
  assert(readme.indexOf('https://context.gautierdorval.com/') < today);
  assert(readme.indexOf('This repository provides the proposed contracts') < today);
  for (const field of ['useCase', 'benefits', 'status', 'architectureCaption'])
    assert(readme.includes(source.en[field]), 'README source: ' + field);
  assert(readme.includes('Fictional workshop example'));
  assert(readme.includes('evidence/instance-2026-10-14.json'));
  assert(readme.includes('evidence/instance-2026-10-12.json'));
  for (const lang of ['en', 'fr']) {
    const guide = await read('docs/' + lang + '/README.md');
    const fields = lang === 'en' ? source.en : source.fr;
    for (const [field, value] of Object.entries(fields))
      assert(guide.includes(value), lang + ' shared field: ' + field);
    assert(guide.includes('https://context.gautierdorval.com/'));
    assert(guide.includes('instance.md'));
    assert(guide.includes('../verification.md'));
    assert(guide.includes('VERIFIED_FICTIONAL_CONTEXT'));
    assert(guide.includes('../../evidence/README.md'));
  }
});

test('entry links and anchors resolve from each containing document', async () => {
  const paths = ['README.md', 'docs/en/README.md', 'docs/fr/README.md', 'evidence/README.md'];
  for (const path of paths) {
    const body = await read(path);
    for (const match of body.matchAll(/\]\(([^)\s]+)\)/g)) {
      const href = match[1];
      if (/^https?:/.test(href)) continue;
      const [relative, fragment] = href.split('#');
      const target = new URL(relative, new URL('../' + path, import.meta.url));
      const targetText = await readFile(target, 'utf8');
      if (fragment) {
        const anchors = [...targetText.matchAll(/^#{1,6} (.+)$/gm)].map(heading =>
          heading[1]
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s_-]/gu, '')
            .replace(/ /g, '-'),
        );
        assert(anchors.includes(decodeURIComponent(fragment)), path + ': ' + href);
      }
    }
  }
});

test('synthetic evidence and dated service observations remain distinct entry paths', async () => {
  const evidence = await read('evidence/README.md');
  assert(evidence.includes('evidence/publication.json'));
  assert(evidence.includes('instance-2026-10-14.json'));
  assert(evidence.includes('Historical hosted instance observation, October 12, 2026'));
  assert(evidence.includes('model-fidelity experiments, which remain `NOT_RUN`'));
  for (const lang of ['en', 'fr']) {
    const guide = await read('docs/' + lang + '/README.md');
    const heading = lang === 'en' ? 'Applications to explore' : 'Applications à explorer';
    const section = guide.split('## ' + heading + '\n')[1]?.split('\n## ')[0];
    assert(section, heading);
    assert.equal(section.split('\n').filter(line => line.startsWith('| ')).length, 4);
    const instance = await read('docs/' + lang + '/instance.md');
    assert(instance.indexOf('instance-2026-10-14.json') < instance.indexOf('instance-2026-10-12.json'));
  }
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
