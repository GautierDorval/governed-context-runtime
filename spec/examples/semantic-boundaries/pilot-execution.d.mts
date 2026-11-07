// SPDX-License-Identifier: Apache-2.0
export interface Trial {
  trialId: string;
  metadata: {caseId: string; language: string; repetition: number; condition: string; blockIndex: number; position: number};
  instruction: string;
  promptBytes: Uint8Array;
  outputTokenLimit: number;
}
export interface TransportRequest {
  promptBytes: Uint8Array;
  instruction: string;
  outputTokenLimit: number;
  signal?: AbortSignal;
}
export interface TransportResponse {
  rawText: string;
  rawBody: string;
  finishReason: string;
  providerResponseId?: string | null;
  model?: string | null;
  usage?: unknown;
  refusal?: string | null;
  outputLimited?: boolean;
  requestSha256?: string | null;
  responseSha256?: string | null;
}
export type CompletedOutcome = Required<Omit<TransportResponse, 'requestSha256' | 'responseSha256'>> & Pick<TransportResponse, 'requestSha256' | 'responseSha256'> & {
  kind: 'completed_response'; completed: true; emptyAfterTrim: boolean; judgment: null;
};
export interface TechnicalOutcome {
  kind: 'technical_error'; completed: false; judgment: null;
  error: {name: string; message: string; code: string; retryable: boolean; partialResponse: string | null; deliveryState: string; partialResponseBase64?: string | null; requestSha256?: string | null; responseSha256?: string | null};
}
export interface Attempt {trialId: string; attemptNumber: number; outcome: CompletedOutcome | TechnicalOutcome}
export interface Counts {
  expected: number; attempted: number; attempts: number; received: number; completed: number;
  technicalErrors: number; technicalOnly: number; notAttempted: number; completedEmpty: number;
  outputLimited: number; evaluable: null; notEvaluable: null; judgmentsPending: number;
}
export class PilotTechnicalError extends Error {
  constructor(message: string, options?: {code?: string; retryable?: boolean; partialResponse?: string | null; deliveryState?: string});
  code: string; retryable: boolean; partialResponse: string | null; deliveryState: string;
  partialResponseBase64?: string | null; requestSha256?: string | null; responseSha256?: string | null;
}
export class PilotExecutionStopped extends Error {}
export function preparePilotTrials(input: {
  plan: any; scenarios: any; documentation: Record<string, Record<string, Uint8Array>>; configurationId: string;
}): Trial[];
export function accountPilotAttempts(trialIds: string[], attempts: Attempt[]): Counts;
export function executePilotTrials(input: {
  trials: Trial[];
  send: (request: TransportRequest) => Promise<TransportResponse>;
  journal: (event: any) => Promise<void>;
  beforeAttempt: (input: {trial: Trial; attemptNumber: number}) => Promise<void>;
  afterAttempt?: (input: {trial: Trial; attempt: Attempt}) => Promise<void>;
  signal?: AbortSignal;
  mode: 'synthetic' | 'provider';
}): Promise<{mode: 'synthetic' | 'provider'; state: string; counts: Counts; attempts: Attempt[]}>;
