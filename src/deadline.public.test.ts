import {readFile} from 'node:fs/promises';
import {describe, expect, it, test} from 'vitest';

import {scheduleDeadline} from './deadline.js';

describe('public deadline export', () => {
  it('declares a lean runtime and declaration entry for the scheduler', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

    expect(manifest.exports['./deadline']).toEqual({default: './lib/deadline.js', import: './lib/deadline.js', types: './lib/deadline.d.ts'});
    expect(typeof scheduleDeadline).toBe('function');
  });
});

test('uses the shared scheduler across intervals beyond the platform limit', async () => {
  const {vi} = await import('vitest');
  vi.useFakeTimers();
  const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
  const expired = vi.fn();
  const clear = scheduleDeadline(2_147_483_650, expired);
  clock.mockReturnValue(2_147_483_647);
  await vi.advanceTimersByTimeAsync(2_147_483_647);

  expect(expired).not.toHaveBeenCalled();

  clock.mockReturnValue(2_147_483_650);
  await vi.advanceTimersByTimeAsync(3);

  expect(expired).toHaveBeenCalledOnce();

  clear();

  expect(vi.getTimerCount()).toBe(0);

  vi.useRealTimers();
  vi.restoreAllMocks();
});
