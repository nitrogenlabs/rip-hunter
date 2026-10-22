export default {
  test: {
    coverage: {
      enabled: true,
      include: ['src/http.ts', 'src/deadline.ts', 'src/binaryResponse.ts'],
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage/settlement',
      thresholds: {branches: 90, functions: 90, lines: 90, perFile: true, statements: 90}
    },
    globals: true,
    include: ['src/http.test.ts', 'src/http.operation.test.ts', 'src/deadline.test.ts', 'src/binaryResponse.test.ts'],
    maxWorkers: 1
  }
};
