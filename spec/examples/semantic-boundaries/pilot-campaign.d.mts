// SPDX-License-Identifier: Apache-2.0
import type {PilotBucket, createPilotBudget} from './pilot-budget.mjs';
import type {ProviderRequest, sendProviderRequest} from './pilot-provider.mjs';
import type {Trial} from './pilot-execution.mjs';
export const PILOT_PRICING: Readonly<Record<string, Readonly<{inputUsdPerMillion: string; outputUsdPerMillion: string}>>>;
export function writeCampaignRecord(bucket: PilotBucket, key: string, payload: unknown): Promise<{key: string; sha256: string}>;
export function readCampaignRecord(bucket: PilotBucket, key: string): Promise<{payload: any; sha256: string} | null>;
export function qualifyCampaignStorage(input: {bucket: PilotBucket; campaignId: string; manifestSha256: string}): Promise<{key: string; sha256: string}>;
export interface CampaignBucket extends PilotBucket {
  get(key: string): Promise<{etag: string; size: number; text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer>} | null>;
}
export interface Campaign {
  manifest: {campaignId: string; budgetCapMicrousd: number; maximumAttempts: number; expiresAt: string; reviewers: ('deepinfra' | 'mistral')[]};
  prefix: string; trials: Trial[]; rubric: any;
}
export function loadCampaign(input: {bucket: CampaignBucket; manifestSha256: string; campaignId: string; now?: Date}): Promise<Campaign>;
export function snapshotCampaignInputs(input: {bucket: CampaignBucket; manifestSha256: string; campaignId: string; now?: Date}): Promise<Record<string, string>>;
export function materializeCampaignSnapshot(input: {objects: Record<string, string>; manifestSha256: string; campaignId: string; now?: Date}): Promise<Campaign>;
export function readCampaignRecovery(input: {bucket: PilotBucket; campaignId: string; manifestSha256: string; recoverySha256: string}): Promise<any>;
export function admitCampaignRecovery(input: {bucket: PilotBucket; campaign: Campaign; manifestSha256: string; recoverySha256: string; workerVersionId: string}): Promise<any>;
export function campaignAttemptRunner(input: {bucket: PilotBucket; prefix: string; ledger: ReturnType<typeof createPilotBudget>; credentials: Record<string, string>; invoke?: typeof sendProviderRequest; now?: () => Date}): (attemptId: string, request: ProviderRequest) => Promise<any>;
export function runCampaign(input: {bucket: PilotBucket; campaign: Campaign; manifestSha256: string; credentials: Record<string, string>; steps: {run<T>(name: string, callback: () => Promise<T>): Promise<T>}; invoke?: typeof sendProviderRequest; recovery?: any; now?: () => Date}): Promise<any>;
export function readCampaignStatus(input: {bucket: PilotBucket; campaignId: string; manifestSha256: string; workerVersionId: string; recoverySha256?: string | null; now?: Date}): Promise<any>;
