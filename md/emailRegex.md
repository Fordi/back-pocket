# emailRegex

Exports a regular expression for matching email addresses.

## API

### `emailRegex: RegExp`
- **Type**: Regular expression for validating email addresses.

## Example
```ts
import { emailRegex } from './emailRegex';

console.log(emailRegex.test('user@example.com')); // true
console.log(emailRegex.test('not-an-email')); // false
```
