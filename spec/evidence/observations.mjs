// SPDX-License-Identifier: Apache-2.0
// Pure, local checks for the descriptive observation contracts. No network or schema loader.
/** @param {unknown} value @returns {bigint | null} */
export function parseObservationUtc(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:Z|\+00:00)$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, fraction = ''] = match;
  const y = Number(year),
    m = Number(month),
    d = Number(day);
  if (y < 1 || m < 1 || m > 12 || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d < 1 || d > days[m - 1]) return null;
  // setUTCFullYear avoids Date.UTC's special interpretation of years 00 through 99.
  const instant = new Date(0);
  instant.setUTCFullYear(y, m - 1, d);
  instant.setUTCHours(Number(hour), Number(minute), Number(second), 0);
  return BigInt(instant.getTime()) * 1000000n + BigInt(fraction.padEnd(9, '0'));
}

/** @param {unknown} value */
export function isObservationDate(value) {
  return (
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && parseObservationUtc(value + 'T00:00:00Z') !== null
  );
}

/** @param {unknown} value @returns {Record<string, unknown> | null} */
function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : null;
}

/**
 * Apply after the matching local JSON Schema has accepted the parsed record.
 * This function checks only the listed relationships, not the schema or response bodies.
 * Its consistency result never replaces the producer's declared PASS/FAIL.
 * @param {unknown} value
 */
export function checkObservationSemantics(value) {
  /** @type {{code: string, path: string}[]} */
  const diagnostics = [];
  /** @param {string} code @param {string} path */
  const fail = (code, path) => {
    diagnostics.push({code, path});
  };
  /** @param {string} path @returns {unknown} */
  const get = path =>
    path.split('.').reduce((current, key) => {
      if (Array.isArray(current) && /^\d+$/.test(key)) return current[Number(key)];
      return object(current)?.[key];
    }, /** @type {unknown} */ (value));
  /** @param {string} path */
  const date = path => {
    const parsed = parseObservationUtc(get(path));
    if (parsed === null) fail('invalid_date', path);
    return parsed;
  };
  /** @param {string} path */
  const integer = path => {
    const number = get(path);
    if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 0) {
      fail('invalid_count', path);
      return null;
    }
    return BigInt(number);
  };
  /** @param {string} start @param {string} end @param {[bigint, bigint] | null} [parent] @returns {[bigint, bigint] | null} */
  const interval = (start, end, parent = null) => {
    const a = date(start),
      b = date(end);
    if (a === null || b === null) return null;
    if (a > b) fail('reversed_interval', start);
    if (parent !== null && (a < parent[0] || b > parent[1])) fail('outside_main_interval', start);
    return [a, b];
  };
  /** @param {string} total @param {string[]} terms */
  const sum = (total, terms) => {
    const expected = integer(total),
      values = terms.map(integer);
    if (expected !== null && values.every(x => x !== null) && expected !== values.reduce((a, b) => a + b, 0n))
      fail('count_total_mismatch', total);
  };
  /** @param {string} path @param {string} expected */
  const rootMatches = (path, expected) => {
    if (get(path) !== get(expected)) fail('current_root_mismatch', path);
  };
  /** @param {string} path @param {unknown} expected */
  const declaredPassRequires = (path, expected) => {
    if (get('status') === 'PASS' && get(path) !== expected) fail('declared_pass_contradiction', path);
  };
  const schema = get('schema');
  const deployment = schema === 'runtime-public-deployment-observation/1';
  const requestObservation = schema === 'runtime-public-observation/1';
  let variant = 'UNKNOWN';
  if (!requestObservation && !deployment) fail('unknown_schema', 'schema');
  else {
    const main = interval('startedAt', 'finishedAt');
    if (requestObservation) {
      variant = 'requests-and-reconciliation';
      const requests = get('requests');
      if (!Array.isArray(requests)) fail('missing_sequence', 'requests');
      else {
        let previous = main?.[0] ?? null;
        for (let i = 0; i < requests.length; i++) {
          const prefix = 'requests.' + i;
          const captured = date(prefix + '.capturedAt');
          if (captured !== null) {
            if (main && (captured < main[0] || captured > main[1]))
              fail('outside_main_interval', prefix + '.capturedAt');
            if (previous !== null && captured < previous) fail('request_order', prefix + '.capturedAt');
            previous = captured;
          }
          declaredPassRequires(prefix + '.status', 200);
          if (get(prefix + '.corpusRoot') !== null) rootMatches(prefix + '.corpusRoot', 'corpusRootDigest');
        }
      }
      if (!isObservationDate(get('closureReconciliation.dateUtc')))
        fail('invalid_date', 'closureReconciliation.dateUtc');
      sum(
        'closureReconciliation.requests.totalAttempted',
        ['nodeRetained', 'powershellRetained', 'headCaptureFailureNotRepeated'].map(
          key => 'closureReconciliation.requests.' + key,
        ),
      );
      rootMatches('closureReconciliation.sameRoot', 'corpusRootDigest');
    } else if (
      object(get('capture')) &&
      object(get('followupReadback')) &&
      object(get('declarationReadback')) &&
      get('applicationProof') === undefined &&
      get('runtimeSmoke') === undefined
    ) {
      variant = 'capture-and-readbacks';
      // These are independent supplementary sequences, not children of the main interval.
      interval('followupReadback.startedAt', 'followupReadback.lastPowerShellResponseAt');
      interval('declarationReadback.startedAt', 'declarationReadback.finishedAt');
      const distinct = integer('capture.distinctSnapshotRoots'),
        entries = integer('capture.snapshotEntriesVerified');
      if (distinct !== null && entries !== null && distinct > entries)
        fail('distinct_roots_exceed_entries', 'capture.distinctSnapshotRoots');
      rootMatches('declarationReadback.corpusRootDigest', 'corpusRootDigest');
      declaredPassRequires('followupReadback.sameRootInHeadersAndBodies', true);
      declaredPassRequires('followupReadback.capabilitiesMatchesObservedOpenApiSchema', true);
    } else if (
      object(get('applicationProof')) &&
      object(get('runtimeSmoke')) &&
      get('capture') === undefined &&
      get('followupReadback') === undefined &&
      get('declarationReadback') === undefined
    ) {
      variant = 'application-and-smoke';
      interval('applicationProof.startedAt', 'applicationProof.finishedAt', main);
      interval('runtimeSmoke.startedAt', 'runtimeSmoke.finishedAt', main);
      sum('applicationProof.totalRequests', [
        'rootFiles.responses',
        'applicationProof.runtimeHealthRequests',
        'mcp.jsonRpcRequests',
        'mcp.directRuntimeComparisons',
      ]);
      const routes = integer('rootFiles.routes'),
        responses = integer('rootFiles.responses'),
        surfaces = get('rootFiles.surfaces');
      if (
        routes !== null &&
        responses !== null &&
        Array.isArray(surfaces) &&
        routes * BigInt(surfaces.length) !== responses
      )
        fail('route_surface_count_mismatch', 'rootFiles.responses');
      const tools = get('mcp.checks.discovery.tools'),
        toolCount = integer('mcp.toolsListed');
      if (Array.isArray(tools) && toolCount !== null && BigInt(tools.length) !== toolCount)
        fail('tool_count_mismatch', 'mcp.toolsListed');
      for (const key of ['current-snapshot', 'list-intents', 'current-pack-fr', 'current-pack-en'])
        rootMatches('mcp.checks.' + key + '.corpusRoot', 'corpusRootDigest');
      // Historical pack root is deliberately not compared with current discovery.
      declaredPassRequires('runtimeSmoke.exitCode', 0);
      const differences = get('rootFiles.candidateDifferences');
      if (get('status') === 'PASS' && Array.isArray(differences) && differences.length)
        fail('declared_pass_contradiction', 'rootFiles.candidateDifferences');
    } else fail('unknown_variant', 'schema');
  }
  return {
    variant,
    declaredStatus: get('status'),
    consistency: diagnostics.length ? 'INCONSISTENT' : 'CONSISTENT',
    structuralValidationPerformed: false,
    rawResponsesPublished: get('rawResponsesPublished'),
    responseBodiesRechecked: false,
    hostedObservationRepeated: false,
    diagnostics,
  };
}
