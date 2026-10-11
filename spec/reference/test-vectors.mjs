// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonical,digest,strictParse} from './verification.mjs';
const vectors=JSON.parse(await readFile(new URL('./vectors.json',import.meta.url)));
for(const c of vectors.cases)test('existing conformance vector: '+c.id,async()=>{
 const input=c.inputHex?Buffer.from(c.inputHex,'hex'):c.input;
 if(c.expectedError){assert.throws(()=>canonical(strictParse(input,c.options),c.options),new RegExp(c.expectedError));return}
 const bytes=canonical(strictParse(input,c.options),c.options);
 assert.equal(Buffer.from(bytes).toString(),c.expectedCanonical);assert.equal(await digest(bytes),c.expectedDigest);
});
