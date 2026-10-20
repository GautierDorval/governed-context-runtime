// SPDX-License-Identifier: Apache-2.0
// Independent reference implementation. No network or generator dependencies.
export const PROFILE = 'gd-portable-json-v1';
export const fail = code => { const error = new Error(code); error.name = 'VerificationError'; throw error; };
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
export function strictParse(input, { historical = false } = {}) {
  let text;
  try { text = typeof input === 'string' ? input : decoder.decode(input); } catch { fail('invalid_utf8'); }
  if (text.startsWith('\ufeff')) fail('bom_forbidden');
  let at = 0;
  const ws = () => { while (/[\x20\t\r\n]/.test(text[at] ?? 'x')) at++; };
  function string() {
    const start = at++;
    while (at < text.length) {
      const char = text[at++];
      if (char === '\\') { at++; continue; }
      if (char === '"') {
        let value;
        try { value = JSON.parse(text.slice(start, at)); } catch { fail('invalid_json'); }
        if (!value.isWellFormed()) fail('invalid_unicode');
        return value;
      }
    }
    fail('invalid_json');
  }
  function value(depth) {
    if (depth > 64) fail('depth_limit');
    ws();
    if (text[at] === '"') return string();
    if (text[at] === '{' || text[at] === '[') {
      const object = text[at++] === '{';
      const result = object ? Object.create(null) : [];
      const end = object ? '}' : ']';
      ws(); if (text[at] === end) { at++; return result; }
      while (at < text.length) {
        if (object) {
          ws(); if (text[at] !== '"') fail('invalid_json');
          const key = string();
          if (Object.hasOwn(result, key)) fail('duplicate_key');
          ws(); if (text[at++] !== ':') fail('invalid_json');
          result[key] = value(depth + 1);
        } else result.push(value(depth + 1));
        ws(); if (text[at] === end) { at++; return result; }
        if (text[at++] !== ',') fail('invalid_json');
      }
      fail('invalid_json');
    }
    for (const [literal, result] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(literal, at)) { at += literal.length; return result; }
    }
    if (/^(NaN|Infinity|-Infinity)/.test(text.slice(at))) fail('invalid_number');
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(at));
    if (!match) fail('invalid_json');
    const raw = match[0]; at += raw.length;
    if (/[.eE]/.test(raw)) {
      if (!historical) fail('non_integer_lexeme');
      const number = Number(raw);
      if (!Number.isFinite(number) || Number.isInteger(number) || Math.abs(number) < 0.0001 || Math.abs(number) >= 1e16) fail('historical_numeric_unsupported');
      return number;
    }
    if (raw === '-0') fail('negative_zero');
    const number = Number(raw);
    if (!Number.isSafeInteger(number)) fail('unsafe_integer');
    return number;
  }
  const result = value(0); ws();
  if (at !== text.length) fail('invalid_json');
  return result;
}
function codepointCompare(left, right) {
  const a = Array.from(left, char => char.codePointAt(0)), b = Array.from(right, char => char.codePointAt(0));
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}
export function canonical(value, { historical = false, nfc = false } = {}) {
  function encode(item, depth = 0) {
    if (depth > 64) fail('depth_limit');
    if (item === null || typeof item === 'boolean') return JSON.stringify(item);
    if (typeof item === 'number') {
      if (!Number.isSafeInteger(item) && !(historical && Number.isFinite(item) && !Number.isInteger(item) && Math.abs(item) >= 0.0001 && Math.abs(item) < 1e16)) fail('unsafe_integer');
      if (Object.is(item, -0)) fail('negative_zero');
      return JSON.stringify(item);
    }
    if (typeof item === 'string') {
      if (!item.isWellFormed()) fail('invalid_unicode');
      return JSON.stringify(nfc ? item.normalize('NFC') : item);
    }
    if (Array.isArray(item)) return '[' + item.map(child => encode(child, depth + 1)).join(',') + ']';
    if (!item || typeof item !== 'object') fail('invalid_type');
    const normalized = new Map();
    for (const [key, child] of Object.entries(item)) {
      const k = nfc ? key.normalize('NFC') : key;
      if (normalized.has(k)) fail('normalized_key_collision');
      normalized.set(k, child);
    }
    const keys = [...normalized.keys()].sort(historical ? codepointCompare : undefined);
    return '{' + keys.map(key => encode(key) + ':' + encode(normalized.get(key), depth + 1)).join(',') + '}';
  }
  return encoder.encode(encode(value));
}
export async function digest(bytes) {
  const result = await crypto.subtle.digest('SHA-256', bytes);
  return 'sha-256:' + Array.from(new Uint8Array(result), value => value.toString(16).padStart(2, '0')).join('');
}
export function select(value, selector) {
  if (selector === '$') return value;
  if (typeof selector !== 'string' || !selector.startsWith('$.')) fail('unsupported_selector');
  for (const part of selector.slice(2).split('.')) {
    const match = /^([^\[\]]+)(?:\[(0|[1-9][0-9]*)\])?$/.exec(part);
    if (!match) fail('unsupported_selector');
    if (!value || Array.isArray(value) || typeof value !== 'object' || !Object.hasOwn(value, match[1])) fail('selector_missing');
    value = value[match[1]];
    if (match[2] !== undefined) {
      if (!Array.isArray(value) || Number(match[2]) >= value.length) fail('selector_missing');
      value = value[Number(match[2])];
    }
  }
  return value;
}
export function textBytes(value) {
  if (typeof value !== 'string') fail('text_required');
  if (!value.isWellFormed()) fail('invalid_unicode');
  // Exact Python str.strip whitespace set; JS trim differs at U+0085 and U+FEFF.
  const ws = /^[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g;
  return encoder.encode(value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replace(ws, '').normalize('NFC'));
}
// Historical v0 coverage is an algorithm constant, never an archive-controlled claim.
export const V0_RECORD_FIELDS = Object.freeze(['unitId', 'sourcePath', 'selector', 'claimClass', 'authorityScope', 'canonicalSource', 'canonicalText']);
export function unitDigestCoverage(unit, recipe) {
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) fail('unknown_profile');
  let fields;
  if (unit.digestScope === 'canonical_interpretive_unit_envelope') {
    if (unit.canonicalization !== 'attested-interpretive-unit-envelope-v0') fail('unknown_profile');
    fields = V0_RECORD_FIELDS;
  } else if (unit.digestScope === 'selected_unit_only') {
    if (!['utf8-nfc-lf-trimmed-v0', 'deterministic-json-sort-keys-v0'].includes(unit.canonicalization)) fail('unknown_profile');
    fields = [];
  } else fail('unknown_scope');
  if (Object.hasOwn(recipe, 'requiredFieldsInPreimage')) {
    const declared = recipe.requiredFieldsInPreimage;
    if (!Array.isArray(declared) || declared.length !== fields.length
      || !declared.every(field => typeof field === 'string' && fields.includes(field))
      || new Set(declared).size !== declared.length) fail('invalid_recipe_coverage');
  }
  return [...fields];
}
export function unitPreimage(unit, source) {
  if (!['unitId', 'sourcePath', 'selector', 'digest', 'digestScope', 'canonicalization'].every(key => Object.hasOwn(unit, key))) fail('unit_field_missing');
  const selected = select(strictParse(source, { historical: true }), unit.selector);
  if (unit.digestScope === 'canonical_interpretive_unit_envelope') {
    const fields = V0_RECORD_FIELDS;
    if (unit.canonicalization !== 'attested-interpretive-unit-envelope-v0' || !fields.every(key => Object.hasOwn(unit, key))) fail('unit_recipe_mismatch');
    return canonical(Object.fromEntries(fields.map(key => [key, unit[key]])), { historical: true });
  }
  if (unit.digestScope !== 'selected_unit_only') fail('unknown_scope');
  if (unit.canonicalization === 'utf8-nfc-lf-trimmed-v0') return textBytes(selected);
  if (unit.canonicalization === 'deterministic-json-sort-keys-v0') return canonical(selected, { historical: true });
  fail('unknown_profile');
}
export function artifactPreimage(path, bytes, profile) {
  if (/\.(json|jsonld)$/i.test(path) && !/\.(json|jsonld)$/.test(path)) fail('ambiguous_artifact_extension');
  const expected = /\.(json|jsonld)$/.test(path) ? 'deterministic-json-sort-keys-v0' : 'utf8-nfc-lf-trimmed-v0';
  if (profile !== undefined && profile !== expected) fail('artifact_profile');
  if (expected === 'deterministic-json-sort-keys-v0') return canonical(strictParse(bytes, { historical: true }), { historical: true });
  return textBytes(decoder.decode(bytes));
}

// Independent consumer algorithm. Retrieval is injected and never follows a
// source URL: only content-addressed, closed archive paths may reach the caller.
export async function verifySnapshot(snapshot, getArchive, expectedIntents, checks = []) {
  const same = (id, expected, actual) => {
    const ok = JSON.stringify(expected) === JSON.stringify(actual)
      || (actual !== undefined && decoder.decode(canonical(expected)) === decoder.decode(canonical(actual)));
    checks.push({ id, expected, actual, status: ok ? 'PASS' : 'FAIL' });
    if (!ok) fail(id);
  };
  const inventory = snapshot.inventory;
  same('snapshot-type', 'GovernedContextCorpusSnapshot', snapshot.type);
  same('snapshot-version', '0.1.0-proposed', snapshot.schemaVersion);
  same('snapshot-identity', 'governed-context-runtime:' + snapshot.corpusRootDigest, snapshot.snapshotId);
  same('inventory-type', 'GovernedContextCorpusInventory', inventory.type);
  same('inventory-version', '0.1.0-proposed', inventory.schemaVersion);
  same('inventory-profile', 'gd-portable-json-v1', inventory.profile);
  same('corpus-root', snapshot.corpusRootDigest, await digest(canonical(inventory)));
  if (!inventory.items.length || inventory.items.length > 1024) fail('archive_coverage');
  const sources = new Map(), uris = new Set();
  for (const item of inventory.items) {
    if (!/^\/v0\/artifacts\/[a-f0-9]{64}$/.test(item.uri) || sources.has(item.sourcePath) || uris.has(item.uri)) fail('invalid_archive_identity');
    for (const [key,value] of Object.entries({kind:'source-archive',digestScope:'canonical-json',canonicalization:PROFILE,digestAlgorithm:'sha-256',version:item.repositoryDigest})) same('item-profile:' + key, value, item[key]);
    uris.add(item.uri);
    const encoded = new Uint8Array(await getArchive(item.uri)).slice();
    same('archive-envelope:' + item.sourcePath, item.digest, await digest(encoded));
    same('archive-address:' + item.sourcePath, item.digest, 'sha-256:' + item.uri.split('/').at(-1));
    const archive = strictParse(encoded);
    const canonicalEnvelope = canonical(archive);
    if (encoded.length !== canonicalEnvelope.length || encoded.some((byte, index) => byte !== canonicalEnvelope[index])) fail('noncanonical_archive_envelope');
    for (const [key,value] of Object.entries({type:'RuntimeSourceArchive',schemaVersion:'0.1.0-proposed',encoding:'base64',digestScope:'repository-bytes',digestAlgorithm:'sha-256'})) same('archive-profile:' + key, value, archive[key]);
    same('archive-source:' + item.sourcePath, item.sourcePath, archive.sourcePath);
    if (typeof archive.contentBase64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(archive.contentBase64)) fail('invalid_base64');
    const data = Uint8Array.from(atob(archive.contentBase64), c => c.charCodeAt(0));
    same('source-bytes:' + item.sourcePath, item.repositoryDigest, await digest(data));
    same('source-declaration:' + item.sourcePath, item.repositoryDigest, archive.digest);
    same('source-length:' + item.sourcePath, item.byteLength, data.length);
    sources.set(item.sourcePath, data);
  }
  const source = path => { if (!sources.has(path)) fail('source_missing'); return sources.get(path); };
  const document = path => strictParse(source(path));
  const intents = document('public/intent-registry.json').intents;
  same('intent-source-projection', document('data/runtime/intent-registry.source.json').intents, intents);
  if (expectedIntents !== undefined) same('independent-intent-coverage', expectedIntents, intents);
  const tokens = intents.map(item => item.intentToken);
  if (!tokens.length || new Set(tokens).size !== tokens.length) fail('empty_or_duplicate_intents');
  const packs = document('public/context-pack-registry.json').packs;
  if (!packs.length || packs.length !== inventory.packs.length) fail('pack_coverage');
  const digestDocument = document('public/content-digests.json');
  const artifactProfiles = {json:'deterministic-json-sort-keys-v0',text:'utf8-nfc-lf-trimmed-v0'};
  for (const [key,value] of Object.entries(artifactProfiles)) same('artifact-registry-profile:' + key, value, digestDocument.canonicalization?.[key]);
  const declared = digestDocument.artifacts;
  for (const item of declared) {
    same('artifact-algorithm', 'sha-256', item.digestAlgorithm);
    if (item.canonicalization !== undefined) same('artifact-declared-profile', /\.(json|jsonld)$/.test(item.sourcePath) ? artifactProfiles.json : artifactProfiles.text, item.canonicalization);
  }
  if (!declared.length || new Set(declared.map(item => item.sourcePath)).size !== declared.length) fail('digest_registry_structure');
  const declaredMap = new Map(declared.map(item => [item.sourcePath, item]));
  const units = document('public/attested-interpretive-units.json').units;
  same('snapshot-unit-registry', units, inventory.units);
  if (!units.length || new Set(units.map(unit => unit.unitId)).size !== units.length) fail('unit_coverage');
  const unitMap = new Map(units.map(unit => [unit.unitId, unit]));
  for (const unit of units) {
    same('unit-algorithm', 'sha-256', unit.digestAlgorithm);
    const value = select(strictParse(source(unit.sourcePath), {historical:true}), unit.selector);
    const type = value === null ? 'NoneType' : Array.isArray(value) ? 'list' : ({string:'str',boolean:'bool',object:'dict',number:Number.isInteger(value)?'int':'float'})[typeof value];
    same('unit-selected-type', type, unit.selectedValueType);
    same('unit:' + unit.unitId, unit.digest, await digest(unitPreimage(unit, source(unit.sourcePath))));
  }
  const recipes = document("spec/governed-context-runtime/attestation-recipes.json");
  const pairs = new Set(), graph = new Map(), digestCoverage = { registry: new Set(), packOnly: new Set() };
  for (const [position, pack] of packs.entries()) {
    const indexed = inventory.packs[position];
    for (const [key, value] of Object.entries(pack)) same('pack-registry:' + pack.packId + ':' + key, value, indexed[key]);
    const pair = pack.intentToken + '/' + pack.lang;
    if (pairs.has(pair) || !tokens.includes(pack.intentToken) || !['fr', 'en'].includes(pack.lang)) fail('pack_coverage');
    pairs.add(pair);
    const profile = pack.canonicalizationPolicyId;
    if (profile !== 'gd-deterministic-json-v1' || !Object.hasOwn(recipes.profiles ?? {}, profile)) fail('unknown_profile');
    const values = {};
    for (const role of ['payload', 'manifest']) {
      if (pack[role + 'DigestScope'] !== 'canonical-json' || pack[role + 'FileDigestScope'] !== 'repository-bytes') fail('unknown_scope');
      const url = new URL(pack[role + 'Url']);
      if (url.origin !== 'https://gautierdorval.com' || url.username || url.password || url.search || url.hash) fail('canonical_url');
      const path = 'public' + url.pathname;
      same('source-path:' + path, path, indexed[role + 'SourcePath']);
      const raw = source(path), value = document(path);
      same('repository:' + path, pack[role + 'FileDigest'], await digest(raw));
      same('canonical:' + path, pack[role + 'Digest'], await digest(canonical(value, { historical: true, nfc: true })));
      for (const key of ['packId', 'intentToken', 'lang', 'version']) same('identity:' + path + ':' + key, pack[key], value[key]);
      values[role] = value;
    }
    const { payload, manifest } = values;
    for (const key of ['payloadDigest', 'payloadFileDigest', 'payloadUrl']) same('manifest-association:' + pack.packId + ':' + key, pack[key], manifest[key]);
    same('included-artifacts:' + pack.packId, payload.includedArtifacts.map(item => item.path), manifest.includedArtifacts);
    same('included-units:' + pack.packId, payload.includedUnits.map(unit => unit.unitId), manifest.includedUnitIds);
    same('indexed-units:' + pack.packId, manifest.includedUnitIds, indexed.unitIds);
    if (new Set(indexed.unitIds).size !== indexed.unitIds.length || indexed.unitIds.some(id => !unitMap.has(id))) fail('indexed_unit_reference');
    if (!payload.includedArtifacts.length || !payload.includedUnits.length) fail('empty_pack_attestations');
    for (const item of payload.includedArtifacts) {
      const path = item.sourcePath;
      if (item.digestScope !== 'complete_artifact' || item.path !== path.replace(/^public/, '')) fail('artifact_scope');
      const entry = declaredMap.get(path);
      if (entry && ['path', 'sourcePath', 'digest', 'digestScope'].some(key => entry[key] !== item[key])) fail('digest_registry_association');
      digestCoverage[entry ? 'registry' : 'packOnly'].add(path);
      const profile = /\.(json|jsonld)$/.test(path) ? artifactProfiles.json : artifactProfiles.text;
      if (item.digestAlgorithm !== undefined) same('pack-artifact-algorithm', 'sha-256', item.digestAlgorithm);
      if (item.canonicalization !== undefined) same('pack-artifact-profile', profile, item.canonicalization);
      same('artifact:' + path, item.digest, await digest(artifactPreimage(path, source(path), profile)));
    }
    for (const partial of payload.includedUnits) {
      const full = unitMap.get(partial.unitId);
      if (!full || Object.entries(partial).some(([key, value]) => JSON.stringify(full[key]) !== JSON.stringify(value))) fail('included_unit_mismatch');
    }
    indexed.dependencies.forEach(source);
    for (const field of ['causalContexts', 'applicabilityChains', 'weightingRules', 'answerBoundaries']) {
      for (const [i, item] of payload[field].entries()) {
        const semanticId = item.id ?? item.ruleId, id = pack.packId + '/' + field + '/' + semanticId;
        if (!semanticId || graph.has(id)) fail('duplicate_graph_id');
        const node = { id, semanticId, kind: field, sourcePath: indexed.payloadSourcePath, selector: `$.${field}[${i}]`, dependencies: [] };
        if (item.sourceArtifact !== undefined) { node.ruleSourcePath = 'public' + item.sourceArtifact; source(node.ruleSourcePath); }
        if (field === 'applicabilityChains') node.dependencies.push(pack.packId + '/causalContexts/' + item.linkedCausalContextId);
        graph.set(id, node);
      }
    }
  }
  same('complete-bilingual-catalog', tokens.flatMap(t => ['en', 'fr'].map(lang => t + '/' + lang)).sort(), [...pairs].sort());
  same('graph-coverage', [...graph.values()], inventory.graph);
  same('digest-registry-coverage', Object.fromEntries(Object.entries(digestCoverage).map(([key, set]) => [key, [...set].sort()])), inventory.digestRegistryCoverage);
  for (const node of graph.values()) for (const dependency of node.dependencies) if (!graph.has(dependency)) fail('missing_graph_dependency');
  inventory.authoritySources.forEach(source);
  same('authority-not-created', false, inventory.authorityTransport.grantsGlobalRank);
  return checks;
}
