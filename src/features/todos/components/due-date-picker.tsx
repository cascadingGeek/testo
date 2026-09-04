import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDays, Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { themeColors } from '@/core/theme-colors';
import {
  addDaysString,
  asDateString,
  formatDueDate,
  formatTime,
  toLocalDate,
  todayString,
  toTimeString,
  type DateString,
  type TimeString,
} from '@/utils/dates';

type DueDatePickerProps = {
  value: DateString | null;
  time: TimeString | null;
  onChange: (dueDate: DateString | null) => void;
  onTimeChange: (dueTime: TimeString | null) => void;
};

/**
 * Quick picks cover most todos; the calendar covers the rest. The three
 * buttons alone could not express "in three weeks", and a reminder time has no
 * useful shortlist at all — 09:00 is not most people's morning.
 */
export function DueDatePicker({ value, time, onChange, onTimeChange }: DueDatePickerProps) {
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);

  const quickPicks = [
    { label: 'Today', date: todayString() },
    { label: 'Tomorrow', date: addDaysString(1) },
    { label: 'Next week', date: addDaysString(7) },
  ];

  function handleDate(event: DateTimePickerEvent, selected?: Date) {
    // Android fires this for the Cancel button too; iOS keeps the picker open.
    if (Platform.OS === 'android') setPicking(null);
    if (event.type === 'dismissed' || !selected) return;

    const year = selected.getFullYear();
    const month = String(selected.getMonth() + 1).padStart(2, '0');
    const day = String(selected.getDate()).padStart(2, '0');
    onChange(asDateString(`${year}-${month}-${day}`));
  }

  function handleTime(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setPicking(null);
    if (event.type === 'dismissed' || !selected) return;

    onTimeChange(toTimeString(selected.getHours(), selected.getMinutes()));
  }

  function clearDate() {
    onChange(null);
    // A time with no date has nothing to fire on, and the database rejects it.
    onTimeChange(null);
    setPicking(null);
  }

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">Due date</Text>
        {value ? (
          <Pressable onPress={clearDate} hitSlop={12} accessibilityRole="button">
            <Text className="text-sm text-muted-foreground">Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row gap-2">
        {quickPicks.map((option) => {
          const isSelected = value === option.date;

          return (
            <Pressable
              key={option.label}
              onPress={() => onChange(option.date)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              className={`flex-1 items-center rounded-md border px-2 py-2.5 ${
                isSelected ? 'border-primary bg-primary' : 'border-border bg-card'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isSelected ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => setPicking(picking === 'date' ? null : 'date')}
          accessibilityRole="button"
          accessibilityLabel="Pick a specific due date"
          className="flex-1 flex-row items-center justify-center gap-2 rounded-md border border-border bg-card px-2 py-2.5"
        >
          <CalendarDays size={16} color={themeColors.foreground} />
          <Text className="text-sm font-medium text-foreground">
            {value ? formatDueDate(value) : 'Pick a date'}
          </Text>
        </Pressable>

        {/* Only once there is a date: a reminder time needs a day to sit on. */}
        {value ? (
          <Pressable
            onPress={() => setPicking(picking === 'time' ? null : 'time')}
            accessibilityRole="button"
            accessibilityLabel={time ? `Reminder at ${formatTime(time)}` : 'Add a reminder time'}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-md border px-2 py-2.5 ${
              time ? 'border-primary bg-primary' : 'border-border bg-card'
            }`}
          >
            <Clock
              size={16}
              color={time ? themeColors.primaryForeground : themeColors.foreground}
            />
            <Text
              className={`text-sm font-medium ${
                time ? 'text-primary-foreground' : 'text-foreground'
              }`}
            >
              {time ? formatTime(time) : 'Remind me'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {picking === 'date' ? (
        <DateTimePicker
          value={toLocalDate(value ?? todayString(), null)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleDate}
          themeVariant="dark"
        />
      ) : null}

      {picking === 'time' && value ? (
        <DateTimePicker
          value={toLocalDate(value, time ?? toTimeString(9, 0))}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTime}
          themeVariant="dark"
        />
      ) : null}

      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-muted-foreground">
          {value ? `Due ${formatDueDate(value)}` : 'No due date'}
          {value && time ? ` at ${formatTime(time)}` : ''}
        </Text>

        {value && time ? (
          <Pressable onPress={() => onTimeChange(null)} hitSlop={12} accessibilityRole="button">
            <Text className="text-sm text-muted-foreground">Remove reminder</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
