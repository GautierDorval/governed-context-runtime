// SPDX-License-Identifier: Apache-2.0
// Explicit deterministic build of this kit identity; never runs during verification.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../../../',import.meta.url);
const paths=[
 'spec/examples/reproduction/run.mjs','spec/examples/reproduction/build-manifest.mjs',
 'spec/examples/reproduction/cases.json','spec/examples/reproduction/policy.json',
 'spec/examples/reproduction/report-template.json','spec/examples/reproduction/benchmark.mjs',
 'spec/examples/demo.mjs','spec/examples/synthetic/bundle.json','spec/examples/verified-pack.mjs',
 'spec/reference/verification.mjs','spec/reference/signatures.mjs','spec/reference/consumer.mjs',
 'spec/context-pack.schema.json','spec/context-pack-manifest.schema.json','spec/intent-registry.schema.json','spec/runtime-snapshot.schema.json','spec/attestation-recipes.json',
 'docs/en/reproduction.md','docs/fr/reproduction.md',
].sort();
const files=await Promise.all(paths.map(async path=>{const raw=await readFile(new URL(path,root));return {path,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')};}));
const manifest={schema:'runtime-reproduction-kit/1',referenceBaseCommit:'39778036460b3a24a9897a46ee29ca15513c2fe2',
 codeRevision:'Record the final checkout commit separately in the reproduction report; no self-referential commit identity.',
 nodeMinimum:'24.17.0',runtimeDependencies:[],networkRequired:false,testOnly:true,
 schemaVersions:{snapshot:'0.1.0-proposed',consumer:'runtime-local-consumer/0.1.0-proposed',receipt:'detached-jws-ed25519-test-v1'},
 casesFile:'spec/examples/reproduction/cases.json',additionalWitness:'historical-v0',files};
await writeFile(new URL('manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log('WROTE: reproduction/manifest.json (identity only, no source or trust certification)');
