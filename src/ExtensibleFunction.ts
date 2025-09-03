type AsArray<T> = T extends any[] ? T : [T];

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class _ExtensibleFunction<I, O> extends Function {
  // @ts-expect-error Not calling Function on `this` here.
  constructor(f: (...args: AsArray<I>) => O) {
    Object.setPrototypeOf(f, new.target.prototype);
    return f;
  }
}
interface _ExtensibleFunction<I, O> {
  (...args: AsArray<I>): O;
}

export class ExtensibleFunction<I, O> extends _ExtensibleFunction<I, O> {
  constructor() {
    super((...args: AsArray<I>) => {
      return (this as any).invoke(...args);
    });
    if (typeof (this as any).invoke !== "function") {
      throw new Error(`${this.name}.invoke is not implemented`);
    }
  }
}