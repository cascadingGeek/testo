import { renderHook, act } from '@testing-library/react-native';

import { useToday } from '@/hooks/use-today';

describe('useToday', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts on the current local day', async () => {
    jest.setSystemTime(new Date(2026, 7, 27, 14, 0, 0));

    const { result } = await renderHook(() => useToday());

    expect(result.current).toBe('2026-08-27');
  });

  it('rolls over at local midnight without a re-render from anywhere else', async () => {
    jest.setSystemTime(new Date(2026, 7, 27, 23, 59, 0));

    const { result } = await renderHook(() => useToday());
    expect(result.current).toBe('2026-08-27');

    // Past midnight, plus the timer's own slack.
    await act(async () => {
      jest.advanceTimersByTime(61 * 1000 + 2000);
    });

    expect(result.current).toBe('2026-08-28');
  });

  it('keeps rolling on subsequent days, so the timer reschedules itself', async () => {
    jest.setSystemTime(new Date(2026, 7, 27, 23, 59, 0));

    const { result } = await renderHook(() => useToday());

    await act(async () => {
      jest.advanceTimersByTime(61 * 1000 + 2000);
    });
    expect(result.current).toBe('2026-08-28');

    await act(async () => {
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    });
    expect(result.current).toBe('2026-08-29');
  });

  it('does not change identity when the day has not moved', async () => {
    jest.setSystemTime(new Date(2026, 7, 27, 1, 0, 0));

    const { result } = await renderHook(() => useToday());
    const first = result.current;

    await act(async () => {
      jest.advanceTimersByTime(60 * 60 * 1000);
    });

    expect(result.current).toBe(first);
  });
});
