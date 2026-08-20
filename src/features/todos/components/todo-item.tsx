import { Link } from 'expo-router';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { TodoWithCategory } from '@/api/todos';
import type { TodoPriority } from '@/types/todo';
import { formatDueDate, isOverdue } from '@/utils/dates';

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
        <Pressable
          className="flex-1"
          accessibilityRole="button"
          // Priority and due date are colour-coded; say them out loud too.
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
                  {/* Runtime colour, so style rather than a compiled class. */}
                  <View
                    className="h-2 w-2 rounded-full"
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

/** Rows re-render on every parent update; memo keeps scrolling smooth. */
export const TodoItem = memo(TodoItemComponent);
