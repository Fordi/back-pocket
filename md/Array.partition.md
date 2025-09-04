# Array.partition

Splits an array into two or more arrays based on a predicate function.

## API

### Pairs

Split an array into two given a rule.

```typescript
partition<T>(array: T[], predicate: (item: T, index: number) => boolean): [T[], T[]]
```

- **array**: The array to partition.
- **predicate**: Function to test each element.
- **returns**: A tuple of two arrays: `[matches, nonMatches]`.

#### Pairs Example

```typescript
const numbers = [1, 2, 3, 4, 5];
const [evens, odds] = partition(numbers, (n) => n % 2 === 0);
console.log(evens); // [2, 4]
console.log(odds); // [1, 3, 5]
```

### Slots

Split an array into N buckets, given a rule.

```typescript
partition<T>(array: T[], predicate: (item: T, index: number) => number): T[][]
```

- **array**: The array to partition.
- **predicate**: Function to test each element, returning the slot number to put the element into
- **returns**: An array of arrays.

#### Slots Example

```typescript
const numbers = [1, 2, 3, 4, 5, 6];
const results = partition(numbers, (_, i) => i >> 1);
console.log(results[0]); // [1, 2]
console.log(results[1]); // [3, 4]
console.log(results[2]); // [5, 6]
```

### Groups

Split an array into named groups, given a rule.

```typescript
partition<T>(array: T[], predicate: (item: T, index: string | Symbol) => number): Record<string|Symbol, T>
```

- **array**: The array to partition.
- **predicate**: Function to test each element, returning the group name to put the element into
- **returns**: An object with names pointing to arrays

#### Groups Example

```typescript
const words = ["apple", "antelope", "ball", "baton", "car", "castle"];
const results = partition(words, (word) => word.slice(0, 1));
console.log(results.a); // ["apple", "antelope"]
console.log(results.b); // ["ball", "baton"]
console.log(results.c); // ["car", "castle"]
```
