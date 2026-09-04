import { Link } from 'expo-router';
import { CalendarClock, Check, Trash2 } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import type { TodoWithCategory } from '@/api/todos';
import { themeColors } from '@/core/theme-colors';
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
  onDelete: (todo: TodoWithCategory) => void;
  /**
   * False inside FlashList, which recycles view instances rather than mounting
   * and unmounting them: a recycled cell re-triggers `entering` mid-scroll, so
   * rows fade in while you scroll past them, and `layout` fights the list's own
   * cell positioning. The dashboard renders the same component in a plain
   * ScrollView, where the animations behave as intended.
   */
  animated?: boolean;
};

function TodoItemComponent({ todo, onToggle, onDelete, animated = true }: TodoItemProps) {
  const overdue = isOverdue(todo.due_date, todo.completed);

  return (
    <Animated.View
      entering={animated ? FadeIn.duration(180) : undefined}
      exiting={animated ? FadeOut.duration(120) : undefined}
      layout={animated ? LinearTransition.springify().damping(18) : undefined}
      className="flex-row items-center gap-3 rounded-xl border border-border/60 bg-card p-4"
    >
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
        {todo.completed ? <Check size={14} strokeWidth={3} color={themeColors.primaryForeground} /> : null}
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
            todo.due_date ? `due ${formatDueDate(todo.due_date)}${overdue ? ', overdue' : ''}` : null,
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
            <View className="ml-4 mt-1.5 flex-row items-center gap-3">
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
                <View className="flex-row items-center gap-1">
                  <CalendarClock
                    size={12}
                    color={overdue ? themeColors.destructive : themeColors.mutedForeground}
                  />
                  <Text
                    className={`text-xs ${
                      overdue ? 'font-medium text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {formatDueDate(todo.due_date)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Link>

      <Pressable
        onPress={() => onDelete(todo)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={`Delete "${todo.title}"`}
      >
        <Trash2 size={18} color={themeColors.destructive} />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Rows re-render on every parent update; memo keeps scrolling smooth. This
 * only works because the callbacks it receives are memoised against
 * `mutateAsync` rather than the mutation object, which is rebuilt each render.
 */
export const TodoItem = memo(TodoItemComponent);
