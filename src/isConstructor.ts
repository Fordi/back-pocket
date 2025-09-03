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
  const subjectProxy = new Proxy(subject, handler);
  if (!(IS_CONSTRUCTOR in subject)) {
    try {
      new subjectProxy();
      Object.defineProperty(subject, IS_CONSTRUCTOR, { value: true });
    } catch (e) {
      Object.defineProperty(subject, IS_CONSTRUCTOR, { value: false });
    }
  }
  return subject[IS_CONSTRUCTOR];
}
