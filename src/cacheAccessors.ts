export function cacheAccessors<T>(self: T, ...keys: string[]) {
  let cache = {};
  const stale = (...names: string[]) => {
    if (!names.length) {
      cache = {};
    } else {
      for (const name of names) {
        delete cache[name];
      }
    }
    return self;
  };

  const props = {};
  for (const key of keys) {
    let desc: PropertyDescriptor | undefined;
    let src = self;
    while (!desc?.get && !desc?.set && src !== null) {
      desc = Object.getOwnPropertyDescriptor(src, key);
      if (!desc?.get && !desc?.set) {
        src = Object.getPrototypeOf(src);
      }
    }
    if (!desc) {
      throw new Error("Cannot wrap a descriptor that doesn't exist");
    }
    const getImpl = desc.get as (this: typeof self) => any;
    const setImpl = desc.set as (this: typeof self) => any;
    
    props[key] = {
      configurable: true,
      ...(getImpl && { get() {
        if (!(key in cache)) {
          cache[key] = getImpl.call(this);
        }
        return cache[key];
      }}),
      ...(setImpl && { set(value: any) {
        delete cache[key];
        setImpl.call(this, value);
      }}),
    };
  }

  Object.defineProperties(self, props);
  return stale;
}