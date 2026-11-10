import {afterEach, expect, it} from '@nlabs/lex/test-vitest';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chmod, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// eslint-disable-next-line import/extensions -- The Vite raw loader requires the YAML extension and query.
import workflow from '../.github/workflows/release-package.yml?raw';

const directories: string[] = [];
const runBlock = (name: string): string => {
  const step = workflow.split('\n      - ').find((value) => value.includes(`name: ${name}\n`));
  const body = step?.split('        run: |\n')[1];
  if(!body) {
    throw new Error('Missing workflow verification step');
  }
  return body.split('\n').map((line) => line.replace(/^          /, '')).join('\n');
};
const fixture = async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'rip-hunter-workflow-'));
  directories.push(directory);
  const bin = path.join(directory, 'bin');
  await mkdir(bin);
  const executable = async (name: string, source: string) => {
    const file = path.join(bin, name);
    await writeFile(file, source);
    await chmod(file, 0o755);
  };
  const manifest = {name: '@nlabs/rip-hunter', type: 'module', version: '3.5.2'};
  await writeFile(path.join(directory, 'package.json'), JSON.stringify(manifest));
  const frozen = Buffer.from('synthetic immutable publication bytes');
  const archive = path.join(directory, 'nlabs-rip-hunter-3.5.2.tgz');
  const release = path.join(directory, 'rip-hunter-release');
  await mkdir(release);
  await writeFile(archive, frozen);
  await writeFile(path.join(release, 'tags-before.json'), JSON.stringify({latest: '3.5.0'}));
  const metadata = {...manifest, 'dist.integrity': `sha512-${createHash('sha512').update(frozen).digest('base64')}`};
  await executable('npm', `#!${process.execPath}
import {appendFileSync,copyFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2);
appendFileSync('commands.jsonl',JSON.stringify(args)+'\\n');
if(args.includes('lint')&&process.env.FAIL_SOURCE_LINT==='1')process.exit(1);
if(args[0]==='whoami') {
  if(process.env.FAIL_IDENTITY==='1')process.exit(1);
  console.log('synthetic-identity');
} else if(args[0]==='view') {
  if(args[1]==='@nlabs/rip-hunter@3.5.1'&&args[2]==='version') {
    console.log(JSON.stringify('3.5.1'));process.exit(0);
  }
  if(args[2]==='dist-tags') {
    const count=existsSync('tag-count')?Number(readFileSync('tag-count','utf8')):0;
    writeFileSync('tag-count',String(count+1));
    console.log(JSON.stringify(count===0?{latest:'3.5.0'}:{latest:'3.5.0','vault-cutover':'3.5.2'}));
  } else if(args[2]==='name') {
    console.log(JSON.stringify({...${JSON.stringify(metadata)},...(process.env.CORRUPT_METADATA==='1'?{'dist.integrity':'corrupt'}:{})}));
  } else {
    console.log(JSON.stringify({error:{code:'E404'}}));process.exitCode=1;
  }
} else if(args[0]==='pack') {
  const target=args[args.indexOf('--pack-destination')+1];
  copyFileSync(process.env.RIPHUNTER_ARCHIVE,path.join(target,path.basename(process.env.RIPHUNTER_ARCHIVE)));
  console.log('[]');
}
`);
  await executable('timeout', '#!/bin/sh\nshift 2\nexec "$@"\n');
  const execute = (name: string, environment: Record<string, string> = {}) => spawnSync('/bin/bash',
    ['-e', '-u', '-o', 'pipefail', '-c',
      `WORKFLOW_TEST_SECONDS=0
sleep() { WORKFLOW_TEST_SECONDS=$((WORKFLOW_TEST_SECONDS + $1)); }
${runBlock(name).replace(/\bSECONDS\b/g, 'WORKFLOW_TEST_SECONDS')}`], {
      cwd: directory, encoding: 'utf8', env: {...process.env, PATH: `${bin}:${process.env.PATH}`,
        RIPHUNTER_ARCHIVE: archive, RIPHUNTER_DIST_TAG: 'vault-cutover', RUNNER_TEMP: directory, ...environment}
    });
  return {directory, execute};
};

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, {force: true, recursive: true})));
});

it('successful source lint continues to the explicit fixture lint gate', async () => {
  const {directory, execute} = await fixture();
  const owner = path.join(directory, 'node_modules/@nlabs/lex');
  await mkdir(owner, {recursive: true});
  await writeFile(path.join(owner, 'package.json'), JSON.stringify({exports: './index.mjs', type: 'module'}));
  await writeFile(path.join(owner, 'index.mjs'), `
export const lint=async (_options,callback=process.exit)=>{callback(0);return 0;};
export const resolveBinaryPath=()=>new URL('./eslint.mjs',import.meta.url).pathname;
`);
  await writeFile(path.join(owner, 'eslint.mjs'), `
import {writeFileSync} from 'node:fs';
writeFileSync('fixture-lint.json',JSON.stringify(process.argv.slice(2)));
`);
  const result = execute('Verify package');

  expect({status: result.status, stderr: result.stderr}).toMatchObject({status: 0});
  expect(JSON.parse(await readFile(path.join(directory, 'fixture-lint.json'), 'utf8')))
    .toEqual(expect.arrayContaining(['tests/public-http-types/contract.ts', 'tests/public-http-types/verify-consumer.mjs',
      '--max-warnings', '0']));
});

it('waits for an initially stale successful distribution-tag read without republishing', async () => {
  const {directory, execute} = await fixture();
  const result = execute('Verify registry publication');

  expect({status: result.status, stderr: result.stderr}).toMatchObject({status: 0});
  expect(await readFile(path.join(directory, 'tag-count'), 'utf8')).toBe('2');

  const commands = (await readFile(path.join(directory, 'commands.jsonl'), 'utf8')).trim().split('\n')
    .map((line) => JSON.parse(line) as string[]);

  expect(commands.filter(([command]) => command === 'publish')).toEqual([]);
  expect(commands.filter(([command]) => command === 'pack')).toHaveLength(1);
});

it('stops before fixture verification when source lint rejects the candidate', async () => {
  const {directory, execute} = await fixture();
  const result = execute('Verify package', {FAIL_SOURCE_LINT: '1'});

  expect(result.status).toBe(1);
  await expect(readFile(path.join(directory, 'fixture-lint.json'))).rejects.toMatchObject({code: 'ENOENT'});
});

it('rejects conflicting immutable metadata before waiting for tag propagation', async () => {
  const {directory, execute} = await fixture();
  const result = execute('Verify registry publication', {CORRUPT_METADATA: '1'});

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('AssertionError');
  await expect(readFile(path.join(directory, 'tag-count'))).rejects.toMatchObject({code: 'ENOENT'});
});


it('authenticated identity failure stops before treating a version E404 as absence', async () => {
  const {directory, execute} = await fixture();
  const result = execute('Verify package', {FAIL_IDENTITY: '1'});

  expect(result.status).toBe(1);

  const commands = (await readFile(path.join(directory, 'commands.jsonl'), 'utf8')).trim().split('\n')
    .map((line) => JSON.parse(line) as string[]);

  expect(commands).toEqual([['whoami', '--registry=https://registry.npmjs.org', '--fetch-retries=0']]);
});
