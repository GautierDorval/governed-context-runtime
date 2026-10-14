// SPDX-License-Identifier: Apache-2.0
// Static shapes of the fictional synthetic bundle, as far as the tests read or edit it. Declarations
// only: open objects keep an index signature of unknown values, and the verifier checks every value.

export interface InventoryItem {
  uri: string;
  sourcePath: string;
  version: string;
  digest: string;
  repositoryDigest: string;
  byteLength: number;
  [key: string]: unknown;
}

export interface PackEntry {
  packId: string;
  payloadUrl: string;
  manifestUrl: string;
  payloadDigest: string;
  payloadFileDigest: string;
  manifestDigest: string;
  manifestFileDigest: string;
  [key: string]: unknown;
}

export interface Unit {
  unitId: string;
  digestAlgorithm?: string;
  selectedValueType?: string;
  claimClass?: string;
  canonicalText?: string;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  semanticId: string;
  kind: string;
  sourcePath: string;
  selector: string;
  dependencies: string[];
  ruleSourcePath?: string;
}

export interface Inventory {
  items: InventoryItem[];
  packs: PackEntry[];
  units: Unit[];
  graph: GraphNode[];
  authorityTransport: {grantsGlobalRank: boolean; [key: string]: unknown};
  [key: string]: unknown;
}

export interface Snapshot {
  corpusRootDigest: string;
  snapshotId: string;
  inventory: Inventory;
  [key: string]: unknown;
}

export interface SyntheticBundle {
  snapshot: Snapshot;
  archives: Record<string, string>;
  expectedIntents: unknown;
  [key: string]: unknown;
}

/** An entry of causalContexts, applicabilityChains, weightingRules or answerBoundaries. */
export interface GraphEntry {
  id?: string;
  ruleId?: string;
  linkedCausalContextId?: string;
  sourceArtifact?: string;
}

export interface ContextPack {
  causalContexts: GraphEntry[];
  applicabilityChains: GraphEntry[];
  weightingRules: GraphEntry[];
  answerBoundaries: GraphEntry[];
  includedUnits: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface ContextPackManifest {
  payloadDigest: string;
  payloadFileDigest: string;
  [key: string]: unknown;
}

/** One entry of the check log filled by verifySnapshot (a type alias, so it is also a Record<string, unknown>). */
export type Check = {
  id: string;
  expected: unknown;
  actual: unknown;
  status: 'PASS' | 'FAIL';
};

export interface Sealed {
  snapshot: Snapshot;
  getArchive: (uri: string) => Promise<Uint8Array<ArrayBuffer>>;
}
