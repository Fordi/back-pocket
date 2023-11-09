/**
 * Utility class to formalize arrangement of actions into an map by ID of parallel pipelines.
 * Note: I know this isn't typescript, but the generics are documented to set expectations.
 *
 * Promisors are ultimately called with a context of this class, and arguments as passed by #run / #runId
 *
 * @class PromiseManifold<T, A extends [], R>
 * @property {Type} T Type of ID
 * @property {Type} A Type arguments expected by run() and all promisor functions
 * @property {Type} R Type promisor functions are expected to resolve to
 */

export default class PromiseManifold {
  #pipelines;
  #context;
  /**
   * @param {*} [context=this] Context to pass into promisors
   */
  constructor(context) {
    this.#pipelines = new Map();
    this.#context = context ?? this;
  }

  /**
   * Add a promisor to a pipeline
   * @param {T} id ID of pipeline
   * @param  {...(...A) => Promise<R>} promisors Promisors to add to pipeline
   */
  add(id, ...promisors) {
    if (!this.#pipelines.has(id)) {
      this.#pipelines.set(id, []);
    }
    this.#pipelines.get(id).push(...promisors);
  }

  /**
   * Add a redux action to a pipeline
   * @param {T} id ID of pipeline
   * @param  {...Action} actions
   */
  addAction(id, ...actions) {
    this.add(id, ...actions.map((action) => (dispatch) => dispatch(action)));
  }

  /**
   * Remove a promisor
   * @param {T} id ID of pipeline
   * @returns {((...A) => Promise<R>)[]} the content of the removed pipeline
   */
  delete(id) {
    const result = this.#pipelines.get(id);
    delete this.#pipelines.delete(id);
    return result;
  }

  /**
   * Move a pipeline to the end of another pipeline
   * @param {T} from pipeline to move
   * @param {T} to target
   */
  move(from, to) {
    this.add(to, ...(this.delete(from) ?? []));
  }

  /**
   * Run a single pipeline, removing it
   * @param {T} id ID of pipeline to run
   * @param {...A} args Arguments to pass into promisor
   * @returns {Promise<R[]>}
   */
  async runId(id, ...args) {
    const results = [];
    const processors = this.delete(id);
    for (const processor of processors) {
      results.push(await processor.apply(this.#context, args));
    }
    return results;
  }

  /**
   * Execute the pipelines
   * I don't need the return values, but a sample implementation is provided.
   * @param  {...A} args arguments to be passed to the promisors
   * @returns {Promise<Map<T, R[]>>}
   */
  async run(...args) {
    const promises = [];
    const results = new Map();
    // Promisors may add new promisors to the pipeline, and Map#keys is a snapshot.
    // Loop until the queue is empty.
    while (this.#pipelines.size) {
      for (const key of this.#pipelines.keys()) {
        promises.push(
          this.runId(key, ...args).then((result) => results.set(key, result)),
        );
      }
      await Promise.all(promises);
    }
    return results;
  }

  /**
   * Assuming your pipelines are all async redux actions (e.g., signature is `(Dispatcher, StateAccessor) => Promise<R>`),
   * return a suitable rolled up action.
   * @returns {(Dispatcher, StateAccessor) => Promise<Map<T, R[]>>}
   */
  toReduxAction() {
    return (dispatch) => this.run(dispatch);
  }
}
