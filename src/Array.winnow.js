const props = {
  matched: {
    get() {
      return this[1];
    },
    configuratble: true,
  },
  unknown: {
    get() {
      return this[0];
    },
    configuratble: true,
  },
};
export const normalizeKey = {
  boolean: b => Number(b),
  number: b => b === Infinity ? 1 : (b % 1) === 0 ? b : b.toString(),
  string: b => {
    if (+b === parseInt(b)) {
      return +b;
    }
    return b;
  },
  main: b => !b || b < 0 ? 0 : (normalizeKey[typeof b] || normalizeKey.fail)(b),
  fail() { throw new Error("Return value of winnowing rule must be a number, string, boolean, null, or undefined.") },
};

export function winnow(array, rule, context = null) {
  const buckets = Object.defineProperties([[], []], props);
  for (let index = 0; index < array.length; index++) {
    let b = normalizeKey.main(rule.call(context, array[index], index, array));
    buckets[b] = buckets[b] ?? [];
    buckets[b].push(array[index]);
  }
  return buckets;
}
export function addToPrototype() {
  Array.prototype.winnow ??= function (rule, context = null) {
    return winnow(this, rule, context);
  };
}