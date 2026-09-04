import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { authStorage } from '@/lib/session-storage';
import { asTimeString, type TimeString } from '@/utils/dates';

export type NotificationPreferences = {
  /** Master switch. Off means nothing is scheduled, whatever else is set. */
  enabled: boolean;

  morningDigest: boolean;
  morningTime: TimeString;

  eveningDigest: boolean;
  eveningTime: TimeString;

  /** A nudge the morning after a high-priority todo's due date passes. */
  overdueNudge: boolean;
  overdueTime: TimeString;

  /** Per-todo reminders at the todo's own due_date + due_time. */
  todoReminders: boolean;
};

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  morningDigest: true,
  morningTime: asTimeString('08:00'),
  eveningDigest: true,
  eveningTime: asTimeString('20:00'),
  overdueNudge: true,
  overdueTime: asTimeString('09:00'),
  todoReminders: true,
};

/**
 * Declared above the store on purpose: createJSONStorage calls its getter
 * immediately at module load, so a const defined further down would still be
 * in the temporal dead zone. zustand swallows the resulting throw and leaves
 * the store with no storage at all, which fails silently at the first write.
 *
 * Used where there is no localStorage — web prerender, and under Jest.
 */
const inMemoryStorage: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
};

type NotificationState = NotificationPreferences & {
  /** Whether the OS has granted permission. Not persisted — always re-checked. */
  hasPermission: boolean;
  setPreference: <TKey extends keyof NotificationPreferences>(
    key: TKey,
    value: NotificationPreferences[TKey]
  ) => void;
  setHasPermission: (hasPermission: boolean) => void;
};

/**
 * Device-local on purpose: these schedule notifications on this device, and a
 * phone and a tablet can reasonably want different times. If remote push is
 * ever added the schedule moves server-side and these move to a table.
 */
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      hasPermission: false,
      setPreference: (key, value) => set({ [key]: value } as Partial<NotificationState>),
      setHasPermission: (hasPermission) => set({ hasPermission }),
    }),
    {
      name: 'notification-preferences',
      storage: createJSONStorage(() => authStorage ?? inMemoryStorage),
      // hasPermission comes from the OS, which can revoke it while the app is
      // closed, so persisting it would let a stale `true` survive a denial.
      partialize: ({ hasPermission: _ignored, setPreference, setHasPermission, ...rest }) => rest,
    }
  )
);

export function notificationPreferences(): NotificationPreferences {
  const { hasPermission: _p, setPreference: _s, setHasPermission: _h, ...rest } =
    useNotificationStore.getState();
  return rest;
}
