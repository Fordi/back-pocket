const handler = {
  construct() {
    //Must return ANY object, so reuse one
    return handler;
  },
};

const IS_CONSTRUCTOR = Symbol("isConstructor");

export type Constructable<T> = new (...args: any[]) => T;

export function isConstructor<T>(subject: any): subject is Constructable<T> {
  if (typeof subject !== "function") return false;
  if (!(IS_CONSTRUCTOR in subject)) {
    const subjectProxy = new Proxy(subject, handler);
    let value = false;
    try {
      new subjectProxy();
      value = true;
    } catch { /* nothing to do */ }
    Object.defineProperty(subject, IS_CONSTRUCTOR, { value });
  }
  return subject[IS_CONSTRUCTOR];
}
