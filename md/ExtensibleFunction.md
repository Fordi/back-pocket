# ExtensibleFunction

A base class for creating functions with additional properties or methods.

## API

### `class ExtensibleFunction<Params[], Returns> extends Function`

- Allows you to create callable objects with custom methods/properties.

## Example

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
console.log(fn());      // 'called'
console.log(fn.extra()); // 'extra'
```
