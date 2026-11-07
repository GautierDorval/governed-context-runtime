// SPDX-License-Identifier: Apache-2.0
import {WorkflowEntrypoint} from 'cloudflare:workers';
import {snapshotCampaignInputs, materializeCampaignSnapshot, runCampaign, readCampaignStatus, writeCampaignRecord} from './pilot-campaign.mjs';
import {assertValue} from './pilot-json.mjs';

// Deploy without an HTTP route. Launch/read through the authenticated Cloudflare control plane.
export class PilotWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    assertValue(event.payload?.campaignId === this.env.PILOT_CAMPAIGN_ID && event.payload?.manifestSha256 === this.env.PILOT_MANIFEST_SHA256, 'workflow_manifest_binding');
    const bucket = this.env.PILOT_ARCHIVE;
    const stepOptions = {retries: {limit: 0, delay: '1 second'}, timeout: '3 minutes'};
    const options = {bucket, campaignId: event.payload.campaignId, manifestSha256: event.payload.manifestSha256};
    const objects = await step.do('approved-inputs', stepOptions, () => snapshotCampaignInputs(options));
    const campaign = await materializeCampaignSnapshot({...options, objects});
    await step.do('execution-identity', stepOptions, () => writeCampaignRecord(bucket, campaign.prefix + 'execution-identity.json', {campaignId: event.payload.campaignId, manifestSha256: event.payload.manifestSha256, workerVersionId: this.env.CF_VERSION_METADATA.id}));
    const credentials = {anthropic: this.env.ANTHROPIC_API_KEY, deepinfra: this.env.DEEPINFRA_API_KEY, mistral: this.env.MISTRAL_API_KEY};
    assertValue(Object.values(credentials).every(value => typeof value === 'string' && value.length >= 12), 'workflow_credentials_missing');
    const result = await runCampaign({bucket, campaign, manifestSha256: event.payload.manifestSha256, credentials,
      steps: {run: (name, callback) => step.do(name, stepOptions, callback)}});
    // Step state and R2 are private. The final control-plane result contains only aggregates.
    return {campaignId: result.campaignId, status: result.status, executionState: result.executionState, counts: result.responses, spend: result.spend, resultKey: campaign.prefix + 'result.json'};
  }
}
export default {async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/internal/pilot-status' || url.search || !['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 404});
  try {
    const status = await readCampaignStatus({bucket: env.PILOT_ARCHIVE, campaignId: env.PILOT_CAMPAIGN_ID, manifestSha256: env.PILOT_MANIFEST_SHA256, workerVersionId: env.CF_VERSION_METADATA.id});
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(status), {headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
  } catch { return Response.json({error: 'pilot_status_unavailable'}, {status: 503, headers: {'Cache-Control': 'no-store'}}); }
}};
