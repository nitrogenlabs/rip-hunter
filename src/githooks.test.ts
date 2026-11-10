import {afterEach, expect, test} from '@nlabs/lex/test-vitest';
import {spawnSync} from 'node:child_process';
import {chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import preCommit from '../.githooks/pre-commit?raw';
import prePush from '../.githooks/pre-push?raw';

const directories: string[] = [];
const fixture = async (inherited: NodeJS.ProcessEnv = {}) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'rip-hunter-hooks-'));
  directories.push(directory);
  const bin = path.join(directory, 'bin');
  await mkdir(bin);
  const trace = path.join(directory, 'commands');
  const config = path.join(directory, 'isolated.config');
  await writeFile(config, '');
  // A real hook exports repository/index variables; no temp process may inherit that namespace.
  const isolated = Object.fromEntries(Object.entries({...process.env, ...inherited})
    .filter(([key]) => !key.startsWith('GIT_')));
  const environment = {...isolated, GIT_CONFIG_GLOBAL: config, GIT_CONFIG_NOSYSTEM: '1',
    HOOK_TRACE: trace, PATH: `${bin}:${process.env.PATH}`};
  const git = (...args: string[]) => {
    const result = spawnSync('git', args, {cwd: directory, encoding: 'utf8', env: environment});
    if(result.status !== 0) {
      throw new Error('Isolated git fixture failed');
    }
    return result.stdout.trim();
  };
  git('-c', 'init.templateDir=', 'init', '-q', '--initial-branch=main');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'user.name', 'Fixture');
  await writeFile(path.join(bin, 'npm'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$HOOK_TRACE"\nexit "${HOOK_EXIT_CODE:-0}"\n');
  await chmod(path.join(bin, 'npm'), 0o755);
  const hooks = {commit: path.join(directory, 'pre-commit'), push: path.join(directory, 'pre-push')};
  await writeFile(hooks.commit, preCommit);
  await writeFile(hooks.push, prePush);
  const save = async (name: string, content = 'fixture') => writeFile(path.join(directory, name), content);
  const commit = (message = 'fixture') => {
    git('add', '.');
    git('commit', '-qm', message);
    return git('rev-parse', 'HEAD');
  };
  await save('README.md');
  const base = commit();
  const run = (kind: keyof typeof hooks, input = '', exitCode = '0') => spawnSync('/bin/sh', [hooks[kind], 'origin'],
    {cwd: directory, encoding: 'utf8', env: {...environment, HOOK_EXIT_CODE: exitCode}, input});
  const commands = async () => readFile(trace, 'utf8').then((value) => value.trim().split('\n'),
    (error: NodeJS.ErrnoException) => {
      if(error.code === 'ENOENT') {
        return [];
      }
      throw error;
    });
  const push = (local: string, remote = base) => `refs/heads/feature ${local} refs/heads/feature ${remote}\n`;
  return {base, commands, commit, directory, git, push, run, save};
};

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, {force: true, recursive: true})));
});

test.each(['json', 'md', 'css', 'png'])('staged %s does not trigger pre-commit tests', async (extension) => {
  const f = await fixture();
  await f.save(`change.${extension}`);
  f.git('add', '.');

  expect(f.run('commit').status).toBe(0);
  expect(await f.commands()).toEqual([]);
});

test.each(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts'])('staged %s triggers only unit tests', async (extension) => {
  const f = await fixture();
  await f.save(`change.${extension}`);
  f.git('add', '.');

  expect(f.run('commit').status).toBe(0);
  expect(await f.commands()).toEqual(['run test:precommit']);
});

test.each(['delete', 'rename'])('staged TypeScript %s remains a unit trigger', async (change) => {
  const f = await fixture();
  await f.save('original.ts');
  f.commit();
  if(change === 'delete') {
    await rm(path.join(f.directory, 'original.ts'));
  } else {
    await rename(path.join(f.directory, 'original.ts'), path.join(f.directory, 'renamed.md'));
  }
  f.git('add', '-A');

  expect(f.run('commit').status).toBe(0);
  expect(await f.commands()).toEqual(['run test:precommit']);
});

test('an unstaged source file does not turn a staged documentation change into a unit run', async () => {
  const f = await fixture();
  await f.save('README.md', 'changed');
  f.git('add', 'README.md');
  await f.save('unstaged.ts');

  expect(f.run('commit').status).toBe(0);
  expect(await f.commands()).toEqual([]);
});

test.each(['md', 'json', 'png'])('pushed %s commits never trigger end-to-end tests', async (extension) => {
  const f = await fixture();
  await f.save(`change.${extension}`);
  const head = f.commit();

  expect(f.run('push', f.push(head)).status).toBe(0);
  expect(await f.commands()).toEqual([]);
});

test.each(['ts', 'css'])('pushed %s commits trigger only the end-to-end entry point', async (extension) => {
  const f = await fixture();
  await f.save(`change.${extension}`);
  const head = f.commit();

  expect(f.run('push', f.push(head)).status).toBe(0);
  expect(await f.commands()).toEqual(['run test:e2e']);
});

test('new branch checks every commit since its departure, including a reverted source change before final docs', async () => {
  const f = await fixture();
  f.git('checkout', '-qb', 'feature');
  await f.save('changed.ts');
  f.commit('source');
  await rm(path.join(f.directory, 'changed.ts'));
  f.commit('revert');
  await f.save('README.md', 'last docs');
  const head = f.commit('docs');

  expect(f.run('push', f.push(head, '0'.repeat(40))).status).toBe(0);
  expect(await f.commands()).toEqual(['run test:e2e']);
});

test('unreadable push range runs end-to-end tests and preserves their failure', async () => {
  const f = await fixture();

  expect(f.run('push', f.push(f.base, 'f'.repeat(40)), '17').status).toBe(17);
  expect(await f.commands()).toEqual(['run test:e2e']);
});


test('nested hook fixtures cannot inherit an outer repository, index or worktree', async () => {
  const outer = await fixture();
  const before = outer.git('rev-parse', 'HEAD');
  const beforeIndex = outer.git('write-tree');
  const beforeConfig = outer.git('config', '--local', '--list');
  const inner = await fixture({GIT_COMMON_DIR: path.join(outer.directory, '.git'),
    GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.bare', GIT_CONFIG_VALUE_0: 'true',
    GIT_DIR: path.join(outer.directory, '.git'), GIT_INDEX_FILE: path.join(outer.directory, '.git/index'),
    GIT_NAMESPACE: 'fixture-foreign', GIT_OBJECT_DIRECTORY: path.join(outer.directory, '.git/objects'), GIT_WORK_TREE: outer.directory});
  await inner.save('change.ts');
  inner.git('add', '.');

  expect(inner.run('commit').status).toBe(0);
  expect(await inner.commands()).toEqual(['run test:precommit']);
  expect(outer.git('rev-parse', 'HEAD')).toBe(before);
  expect(outer.git('write-tree')).toBe(beforeIndex);
  expect(outer.git('config', '--local', '--list')).toBe(beforeConfig);
});
