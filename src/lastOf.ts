export function lastOf<R>(iter: Iterable<R>): R | undefined;
export async function lastOf<R>(iter: AsyncIterable<R>| Promise<AsyncIterable<R> | Iterable<R>>): Promise<R | undefined>;

export function lastOf<R>(iter: AsyncIterable<R> | Iterable<R> | Promise<AsyncIterable<R> | Iterable<R>>) {
  let result: R | undefined;
  if (iter instanceof Promise) {
    // @ts-expect-error `value` is `AsyncIterable<R> | Iterable<R>`.  This should work.
    return iter.then((value) => lastOf(value));
  }
  if (iter !== null && typeof iter === 'object') {
    if (Symbol.iterator in iter) {
      if (Array.isArray(iter)) {
        return iter[iter.length - 1];
      }
      for (result of iter);
      return result;
    }
    if (Symbol.asyncIterator in iter) {
      return (async () => {
        for await (result of iter);
        return result as R;
      })();
    }
  }
  throw new Error("`iter` is not iterable, asyncIterable or a promise to be iterable or asyncIterable")
};

