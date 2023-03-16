import { cp } from 'node:fs/promises';

await cp('index.d.ts', 'index.d.cts');
await cp('index-lt-4.7.4.d.ts', 'index-lt-4.7.4.d.cts');
