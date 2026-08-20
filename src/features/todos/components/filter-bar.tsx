import { Pressable, ScrollView, Text } from 'react-native';

import { FILTER_LABELS, TODO_FILTERS, type TodoFilter } from '@/utils/todo-filters';

type FilterBarProps = {
  value: TodoFilter;
  counts: Record<TodoFilter, number>;
  onChange: (filter: TodoFilter) => void;
};

export function FilterBar({ value, counts, onChange }: FilterBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
      {TODO_FILTERS.map((filter) => {
        const isSelected = filter === value;

        return (
          <Pressable
            key={filter}
            onPress={() => onChange(filter)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${FILTER_LABELS[filter]}, ${counts[filter]} todos`}
            className={`rounded-full border px-3.5 py-2 ${
              isSelected ? 'border-primary bg-primary' : 'border-border bg-card'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                isSelected ? 'text-primary-foreground' : 'text-foreground'
              }`}
            >
              {FILTER_LABELS[filter]} {counts[filter]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
