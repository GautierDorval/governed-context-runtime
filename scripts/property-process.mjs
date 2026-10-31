// SPDX-License-Identifier: Apache-2.0
// Development-only process supervision. A deadline also terminates owned descendants.
import {spawn, execFileSync} from 'node:child_process';
/** @typedef {{code:number|null,signal:NodeJS.Signals|null,timedOut:boolean,overflow:boolean,error?:string,
 * stdout:string,stderr:string,durationMs:number}} ProcessResult */
/** @param {string} command @param {string[]} args
 * @param {{cwd?:string,env?:NodeJS.ProcessEnv,timeoutMs:number,maxOutputBytes?:number}} options
 * @returns {Promise<ProcessResult>} */
export function runBounded(command, args, options) {
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)
    throw new Error('positive process deadline required');
  const started = performance.now(),
    limit = options.maxOutputBytes ?? 4 * 1024 * 1024;
  // Nested oracle/control children stay inside the outer phase's process group on POSIX.
  const ownGroup = process.platform !== 'win32' && process.env.GCR_PROPERTY_PROCESS_GROUP !== '1';
  const env = {...(options.env ?? process.env)};
  if (ownGroup) env.GCR_PROPERTY_PROCESS_GROUP = '1';
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env,
      windowsHide: true,
      detached: ownGroup,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    /** @type {Buffer[]} */ const out = [];
    /** @type {Buffer[]} */ const err = [];
    let size = 0,
      timedOut = false,
      overflow = false,
      killed = false;
    /** @type {string|undefined} */ let error;
    const kill = () => {
      if (killed || !child.pid) return;
      killed = true;
      try {
        if (process.platform === 'win32')
          execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
            timeout: 5000,
          });
        else if (ownGroup) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      kill();
    }, options.timeoutMs);
    /** @param {Buffer[]} target @param {Buffer} data */
    const collect = (target, data) => {
      size += data.length;
      if (size > limit) {
        overflow = true;
        kill();
        return;
      }
      target.push(data);
    };
    child.stdout.on('data', data => collect(out, data));
    child.stderr.on('data', data => collect(err, data));
    child.on('error', cause => {
      error = cause.message;
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        code,
        signal,
        timedOut,
        overflow,
        error,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
        durationMs: Math.round(performance.now() - started),
      });
    });
  });
}
/** @param {ProcessResult} result @param {string} label */
export function requireSuccess(result, label) {
  if (result.timedOut || result.overflow || result.error || result.signal || result.code !== 0)
    throw new Error(`${label} incomplete or failed: ${JSON.stringify(result)}`);
}
