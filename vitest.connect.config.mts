export default {test: {environment: 'node', include: ['src/nodeHttps.test.ts', 'src/nodeHttps.connect.test.ts'],
  coverage: {enabled: true, include: ['src/nodeHttps.ts'], provider: 'v8', reporter: ['text'],
    thresholds: {branches: 90, functions: 90, lines: 90, statements: 90}}}};
