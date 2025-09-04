# isConstructor

Checks if a value is a constructor function, without incidentally executing a valid constructor.

## API

```ts
isConstructor(value: any): boolean;
```

- **value**: The value to check.
- **returns**: `true` if the value is a constructor, otherwise `false`.

## Example

```ts
import { isConstructor } from "./isConstructor";

class Foo {}
console.log(isConstructor(Foo)); // true
console.log(isConstructor(() => {})); // false
```
