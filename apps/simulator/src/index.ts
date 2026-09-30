import { run } from './simulator';

run().catch((err: unknown) => {
  console.error('Fatal:', (err as Error).message);
  process.exit(1);
});
