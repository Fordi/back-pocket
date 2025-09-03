const PAIR = 0;
const SLOT = 1;
const GROUP = 2;

type ResultCtor = [() => any, (k: any) => string | number];

export const DEFAULT = Symbol.for("default");

const constructors: ResultCtor[] = [
  [() => [[], []], (k: any) => (k ? 0 : 1)],
  [() => [], (k: any) => k ?? 0],
  [() => ({}), (k: any) => k ?? DEFAULT],
];

const CTOR = 0;
const REKEY = 1;

export function partition<T, S>(
  iterable: Iterable<T>,
  rule: (this: S, item: T, index: number) => boolean | undefined | null | void,
  context?: S
): [T[], T[]];

export function partition<T, S>(
  iterable: Iterable<T>,
  rule: (this: S, item: T, index: number) => number | undefined | null | void,
  context?: S
): T[][];

export function partition<T, S, K>(
  iterable: Iterable<T>,
  rule: (this: S, item: T, index: number) => string | undefined | null | void,
  context?: S
): Record<string, T>;

export function partition<T, S>(
  iterable: Iterable<T>,
  iterator: (this: S, item: T, index: number) => any,
  context?: S
) {
  let index = 0;
  let type: number | undefined;
  let result: T[] | [T[], T[]] | Record<string, T[]> | undefined;

  const tuples: [T, ReturnType<typeof iterator>][] = [];
  const push = (item: T, key: ReturnType<typeof iterator>) => {
    if (type !== undefined && result) {
      const nkey = constructors[type][REKEY](key);
      result[nkey] ??= [];
      result[nkey].push(item);
    }
  };

  const flush = () => {
    for (const [item, key] of tuples) {
      push(item, key);
    }
    tuples.length = 0;
  };

  for (const item of iterable) {
    const key = iterator.call(context, item, index);
    index++;
    if (
      (type === undefined || type === PAIR) &&
      (key === true || key === false)
    ) {
      type = PAIR;
    } else if ((type === undefined || type === SLOT) && Number.isInteger(key)) {
      type = SLOT;
    } else if (
      (type === undefined || type === GROUP) &&
      key &&
      (String === key.constructor || Symbol === key.constructor)
    ) {
      type = GROUP;
    } else if (key !== undefined && key !== null) {
      throw new Error(
        "return value of partitioning function should be consistently boolean, integer, or string."
      );
    }
    if (type === undefined) {
      tuples.push([item, key]);
    } else if (!result) {
      result = constructors[type][CTOR]();
      if (tuples.length) flush();
      push(item, key);
    } else {
      push(item, key);
    }
  }
  if (!result) {
    type = PAIR;
    result = constructors[type][CTOR]();
    if (tuples.length) flush();
  }
  return result;
}
