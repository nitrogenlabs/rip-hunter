import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFile, mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const [archive, directory] = process.argv.slice(2);
assert.ok(archive && path.isAbsolute(archive), 'Supply an absolute frozen archive path.');
assert.ok(directory && path.isAbsolute(directory), 'Supply an absolute clean consumer directory.');
await mkdir(directory, {recursive: true});
assert.deepEqual(await readdir(directory), [], 'The qualification consumer directory must be empty.');
const run = (command, args) => {
  const result = spawnSync(command, args, {cwd: directory, env: {...process.env, npm_config_ignore_scripts: 'true'},
    stdio: 'inherit'});
  assert.equal(result.status, 0, 'Public consumer qualification command failed.');
};
await writeFile(path.join(directory, 'package.json'), JSON.stringify({dependencies: {
  '@nlabs/lex': '2.1.2', '@nlabs/rip-hunter': archive, '@types/node': '26.2.0', '@types/react': '19.3.0',
  react: '19.3.1', 'react-native': '0.86.0', typescript: '6.0.3'
}, private: true, type: 'module'}, null, 2));
run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund']);
const fixtures = path.dirname(fileURLToPath(import.meta.url));
await Promise.all(['contract.ts', 'node.ts', 'browser.ts', 'native.ts']
  .map((file) => copyFile(path.join(fixtures, file), path.join(directory, file))));
const platformTypes = {browser: [], native: ['react-native'], node: ['node']};
await Promise.all(['node', 'browser', 'native'].map(async (platform) => {
  const config = {compilerOptions: {exactOptionalPropertyTypes: true,
    lib: platform === 'browser' ? ['ES2023', 'DOM', 'DOM.Iterable'] : ['ES2023'],
    module: 'NodeNext', moduleResolution: 'NodeNext', noEmit: true, skipLibCheck: false, strict: true,
    target: 'ES2023', types: platformTypes[platform]}, files: ['contract.ts', `${platform}.ts`]};
  await writeFile(path.join(directory, `tsconfig.${platform}.json`), JSON.stringify(config));
}));
for(const platform of ['node', 'browser', 'native']) {
  run(process.execPath, [path.join(directory, 'node_modules/typescript/bin/tsc'), '--project', `tsconfig.${platform}.json`]);
}
const runtime = `import assert from 'node:assert/strict';
import {assertHttpSuccess, httpRequest} from '@nlabs/rip-hunter/http';
import {ApiError} from '@nlabs/rip-hunter/errors';
globalThis.fetch = () => {throw new Error('Unexpected outbound request');};
let calls=0;
const requestImplementation=async (_input, init) => {
  calls++;
  assert.equal(init.redirect, 'manual');
  return new Response('{"error":"synthetic"}', {status:402,headers:{'content-type':'application/problem+json'}});
};
await assert.rejects(httpRequest('https://fixture.invalid', {requestImplementation,redirect:'manual',timeout:1000},
  async response => {await assertHttpSuccess(response, {});}), error => error instanceof ApiError
    && error.status === 402 && error.responseBody.error === 'synthetic');
assert.equal(calls,1);
const ok = await httpRequest('https://fixture.invalid', {requestImplementation:async()=>new Response('{"ok":true}')},
  async response=>{await assertHttpSuccess(response,{});return response.json();});
assert.deepEqual(ok,{ok:true});
console.log('Verified installed public HTTP status handling and ApiError identity.');
`;
await writeFile(path.join(directory, 'runtime.mjs'), runtime);
run(process.execPath, ['runtime.mjs']);
const installed = JSON.parse(await readFile(path.join(directory, 'node_modules/@nlabs/rip-hunter/package.json'), 'utf8'));
assert.equal(installed.name, '@nlabs/rip-hunter');
process.stdout.write(`Qualified ${installed.name}@${installed.version} through Node, browser and React Native declarations.\n`);
