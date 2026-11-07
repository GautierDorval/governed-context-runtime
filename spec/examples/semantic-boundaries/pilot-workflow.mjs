// SPDX-License-Identifier: Apache-2.0
import {WorkflowEntrypoint} from 'cloudflare:workers';
import {snapshotCampaignInputs, materializeCampaignSnapshot, runCampaign, readCampaignStatus, writeCampaignRecord, qualifyCampaignStorage, readCampaignRecovery, admitCampaignRecovery} from './pilot-campaign.mjs';
import {assertValue} from './pilot-json.mjs';

// Deploy without an HTTP route. Launch/read through the authenticated Cloudflare control plane.
export class PilotWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    assertValue(event.payload?.campaignId === this.env.PILOT_CAMPAIGN_ID && event.payload?.manifestSha256 === this.env.PILOT_MANIFEST_SHA256, 'workflow_manifest_binding');
    const bucket = this.env.PILOT_ARCHIVE;
    const stepOptions = {retries: {limit: 0, delay: '1 second'}, timeout: '6 minutes'};
    const options = {bucket, campaignId: event.payload.campaignId, manifestSha256: event.payload.manifestSha256};
    const recoverySha256 = this.env.PILOT_RECOVERY_SHA256 ?? null;
    const admitted = await step.do('approved-inputs', stepOptions, async () => {
      const admittedAt = recoverySha256 ? (await readCampaignRecovery({...options, recoverySha256})).admittedAt : new Date().toISOString();
      return {admittedAt, objects: await snapshotCampaignInputs({...options, now: new Date(admittedAt)})};
    });
    // Freshness is an admission check. Replays validate the immutable snapshot at that cached instant;
    // the separate ledger deadline still prevents any new dispatch after execution authorization expires.
    const campaign = await materializeCampaignSnapshot({...options, objects: admitted.objects, now: new Date(admitted.admittedAt)});
    const recovery = recoverySha256 ? await step.do('recovery-admission', stepOptions, async () => JSON.parse(JSON.stringify(await admitCampaignRecovery({bucket, campaign, manifestSha256: options.manifestSha256, recoverySha256, workerVersionId: this.env.CF_VERSION_METADATA.id})))) : null;
    await step.do('storage-qualification', stepOptions, () => qualifyCampaignStorage(options));
    await step.do('execution-identity', stepOptions, () => writeCampaignRecord(bucket, campaign.prefix + (recovery ? `execution-identities/${this.env.CF_VERSION_METADATA.id}.json` : 'execution-identity.json'), {campaignId: event.payload.campaignId, manifestSha256: event.payload.manifestSha256, workerVersionId: this.env.CF_VERSION_METADATA.id, admittedAt: admitted.admittedAt, ...(recovery ? {recoverySha256} : {})}));
    const credentials = {anthropic: this.env.ANTHROPIC_API_KEY, deepinfra: this.env.DEEPINFRA_API_KEY, mistral: this.env.MISTRAL_API_KEY};
    assertValue(Object.values(credentials).every(value => typeof value === 'string' && value.length >= 12), 'workflow_credentials_missing');
    const result = await runCampaign({bucket, campaign, manifestSha256: event.payload.manifestSha256, credentials, recovery,
      steps: {run: (name, callback) => step.do(name, stepOptions, callback)}});
    // Step state and R2 are private. The final control-plane result contains only aggregates.
    return {campaignId: result.campaignId, status: result.status, executionState: result.executionState, counts: result.responses, spend: result.spend, resultKey: campaign.prefix + 'result.json'};
  }
}
export default {async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/internal/pilot-status' || url.search || !['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 404});
  try {
    const status = await readCampaignStatus({bucket: env.PILOT_ARCHIVE, campaignId: env.PILOT_CAMPAIGN_ID, manifestSha256: env.PILOT_MANIFEST_SHA256, workerVersionId: env.CF_VERSION_METADATA.id, recoverySha256: env.PILOT_RECOVERY_SHA256 ?? null});
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(status), {headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
  } catch { return Response.json({error: 'pilot_status_unavailable'}, {status: 503, headers: {'Cache-Control': 'no-store'}}); }
}};
