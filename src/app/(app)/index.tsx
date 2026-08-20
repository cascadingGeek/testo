import { Link, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { StatTile } from '@/features/dashboard/components/stat-tile';
import { TodoItem } from '@/features/todos/components/todo-item';
import { countByFilter, selectTodos } from '@/features/todos/todo-filters';
import { useTodoViewStore, type TodoSort } from '@/features/todos/todo-view-store';
import { useTodos } from '@/features/todos/use-todos';
import { todayString } from '@/lib/dates';
import type { TodoWithCategory } from '@/features/todos/todos-api';

export default function DashboardScreen() {
  const { session } = useAuth();
  const { todos, isLoading, isRefreshing, error, refresh, toggleTodo, removeTodo } = useTodos();

  const today = todayString();
  const counts = useMemo(() => countByFilter(todos, today), [todos, today]);
  const todaysTodos = useMemo(() => selectTodos(todos, 'today', '', today), [todos, today]);

  const pending = todos.length - counts.completed;

  const [actionError, setActionError] = useState<string | null>(null);

  const setFilter = useTodoViewStore((state) => state.setFilter);

  // The reason the view store exists: this screen writes the filter, the
  // todos screen reads it. Two screens, one piece of UI state.
  const showFiltered = useCallback(
    (next: Parameters<typeof setFilter>[0]) => {
      setFilter(next);
      router.push('/todos');
    },
    [setFilter]
  );

  // These return a Result. Passing them straight to TodoItem would compile —
  // a promise is assignable where void is expected — and silently swallow
  // every failure. Wrap them so errors reach the screen.
  const handleToggle = useCallback(
    async (todo: TodoWithCategory) => {
      const result = await toggleTodo(todo);
      if (!result.ok) setActionError(result.message);
    },
    [toggleTodo]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await removeTodo(id);
      if (!result.ok) setActionError(result.message);
    },
    [removeTodo]
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 p-4 pb-10 pt-16"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
    >
      <View className="gap-1">
        <Text className="text-base text-muted-foreground">Signed in as</Text>
        <Text className="text-lg font-medium text-foreground">{session?.user.email}</Text>
      </View>

      {error || actionError ? (
        <View className="rounded-md bg-destructive/10 p-3">
          <Text className="text-sm text-destructive">{error ?? actionError}</Text>
        </View>
      ) : null}

      {/* The one number the screen leads with. Exactly one hero figure per
          view, or nothing stands out and the hierarchy collapses. */}
      <View className="gap-1">
        <Text className="text-5xl font-semibold text-foreground">{counts.today}</Text>
        <Text className="text-base text-muted-foreground">
          {counts.today === 1 ? 'todo due today' : 'todos due today'}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <StatTile
          label="Overdue"
          value={counts.overdue}
          tone="critical"
          onPress={() => showFiltered('overdue')}
        />
        <StatTile label="Pending" value={pending} onPress={() => showFiltered('all')} />
        <StatTile
          label="Completed"
          value={counts.completed}
          onPress={() => showFiltered('completed')}
        />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-foreground">Today</Text>
          <Link href="/todos" className="text-sm text-primary">
            See all
          </Link>
        </View>

        {todaysTodos.length === 0 ? (
          <View className="items-center gap-3 rounded-lg bg-card py-10">
            <Text className="text-base font-medium text-foreground">
              {todos.length === 0 ? 'No todos yet' : 'Nothing due today'}
            </Text>
            <Text className="px-6 text-center text-sm text-muted-foreground">
              {todos.length === 0
                ? 'Add your first todo to get started.'
                : counts.overdue > 0
                  ? 'You have overdue todos waiting, though.'
                  : 'Enjoy the clear day.'}
            </Text>
            <Link href="/todos" asChild>
              <Button variant="outline">
                <ButtonText>{todos.length === 0 ? 'Add a todo' : 'View all todos'}</ButtonText>
              </Button>
            </Link>
          </View>
        ) : (
          <View className="gap-2">
            {todaysTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
