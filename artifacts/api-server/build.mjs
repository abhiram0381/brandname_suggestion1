import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(root, 'src', 'index.ts')],
  outfile: path.join(root, 'dist', 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  packages: 'external',
  logLevel: 'info',
});
