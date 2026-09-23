# network-core-sdk
Primus Network zkTLS Core SDK

## installation

```sh
npm install
```


## test

```sh
npm run test [-- test/xxxx.text.ts]
```

## Logging

Pass an optional logger when constructing the SDK:

```ts
import { PrimusNetwork, type Logger } from '@primuslabs/network-core-sdk';

const logger: Logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
const primus = new PrimusNetwork({ logger });
```

The logger receives the original diagnostic arguments and should not throw. You
can forward these methods to your application's structured logger, or provide
no-op methods to silence SDK diagnostics. Configuration belongs to each SDK
instance. `new PrimusNetwork()` continues to use `console.log`, `console.warn`,
and `console.error` with no changes required.

This option covers the SDK's TypeScript diagnostics. Native/WASM engine output
and the provider wrapper's development-only `console.debug` output are separate.
