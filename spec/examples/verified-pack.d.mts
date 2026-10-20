// SPDX-License-Identifier: Apache-2.0
export interface PackSelection {
  snapshotBytes: Uint8Array | ArrayBuffer;
  getArchive: (uri: string) => Uint8Array | ArrayBuffer | Promise<Uint8Array | ArrayBuffer>;
  expectedRoot: string;
  intentToken: string;
  lang: string;
  version: string;
  expectedIntents?: unknown;
}
// Payload fields are governed by the separately tested historical schemas.
export interface InspectedPack {
  pack: Record<string, any> & {packId: string; intentToken: string; lang: string; version: string};
  manifest: Record<string, any>;
  units: {unit: Record<string, any>; selectedValue: unknown; legacyDigest: Record<string, any>}[];
  sources: {sourcePath: string; repositoryDigest: string; contentBase64: string}[];
  verification: Record<string, any> & {corpusRootDigest: string; snapshotChecks: number; signatureTrust: string; usePermission: string};
}
export function inspectVerifiedPack(input: PackSelection): Promise<InspectedPack>;
/** Domain refusals return REFUSED. Malformed invocation types, non-cloneable inputs and callback failures reject the promise; no callback runs for input failures. */
export function consumeVerifiedPack(input: Omit<PackSelection, 'expectedRoot'> & {policy: any; receipt: unknown; purpose?: string}, consume: (pack: InspectedPack) => unknown | Promise<unknown>): Promise<{status: string; delivered: boolean; stage?: string; reason?: string; decision: any; result?: InspectedPack; consumption?: unknown}>;
