import {defineConfig} from 'vitest/config';
export default defineConfig({test: {coverage: {enabled: true, include: ['src/httpResponse.ts', 'src/errors/ApiError.ts'], provider: 'v8', reporter: ['text'], thresholds: {branches: 90, functions: 90, lines: 90, statements: 90}}, environment: 'node', globals: true, include: ['src/**/*.test.ts']}});
