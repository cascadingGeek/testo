import { Pressable, Text, View } from 'react-native';

import { TODO_PRIORITIES } from '@/features/todos/todo-schemas';
import type { TodoPriority } from '@/types/todo';

type PrioritySelectorProps = {
  value: TodoPriority;
  onChange: (priority: TodoPriority) => void;
};

/**
 * A segmented control rather than a dropdown. With three short options a
 * picker costs an extra tap and hides the choices behind a modal; on mobile,
 * showing all of them is both faster and more discoverable.
 */
export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">Priority</Text>
      <View className="flex-row gap-2">
        {TODO_PRIORITIES.map((priority) => {
          const isSelected = priority === value;

          return (
            <Pressable
              key={priority}
              onPress={() => onChange(priority)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              className={`flex-1 items-center rounded-md border px-3 py-2.5 ${
                isSelected ? 'border-primary bg-primary' : 'border-border bg-card'
              }`}
            >
              <Text
                className={`text-sm font-medium capitalize ${
                  isSelected ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                {priority}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
