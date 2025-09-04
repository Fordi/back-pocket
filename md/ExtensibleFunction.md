# ExtensibleFunction

A base class for creating functions with additional properties or methods.

## API

```ts
class ExtensibleFunction<Params[], Returns> extends Function;
```

- Params[] - the parameter types of the function
- Returns - the return type of the function

### Example

```ts
import { ExtensibleFunction } from './ExtensibleFunction';

class MyFunc extends ExtensibleFunction<[], string> {
  invoke() {
    return 'called';
  }

  extra() {
    return 'extra';
  }
}

const fn = new MyFunc();
console.log(fn());             // 'called'
console.log(fn.extra());       // 'extra'
console.log(typeof fn);        // 'function'
console.log(fn instanceof fn); // true
```
