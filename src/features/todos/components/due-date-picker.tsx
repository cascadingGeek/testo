import { Pressable, Text, View } from 'react-native';

import { addDaysString, formatDueDate, todayString } from '@/utils/dates';

type DueDatePickerProps = {
  value: string | null;
  onChange: (dueDate: string | null) => void;
};

/** Quick picks rather than a calendar: most todos are due within the week. */
export function DueDatePicker({ value, onChange }: DueDatePickerProps) {
  const options = [
    { label: 'Today', date: todayString() },
    { label: 'Tomorrow', date: addDaysString(1) },
    { label: 'Next week', date: addDaysString(7) },
  ];

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">Due date</Text>
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={12} accessibilityRole="button">
            <Text className="text-sm text-muted-foreground">Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row gap-2">
        {options.map((option) => {
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

      <Text className="text-sm text-muted-foreground">
        {value ? `Due ${formatDueDate(value)}` : 'No due date'}
      </Text>
    </View>
  );
}
