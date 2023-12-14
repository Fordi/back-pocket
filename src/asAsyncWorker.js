/**
 * Convert a function to an async worker.  Calls to workers must follow the rules.
 * @param {Function|AsyncFunction} pureFunction The worker.  Must be a pure function.  No side effects.  No external deps.
 * @returns {AsyncFunction} The same function, but run by a webworker.
 */
const asAsyncWorker = (pureFunction) => {
  const workerUrl = URL.createObjectURL(new Blob([
    workerShell.replace(/\$job\$/i, String(pureFunction)),
  ], {
    type: 'application/javascript',
  }));
  const worker = new Worker(workerUrl);
  URL.revokeObjectURL(workerUrl);

  return async (...args) => {
    const def = deferred();
    const callId = Math.random(36).toString();
    const handler = ({ data: { id, result, error } }) => {
    	if (id !== callId) {
      	return;
      }
      worker.removeEventListener('message', handler);
      if (error) {
      	def.reject(error);
      } else {
        def.resolve(result);
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ id: callId, args });
    return def.promise;
  };
};

const $job$ = Symbol('$job$');
const workerShell = String(() => {
  const job = $job$;
  self.onmessage = async ({ data: { args, id } }) => {
    try {
      const result = await job(...args);
      postMessage({ id, result });
    } catch (error) {
      postMessage({ id, error });
    }
  };
}).replace(/^\s*\(\)\s*=>\s*\{[\s\r\n\t]*|\}[\s\r\n\t]*$/g, '');

function deferred() {
  const d = {};
  d.promise = new Promise((resolve, reject) => {
    d.resolve = resolve;
    d.reject = reject;
  });
  return d;
}