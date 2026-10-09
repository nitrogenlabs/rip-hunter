/** Schedule a finite positive absolute deadline without platform timer overflow. */
export const scheduleDeadline = (timeout: number, expire: () => void): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const startedAt = performance.now();
  const schedule = (): void => {
    const remaining = timeout - (performance.now() - startedAt);
    if(remaining <= 0) {
      expire();
    } else {
      // Platform timers overflow above a signed 32-bit millisecond delay.
      timer = setTimeout(schedule, Math.min(remaining, 2_147_483_647));
    }
  };
  schedule();
  return () => {
    if(timer !== undefined) {
      clearTimeout(timer);
    }
  };
};
