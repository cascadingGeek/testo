import { Link, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';

import type { TodoWithCategory } from '@/api/todos';
import { Button, ButtonText } from '@/components/ui/button';
import { StatTile } from '@/features/dashboard/components/stat-tile';
import { TodoItem } from '@/features/todos/components/todo-item';
import { useTodos } from '@/hooks/use-todos';
import { useAuthStore } from '@/store/auth-store';
import { useTodoViewStore } from '@/store/todo-view-store';
import { todayString } from '@/utils/dates';
import { countByFilter, selectTodos, type TodoFilter } from '@/utils/todo-filters';

export default function DashboardScreen() {
  const email = useAuthStore((state) => state.session?.user.email);
  const setFilter = useTodoViewStore((state) => state.setFilter);
  const { todos, isLoading, isRefreshing, error, refresh, toggleTodo, removeTodo } = useTodos();

  const [actionError, setActionError] = useState<string | null>(null);

  const today = todayString();
  const counts = useMemo(() => countByFilter(todos, today), [todos, today]);
  const todaysTodos = useMemo(() => selectTodos(todos, 'today', '', today), [todos, today]);
  const pending = todos.length - counts.completed;

  const showFiltered = useCallback(
    (next: TodoFilter) => {
      setFilter(next);
      router.push('/todos');
    },
    [setFilter]
  );

  // These return a Result; passing them raw would compile and swallow errors.
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
        <Text className="text-lg font-medium text-foreground">{email}</Text>
      </View>

      {error || actionError ? (
        <View className="rounded-md bg-destructive/10 p-3">
          <Text className="text-sm text-destructive">{error ?? actionError}</Text>
        </View>
      ) : null}

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
          // A short, bounded list inside a ScrollView: a nested FlatList here
          // would lose virtualisation anyway.
          <View className="gap-2">
            {todaysTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
