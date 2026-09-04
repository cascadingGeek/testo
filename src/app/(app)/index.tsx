import { Link, router } from 'expo-router';
import { CalendarCheck2, ListTodo } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { TodoWithCategory } from '@/api/todos';
import { EmptyState } from '@/components/empty-state';
import { FullScreenLoader } from '@/components/full-screen-loader';
import { Button, ButtonText } from '@/components/ui/button';
import { themeColors } from '@/core/theme-colors';
import { StatTile } from '@/features/dashboard/components/stat-tile';
import { TodoItem } from '@/features/todos/components/todo-item';
import { useTodoCounts } from '@/hooks/use-todo-counts';
import { useTodoMutations } from '@/hooks/use-todo-mutations';
import { useToday } from '@/hooks/use-today';
import { useTodos } from '@/hooks/use-todos';
import { useAuthStore } from '@/store/auth-store';
import { useTodoViewStore } from '@/store/todo-view-store';
import type { TodoFilter } from '@/utils/todo-filters';

export default function DashboardScreen() {
  const email = useAuthStore((state) => state.session?.user.email);
  const setFilter = useTodoViewStore((state) => state.setFilter);

  const today = useToday();
  const params = useMemo(
    () => ({ filter: 'today' as const, search: '', sort: 'smart' as const, today }),
    [today]
  );

  // Only today's page is fetched here; the tiles come from count queries that
  // return no rows at all.
  const { todos, isLoading, isRefreshing, error, refresh } = useTodos(params);
  const { counts } = useTodoCounts({ search: '', today });
  const { toggleTodo, removeTodo } = useTodoMutations();

  const [actionError, setActionError] = useState<string | null>(null);

  const showFiltered = useCallback(
    (next: TodoFilter) => {
      setFilter(next);
      router.push('/todos');
    },
    [setFilter]
  );

  const handleToggle = useCallback(
    async (todo: TodoWithCategory) => {
      const result = await toggleTodo(todo);
      setActionError(result.ok ? null : result.message);
    },
    [toggleTodo]
  );

  const handleDelete = useCallback(
    async (todo: TodoWithCategory) => {
      const result = await removeTodo(todo);
      setActionError(result.ok ? null : result.message);
    },
    [removeTodo]
  );

  // Offers a way out rather than spinning forever if the request hangs.
  if (isLoading) return <FullScreenLoader onRetry={refresh} />;

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

      {/* The action error wins: it is the newer of the two, and a stale list
          error would otherwise mask every failure underneath it. */}
      {actionError ?? error ? (
        <View className="rounded-md bg-destructive/10 p-3">
          <Text className="text-sm text-destructive">{actionError ?? error}</Text>
        </View>
      ) : null}

      {/* Staggered entrances: the hero figure lands first, the tiles follow,
          so the eye is led to the number that matters. */}
      <Animated.View entering={FadeInDown.duration(300)} className="gap-1">
        <Text className="text-5xl font-semibold text-foreground">{counts.today}</Text>
        <Text className="text-base text-muted-foreground">
          {counts.today === 1 ? 'todo due today' : 'todos due today'}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(300)} className="flex-row gap-3">
        <StatTile
          label="Overdue"
          value={counts.overdue}
          tone="critical"
          onPress={() => showFiltered('overdue')}
        />
        {/* The number and the destination are now the same query — the tile
            used to read "Pending" and navigate to a list including done ones. */}
        <StatTile
          label="Pending"
          value={counts.pending}
          onPress={() => showFiltered('pending')}
        />
        <StatTile
          label="Completed"
          value={counts.completed}
          onPress={() => showFiltered('completed')}
        />
      </Animated.View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-foreground">Today</Text>
          <Link href="/todos" className="text-sm text-primary">
            See all
          </Link>
        </View>

        {todos.length === 0 ? (
          <View className="rounded-xl border border-border/60 bg-card">
            <EmptyState
              icon={
                counts.all === 0 ? (
                  <ListTodo size={32} color={themeColors.mutedForeground} />
                ) : (
                  <CalendarCheck2 size={32} color={themeColors.primary} />
                )
              }
              title={counts.all === 0 ? 'No todos yet' : 'Nothing due today'}
              message={
                counts.all === 0
                  ? 'Add your first todo to get started.'
                  : counts.overdue > 0
                    ? 'You have overdue todos waiting, though.'
                    : 'Enjoy the clear day.'
              }
              action={
                <Link href="/todos" asChild>
                  <Button variant="outline">
                    <ButtonText>{counts.all === 0 ? 'Add a todo' : 'View all todos'}</ButtonText>
                  </Button>
                </Link>
              }
            />
          </View>
        ) : (
          <View className="gap-2">
            {todos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
