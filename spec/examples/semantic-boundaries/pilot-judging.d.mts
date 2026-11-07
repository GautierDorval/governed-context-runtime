// SPDX-License-Identifier: Apache-2.0
import type {Trial, CompletedOutcome} from './pilot-execution.mjs';
export const JUDGE_INSTRUCTION: string;
export interface JudgeInput {
  rubric: {criteria: Record<string, string>; applicability: Record<string, string>; responseHandling: unknown; documentaryUtility: unknown; utilityTask: string; expectation: string};
  originalInput: string; receivedResponse: string; finish: {reason: string; outputLimited: boolean};
}
export interface JudgeRecord {
  trialId: string; reviewerId: string; status: 'accepted'; responseSha256: string; judgeInputSha256: string; rawJudgmentSha256: string;
  dimensions: {dimension: string; applicability: string; label: string; reason: string; responseExcerpt: string}[];
  utility: {category: string; reason: string};
}
export function prepareJudgeInput(input: {trial: Trial; outcome: CompletedOutcome; rubric: any}): JudgeInput;
export function validateJudgeResponse(input: {rawText: string; input: JudgeInput; trialId: string; reviewerId: string}): Promise<JudgeRecord>;
export function agreementTable(pairs: string[][], categories: string[]): {categories: string[]; paired: number; agreements: number; disagreements: number; contingency: number[][]; leftMargins: number[]; rightMargins: number[]; rawAgreement: number | null; expectedAgreement: number | null; kappa: number | null; undefinedReason: string | null};
export function summarizeJudgments(input: {trials: Trial[]; completedTrialIds: string[]; records: JudgeRecord[]; reviewerIds: string[]; rubric: any}): {reviewerIds: string[]; plannedResponses: number; responsesNotReceived: number; expectedResponses: number; pairedResponses: number; missingPairs: number; acceptedAnnotations: number; beforeArbitration: true; globalScore: null; descriptive: any[]; dimensions: any[]; utility: any[]};
