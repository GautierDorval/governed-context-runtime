// SPDX-License-Identifier: Apache-2.0
// Pure input assembly only: no file access, provider, trial execution or scoring.
/**
 * @param {{instruction: string, documentationBytes: Uint8Array,
 * scenario: {evidence: unknown, [key: string]: unknown}, language: 'fr' | 'en'}} input
 * @returns {Uint8Array}
 */
export function assemblePilotPrompt({instruction, documentationBytes, scenario, language}) {
  if (typeof instruction !== 'string' || !(documentationBytes instanceof Uint8Array)) throw new TypeError('prompt_input');
  if (language !== 'fr' && language !== 'en') throw new TypeError('prompt_language');
  if (!scenario || typeof scenario !== 'object' || !Object.hasOwn(scenario, 'evidence')) throw new TypeError('prompt_case');
  const localized = scenario[language];
  if (!localized || typeof localized !== 'object' || !('question' in localized) || typeof localized.question !== 'string') throw new TypeError('prompt_question');
  // ignoreBOM=true preserves a literal BOM if supplied; fatal decoding refuses replacement.
  const documentation = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(documentationBytes);
  const evidence = JSON.stringify({evidence: scenario.evidence, question: localized.question});
  return new TextEncoder().encode(instruction + '\n<documentation>\n' + documentation + '\n</documentation>\n<case>' + evidence + '</case>');
}
