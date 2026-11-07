// SPDX-License-Identifier: Apache-2.0
import type {Provider, Role} from './pilot-provider.mjs';
export interface PilotBucket {
  get(key: string): Promise<{etag: string; size: number; text(): Promise<string>} | null>;
  put(key: string, text: string, options: {onlyIf: {etagMatches?: string; etagDoesNotMatch?: string}; httpMetadata: {contentType: string; cacheControl: string}}): Promise<unknown | null>;
}
export interface BudgetAuthorization {planSha256: string; capMicrousd: number; maximumAttempts: number; expiresAt: string}
export interface BudgetCounts {committedMicrousd: number; unresolvedAttempts: number; attempts: number}
export interface BudgetAttempt {
  provider: Provider; role: Role; requestSha256: string; reservedMicrousd: number;
  state: 'reserved' | 'settled' | 'uncertain'; reservedAt: string;
  outcomeSha256?: string; priceBasedUpperBoundMicrousd?: number | null; finishedAt?: string;
}
export function tokenCostMicrousd(inputTokens: number, outputTokens: number, pricing: {inputUsdPerMillion: string; outputUsdPerMillion: string}): number;
export function createPilotBudget(input: {bucket: PilotBucket; key: string; authorization: BudgetAuthorization; now?: () => Date}): {
  summary(): Promise<BudgetCounts>;
  activity(): Promise<BudgetCounts & {lastActivityAt: string | null; roles: Record<Role, Record<'reserved' | 'settled' | 'uncertain', number>>}>;
  inspect(attemptId: string): Promise<BudgetAttempt | null>;
  reserve(input: {attemptId: string; requestSha256: string; reservedMicrousd: number; provider: Provider; role: Role}): Promise<BudgetCounts & {attemptId: string}>;
  finish(input: {attemptId: string; outcomeSha256: string; priceBasedUpperBoundMicrousd?: number | null}): Promise<BudgetCounts & {attemptId: string}>;
};
