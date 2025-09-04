# parseEnv

Parses environment variable strings into objects.

## API

```ts
parseEnv(env: string): Record<string, string>
```

- **env**: Environment string (e.g., from `.env` file).
- **returns**: Object mapping variable names to values.

## Example

```ts
import { parseEnv } from './parseEnv';

const envStr = 'FOO=bar\nBAZ=qux';
console.log(parseEnv(envStr)); // { FOO: 'bar', BAZ: 'qux' }
```
