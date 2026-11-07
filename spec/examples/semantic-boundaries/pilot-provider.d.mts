// SPDX-License-Identifier: Apache-2.0
import type {TransportResponse} from './pilot-execution.mjs';
export type Provider = 'anthropic' | 'deepinfra' | 'mistral';
export type Role = 'respondent' | 'judge' | 'preflight';
export interface ProviderRequest {provider: Provider; model: string; url: string; role: Role; outputTokenLimit: number; body: string}
export const PROVIDER_PROFILES: Readonly<Record<Provider, Readonly<{model: string; endpoint: string; contextLimit: number}>>>;
export function buildProviderRequest(input: {provider: Provider; promptBytes: Uint8Array; outputTokenLimit: number; role?: Role; systemInstruction?: string | null}): ProviderRequest;
export function decodeProviderResponse(request: ProviderRequest, rawBody: string): TransportResponse & {usage: {inputTokens: number; outputTokens: number}};
export function sendProviderRequest(input: {request: ProviderRequest; credential: string; fetchImplementation?: typeof fetch; timeoutMs?: number; signal?: AbortSignal}): Promise<TransportResponse & {requestSha256: string; responseSha256: string; usage: {inputTokens: number; outputTokens: number}}>;
