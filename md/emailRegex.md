# emailRegex

A regular expression for matching email addresses, with rigorous recognition of quoted entities, IP domains, and unicode.

## API

```ts
emailRegex: RegExp;
```

## Example

```ts
console.log(emailRegex.test("user@example.com")); // true
console.log(emailRegex.test("not-an-email")); // false
```
