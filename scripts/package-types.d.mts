// SPDX-License-Identifier: Apache-2.0
// Static shapes of the package metadata read by scripts/check-package.mjs and scripts/regenerate.mjs.
// Declarations only: both scripts still check every value at run time.

export interface LicenceRules {
  reserved: string[];
  licenceTexts: Record<string, string>;
  codePrefixes: string[];
  codeFiles: string[];
  markdown: string;
  default: string;
}

export interface PackagePolicy {
  schema: string;
  inventory: string[];
  licences: LicenceRules;
  declarationDigests: Record<string, string>;
  defaultSource: string;
  selfAndManifest: string;
  spdx: string;
}

export interface RightsRow {
  path: string;
  source: string;
  license: string;
  sha256: string;
}

export interface FileRights {
  schema: string;
  repositoryWideLicense: null;
  files: RightsRow[];
  selfAndManifest: string;
}

export interface ManifestEntry {
  path: string;
  sha256: string;
  bytes: number;
}

export interface PackageManifest {
  schema: string;
  documentVersion: string;
  fictionalContextRoot: string;
  publicEvidencePublicationId: string;
  files: ManifestEntry[];
}

export interface PackageJson {
  engines: {node: string};
  name: string;
  version: string;
  license: string;
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface LockEntry {
  version?: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  devDependencies?: Record<string, string>;
}

export interface PackageLock {
  name: string;
  version: string;
  lockfileVersion: number;
  packages: Record<string, LockEntry>;
}

export interface DocumentationSource {
  documentVersion: string;
  schema: string;
  publicSpecRepositoryPath: string;
  en: Record<string, string>;
  fr: Record<string, string>;
}

export interface SyntheticBundleSummary {
  fictional: boolean;
  expectedRoot: string;
  archives: Record<string, string>;
  snapshot: {inventory: {items: {uri: string}[]}};
}
