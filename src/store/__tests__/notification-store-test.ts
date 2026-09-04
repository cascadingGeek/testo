import {
  DEFAULT_PREFERENCES,
  notificationPreferences,
  useNotificationStore,
} from '@/store/notification-store';

beforeEach(() => {
  useNotificationStore.setState({ ...DEFAULT_PREFERENCES, hasPermission: false });
});

describe('notification preferences', () => {
  it('starts switched off, so nothing is scheduled before the user asks', () => {
    expect(DEFAULT_PREFERENCES.enabled).toBe(false);
  });

  it('has sensible default times', () => {
    expect(DEFAULT_PREFERENCES.morningTime).toBe('08:00');
    expect(DEFAULT_PREFERENCES.eveningTime).toBe('20:00');
    expect(DEFAULT_PREFERENCES.overdueTime).toBe('09:00');
  });

  it('updates one preference without disturbing the others', () => {
    useNotificationStore.getState().setPreference('eveningTime', '21:30' as never);

    const prefs = notificationPreferences();
    expect(prefs.eveningTime).toBe('21:30');
    expect(prefs.morningTime).toBe(DEFAULT_PREFERENCES.morningTime);
  });

  it('excludes permission state and the setters from what callers read', () => {
    useNotificationStore.getState().setHasPermission(true);

    const prefs = notificationPreferences();
    expect(prefs).not.toHaveProperty('hasPermission');
    expect(prefs).not.toHaveProperty('setPreference');
    expect(prefs).not.toHaveProperty('setHasPermission');
  });

  it('tracks permission separately from the user’s own switch', () => {
    useNotificationStore.getState().setHasPermission(true);

    expect(useNotificationStore.getState().hasPermission).toBe(true);
    expect(useNotificationStore.getState().enabled).toBe(false);
  });
});
