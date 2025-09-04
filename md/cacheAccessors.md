# cacheAccessors

A utility to bulk-annotate a class for cacheing property accessors, with automatic and manual cache staling.  This can be especially useful for getters that compute a promise.

## API

```ts
cacheAccessors<T>(target: T, ...names: string[]): (...names: string[]);
```

- **target**: The object to redefine the accessor on
- **names**: The accessor names
- **returns**: A function for manually staleing cached entries.

### Example

```ts
class MyClass {
  #stale: (...names: string[]) => void;
  constructor() {
    this.#stale = cacheAccessors(this, "expensive", "notCheap");
  }

  expensiveRan = 0;
  // Will only get called once, then only once after
  // each call to `this.#stale("expensive")`
  // or `this.#stale()`
  get expensive() {
    this.expensiveRan++;
    return doSomethingHardWith(this);
  }

  notCheapRan = 0;
  #notCheapState;
  // Same, but will also get called after any instance
  // of `this.notCheap = value;`
  get notCheap() {
    return process(this.#notCheapState);
  }

  // This
  set notCheap(v: any) {
    this.#notCheapState = decodeState(v);
  }

  reset() {
    // do other instance resetting
    // ...
    // then stale all cached accessors
    this.#stale();
  }
}

const inst = new MyClass();
console.log(obj.expensiveRan); // 0
console.log(obj.expensive);    // Computed and cached
console.log(obj.expensiveRan); // 1
console.log(obj.expensive);    // Cached value
console.log(obj.expensiveRan); // 1

console.log(obj.notCheapRan);   // 0
console.log(obj.notCheap);      // Computed and cached
console.log(obj.notCheapRan);   // 1
console.log(obj.notCheap);      // Cached value
console.log(obj.notCheapRan);   // 1
obj.notCheap = fetchNotCheap(); // setters stale the cache for their getter, but do not run it
console.log(obj.notCheapRan);   // 1
console.log(obj.notCheap);      // Recomputed
console.log(obj.notCheapRan);   // 2
```
