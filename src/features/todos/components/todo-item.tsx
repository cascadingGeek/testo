import { Link } from 'expo-router';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatDueDate, isOverdue } from '@/lib/dates';
import type { TodoWithCategory } from '@/features/todos/todos-api';
import type { TodoPriority } from '@/types/todo';

const PRIORITY_DOT: Record<TodoPriority, string> = {
  low: 'bg-muted-foreground',
  medium: 'bg-primary',
  high: 'bg-destructive',
};

type TodoItemProps = {
  todo: TodoWithCategory;
  onToggle: (todo: TodoWithCategory) => void;
  onDelete: (id: string) => void;
};

function TodoItemComponent({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <View className="flex-row items-center gap-3 rounded-lg bg-card p-4">
      <Pressable
        onPress={() => onToggle(todo)}
        // 44x44 is Apple's minimum touch target; a 20px checkbox alone is a
        // target people miss. hitSlop grows the tappable area without
        // changing anything visually.
        hitSlop={12}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: todo.completed }}
        accessibilityLabel={`Mark "${todo.title}" as ${todo.completed ? 'not done' : 'done'}`}
        className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
          todo.completed ? 'border-primary bg-primary' : 'border-muted-foreground'
        }`}
      >
        {todo.completed ? (
          <Text className="text-xs font-bold text-primary-foreground">✓</Text>
        ) : null}
      </Pressable>

      <Link href={`/todos/${todo.id}`} asChild>
        {/* The priority dot is colour-only, which conveys nothing to a screen
            reader. Stating it in the label keeps the information available. */}
        <Pressable
          className="flex-1"
          accessibilityRole="button"
          accessibilityLabel={[
            todo.title,
            `${todo.priority} priority`,
            todo.categories ? `in ${todo.categories.name}` : null,
            todo.due_date
              ? `due ${formatDueDate(todo.due_date)}${
                  isOverdue(todo.due_date, todo.completed) ? ', overdue' : ''
                }`
              : null,
            'Open details.',
          ]
            .filter(Boolean)
            .join(', ')}
        >
          <View className="flex-row items-center gap-2">
            <View className={`h-2 w-2 rounded-full ${PRIORITY_DOT[todo.priority]}`} />
            <Text
              numberOfLines={2}
              className={`flex-1 text-base ${
                todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'
              }`}
            >
              {todo.title}
            </Text>
          </View>

          {todo.categories || todo.due_date ? (
            <View className="ml-4 mt-1 flex-row items-center gap-3">
              {todo.categories ? (
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-2 w-2 rounded-full"
                    // The colour is user data from the database, so it cannot
                    // be a Tailwind class name — those are resolved at build
                    // time. Arbitrary runtime colours must go through `style`.
                    style={{ backgroundColor: todo.categories.color }}
                  />
                  <Text className="text-xs text-muted-foreground">{todo.categories.name}</Text>
                </View>
              ) : null}

              {todo.due_date ? (
                <Text
                  className={`text-xs ${
                    isOverdue(todo.due_date, todo.completed)
                      ? 'font-medium text-destructive'
                      : 'text-muted-foreground'
                  }`}
                >
                  {formatDueDate(todo.due_date)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Link>

      <Pressable
        onPress={() => onDelete(todo.id)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Delete "${todo.title}"`}
      >
        <Text className="text-sm text-destructive">Delete</Text>
      </Pressable>
    </View>
  );
}

/**
 * memo matters more here than in most places: FlatList re-renders rows on
 * every parent update, and a list is the one place where wasted renders are
 * felt as dropped frames while scrolling.
 */
export const TodoItem = memo(TodoItemComponent);
