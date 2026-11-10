import {defineConfig} from '@nlabs/lex/test-playwright';

export default defineConfig({fullyParallel: false, retries: 0, testDir: './src', testMatch: '**/*.e2e.ts',
  use: {headless: true}, workers: 1});
