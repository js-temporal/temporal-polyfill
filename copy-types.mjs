import { cp } from 'node:fs/promises';

await cp('index.d.ts', 'index.d.cts');
