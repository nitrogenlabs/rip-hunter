import {afterEach, describe, expect, it, vi} from 'vitest';

import {scheduleDeadline} from './deadline.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('absolute deadline scheduling', () => {
  it('accounts for elapsed time when a timer callback wakes early', async () => {
    vi.useFakeTimers();
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    const expire = vi.fn();
    const clear = scheduleDeadline(50, expire);
    clock.mockReturnValue(10);
    await vi.advanceTimersByTimeAsync(50);

    expect(expire).not.toHaveBeenCalled();

    clock.mockReturnValue(50);
    await vi.advanceTimersByTimeAsync(40);

    expect(expire).toHaveBeenCalledOnce();

    clear();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('expires without a timer when setup consumes the entire deadline', () => {
    vi.useFakeTimers();
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(50);
    const expire = vi.fn();
    const clear = scheduleDeadline(50, expire);

    expect(expire).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);

    clear();

    expect(vi.getTimerCount()).toBe(0);
  });
});
