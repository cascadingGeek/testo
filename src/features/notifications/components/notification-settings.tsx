import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BellOff, BellRing } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Platform, Pressable, Switch, Text, View } from 'react-native';

import { themeColors } from '@/core/theme-colors';
import { requestNotificationPermission, requestScheduleRefresh } from '@/features/notifications/scheduler';
import { useNotificationStore } from '@/store/notification-store';
import { formatTime, toLocalDate, todayString, toTimeString, type TimeString } from '@/utils/dates';

type TimeKey = 'morningTime' | 'eveningTime' | 'overdueTime';

export function NotificationSettings() {
  const state = useNotificationStore();
  const [picking, setPicking] = useState<TimeKey | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  async function handleToggleEnabled(next: boolean) {
    if (!next) {
      state.setPreference('enabled', false);
      requestScheduleRefresh(0);
      return;
    }

    const granted = await requestNotificationPermission();

    // A second request on a denied app resolves without prompting, so the only
    // way back is Settings. Say so rather than leaving a switch that won't move.
    setPermissionDenied(!granted);
    state.setPreference('enabled', granted);
    if (granted) requestScheduleRefresh(0);
  }

  function handleTime(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setPicking(null);
    if (event.type === 'dismissed' || !selected || !picking) return;

    state.setPreference(picking, toTimeString(selected.getHours(), selected.getMinutes()));
  }

  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold text-foreground">Notifications</Text>

      <Row
        label="Reminders"
        hint={state.enabled ? 'Scheduled on this device.' : 'Nothing is scheduled.'}
        value={state.enabled}
        onChange={handleToggleEnabled}
        icon={
          state.enabled ? (
            <BellRing size={18} color={themeColors.primary} />
          ) : (
            <BellOff size={18} color={themeColors.mutedForeground} />
          )
        }
      />

      {permissionDenied ? (
        <Pressable
          onPress={() => Linking.openSettings()}
          className="rounded-md bg-destructive/10 p-3"
          accessibilityRole="button"
        >
          <Text className="text-sm text-destructive">
            Notifications are turned off for this app. Tap to open Settings.
          </Text>
        </Pressable>
      ) : null}

      {state.enabled ? (
        <View className="gap-3">
          <Row
            label="Morning digest"
            hint="What's due today, plus anything overdue."
            value={state.morningDigest}
            onChange={(next) => state.setPreference('morningDigest', next)}
            time={state.morningTime}
            onPressTime={() => setPicking(picking === 'morningTime' ? null : 'morningTime')}
          />

          <Row
            label="End-of-day check"
            hint="Whether today's todos got done, high priority first."
            value={state.eveningDigest}
            onChange={(next) => state.setPreference('eveningDigest', next)}
            time={state.eveningTime}
            onPressTime={() => setPicking(picking === 'eveningTime' ? null : 'eveningTime')}
          />

          <Row
            label="Overdue nudge"
            hint="The morning after a high-priority todo passes its due date."
            value={state.overdueNudge}
            onChange={(next) => state.setPreference('overdueNudge', next)}
            time={state.overdueTime}
            onPressTime={() => setPicking(picking === 'overdueTime' ? null : 'overdueTime')}
          />

          <Row
            label="Per-todo reminders"
            hint="At the time you set on an individual todo."
            value={state.todoReminders}
            onChange={(next) => state.setPreference('todoReminders', next)}
          />

          {picking ? (
            <DateTimePicker
              value={toLocalDate(todayString(), state[picking])}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTime}
              themeVariant="dark"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type RowProps = {
  label: string;
  hint: string;
  value: boolean;
  onChange: (next: boolean) => void;
  icon?: React.ReactNode;
  time?: TimeString;
  onPressTime?: () => void;
};

function Row({ label, hint, value, onChange, icon, time, onPressTime }: RowProps) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
      {icon}

      <View className="flex-1 gap-0.5">
        <Text className="text-base text-foreground">{label}</Text>
        <Text className="text-xs text-muted-foreground">{hint}</Text>
      </View>

      {time && onPressTime ? (
        <Pressable
          onPress={onPressTime}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${label} time, currently ${formatTime(time)}`}
          className="rounded-md border border-border px-2.5 py-1.5"
        >
          <Text className="text-sm font-medium text-primary">{formatTime(time)}</Text>
        </Pressable>
      ) : null}

      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: themeColors.primary, false: undefined }}
      />
    </View>
  );
}
