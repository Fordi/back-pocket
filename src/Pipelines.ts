export * from "./Manifold.ts";
export * from "./Sequence.ts";

export async function* _toAsyncIterable<T>(
  iter: Iterable<T> | AsyncIterable<T>
) {
  if (Symbol.asyncIterator in iter) {
    for await (const item of iter) {
      yield item;
    }
    return;
  }
  for (const item of iter) {
    yield item;
  }
}
export function toAsyncIterable<T>(iter: Iterable<T> | AsyncIterable<T>) {
  if (
    iter === null ||
    typeof iter !== "object" ||
    (!(Symbol.asyncIterator in iter) && !(Symbol.iterator in iter))
  ) {
    throw new Error(`Invalid iterable: ${iter}`);
  }
  return _toAsyncIterable(iter);
}

const UNDEFINED = Symbol("undefined");

export function concurrently<T>(
  concurrency: number,
  items: Iterable<T> | AsyncIterable<T>,
  makePromise: (item: T, index: number) => T | Promise<T>
) {
  const finalPromise = (Promise as any).withResolvers();
  const iter = (async function* _concurrently() {
    let promises = new Set();
    let results: (T | typeof UNDEFINED)[] = [];
    let index = 0;
    let resultIndex = 0;
    const addPromise = (item: T, index: number) => {
      let promise;
      try {
        promise = Promise.resolve(makePromise(item, index));
      } catch (e) {
        finalPromise.reject(e);
        throw e;
      }
      const promisePlus = promise.then((result) => {
        promises.delete(promisePlus);
        results[index] = result;
        return result;
      });
      promises.add(promisePlus);
    };
    for await (const item of toAsyncIterable(items)) {
      results[index] = UNDEFINED;
      if (promises.size < concurrency) {
        addPromise(item, index++);
      }
      if (promises.size >= concurrency) {
        try {
          await Promise.race(promises);
        } catch (e) {
          finalPromise.reject(e);
          throw e;
        }
        for (
          ;
          results[resultIndex] !== UNDEFINED && resultIndex < results.length;
          resultIndex++
        ) {
          yield results[resultIndex] as T;
        }
      }
    }
    try {
      await Promise.all(promises);
    } catch (e) {
      finalPromise.reject(e);
      throw e;
    }

    for (; resultIndex < results.length; resultIndex++) {
      yield results[resultIndex] as T;
    }
    finalPromise.resolve(results);
  })();

  let iterStarted = false;
  const original = iter.next;
  iter.next = () => {
    iterStarted = true;
    return original.call(iter);
  };
  (iter as any).flush = async () => {
    if (!iterStarted) {
      try {
        for await (const item of iter);
      } catch (e) { /* _concurrently marshalls errors into the finalPromise */ }
    }
    return finalPromise.promise;
  };
  
  return iter as unknown as AsyncIterable<T> & { flush(): Promise<T[]> };
}

export function allOf<R>(iter: Iterable<R>): R[];
export async function allOf<R>(
  iter: AsyncIterable<R> | Promise<AsyncIterable<R>> | Promise<Iterable<R>>
): Promise<R[]>;

export function allOf<R>(
  iter:
    | AsyncIterable<R>
    | Iterable<R>
    | Promise<AsyncIterable<R>>
    | Promise<Iterable<R>>
) {
  if (iter instanceof Promise) {
    // @ts-expect-error `value` is `AsyncIterable<R> | Iterable<R>`.  This should work.
    return iter.then((value: Iterable<R> | AsyncIterable<R>) => allOf(value));
  }
  if (iter !== null && typeof iter === "object") {
    if (Symbol.iterator in iter) {
      if (Array.isArray(iter)) {
        return iter;
      }
      return [...iter];
    }
    if (Symbol.asyncIterator in iter) {
      return (async () => {
        const results: R[] = [];
        for await (const result of iter) {
          results.push(result);
        }
        return results;
      })();
    }
  }
  throw new Error(
    "`iter` is not iterable, asyncIterable or a promise to be iterable or asyncIterable"
  );
}

export function lastOf<R>(iter: Iterable<R>): R | undefined;
export async function lastOf<R>(
  iter: AsyncIterable<R> | Promise<AsyncIterable<R>> | Promise<Iterable<R>>
): Promise<R | undefined>;
export function lastOf<R>(
  iter:
    | AsyncIterable<R>
    | Iterable<R>
    | Promise<AsyncIterable<R>>
    | Promise<Iterable<R>>
) {
  if (Array.isArray(iter)) {
    return iter[iter.length - 1];
  }
  if (iter instanceof Promise) {
    return allOf(iter).then((values) => lastOf(values));
  }
  // @ts-expect-error `value` exactly matches allOf's signature.  This should work.
  return lastOf(allOf(iter));
}
