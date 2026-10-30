// SPDX-License-Identifier: Apache-2.0
import {parentPort,workerData} from 'node:worker_threads';
import {compareCatalog} from './comparison-data.mjs';
try{parentPort.postMessage({report:await compareCatalog(workerData.A,workerData.B)});}
catch(error){parentPort.postMessage({error:error.message});}
