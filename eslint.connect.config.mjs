import {typescriptConfig} from 'eslint-config-styleguidejs';

const files = ['src/nodeHttps.ts', 'src/nodeHttps.connect.test.ts', 'src/githooks.test.ts',
  'src/http.e2e.ts', 'src/graphql.e2e.ts', 'src/nodeHttps.e2e.ts', 'playwright.integration.config.ts',
  'tests/public-http-types/node.ts'];
export default [{ignores: ['**/*', '!**/', ...files.map((file) => `!${file}`)]}, ...typescriptConfig,
  {files: ['src/*.e2e.ts'], rules: {'import/no-extraneous-dependencies': ['error', {devDependencies: true}]}},
  {files: ['playwright.integration.config.ts'], languageOptions: {parserOptions: {
    projectService: {allowDefaultProject: ['playwright.integration.config.ts']}, tsconfigRootDir: import.meta.dirname
  }}}, {files: ['tests/public-http-types/node.ts'], languageOptions: {parserOptions: {
    project: new URL('./tests/public-http-types/tsconfig.node.json', import.meta.url).pathname,
    projectService: false, tsconfigRootDir: import.meta.dirname
  }}}];
