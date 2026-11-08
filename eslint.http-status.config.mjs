import {fileURLToPath} from 'node:url';
import {typescriptConfig} from 'eslint-config-styleguidejs';

const files = ['src/releaseWorkflow.test.ts', 'src/workflowRaw.d.ts', 'src/http.ts', 'src/httpResponse.ts', 'src/http.status.test.ts',
  'tests/public-http-types/contract.ts', 'tests/public-http-types/verify-consumer.mjs'];

export default [{ignores: ['**/*', '!**/', ...files.map((file) => `!${file}`)]}, ...typescriptConfig,
  {files: ['tests/public-http-types/contract.ts'], languageOptions: {parserOptions: {
    project: fileURLToPath(new URL('./tests/public-http-types/tsconfig.node.json', import.meta.url)),
    projectService: false, tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url))
  }}}];
