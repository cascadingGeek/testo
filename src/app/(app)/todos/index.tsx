import { FlashList } from '@shopify/flash-list';
import { randomUUID } from 'expo-crypto';
import { ArrowUpDown, ClipboardList, Plus, SearchX } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';

import type { TodoWithCategory } from '@/api/todos';
import { EmptyState } from '@/components/empty-state';
import { FullScreenLoader } from '@/components/full-screen-loader';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { themeColors } from '@/core/theme-colors';
import { FilterBar } from '@/features/todos/components/filter-bar';
import { TodoItem } from '@/features/todos/components/todo-item';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTodoCounts } from '@/hooks/use-todo-counts';
import { useTodoMutations } from '@/hooks/use-todo-mutations';
import { useToday } from '@/hooks/use-today';
import { useTodos } from '@/hooks/use-todos';
import { SORT_LABELS, TODO_SORTS, useTodoViewStore } from '@/store/todo-view-store';

export default function TodosScreen() {
  const filter = useTodoViewStore((state) => state.filter);
  const query = useTodoViewStore((state) => state.query);
  const sort = useTodoViewStore((state) => state.sort);
  const setFilter = useTodoViewStore((state) => state.setFilter);
  const setQuery = useTodoViewStore((state) => state.setQuery);
  const setSort = useTodoViewStore((state) => state.setSort);

  // The box updates on every keystroke; the server hears about it once.
  const search = useDebouncedValue(query);
  const today = useToday();

  const params = useMemo(
    () => ({ filter, search, sort, today }),
    [filter, search, sort, today]
  );

  const {
    todos,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refresh,
  } = useTodos(params);
  const { counts } = useTodoCounts({ search, today });
  const { addTodo, toggleTodo, removeTodo } = useTodoMutations();

  const [title, setTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /*
   * Held across retries: if the response is lost the todo may already exist,
   * and reusing the id turns the second attempt into a no-op instead of a
   * duplicate. Cleared only once a create is known to have succeeded.
   */
  const pendingId = useRef<string | null>(null);

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed || isAdding) return;

    pendingId.current ??= randomUUID();

    setIsAdding(true);
    const result = await addTodo(pendingId.current, trimmed);
    setIsAdding(false);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    pendingId.current = null;
    setActionError(null);
    setTitle('');
  }

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

  if (error && todos.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-base text-muted-foreground">{error}</Text>
        <Button onPress={refresh}>
          <ButtonText>Try again</ButtonText>
        </Button>
      </View>
    );
  }

  const hasAnyTodos = counts.all > 0;

  return (
    <View className="flex-1 bg-background">
      <View className="gap-3 p-4">
        <View className="flex-row gap-2">
          <Input className="flex-1">
            <InputField
              value={title}
              onChangeText={setTitle}
              placeholder="What needs doing?"
              onSubmitEditing={handleAdd}
              returnKeyType="done"
              maxLength={200}
            />
          </Input>
          <Button onPress={handleAdd} isDisabled={isAdding || title.trim().length === 0}>
            <Plus size={18} color={themeColors.primaryForeground} />
            <ButtonText>Add</ButtonText>
          </Button>
        </View>

        <Input>
          <InputField
            value={query}
            onChangeText={setQuery}
            placeholder="Search todos"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </Input>

        {actionError ? (
          <View className="rounded-md bg-destructive/10 p-3">
            <Text className="text-sm text-destructive">{actionError}</Text>
          </View>
        ) : null}
      </View>

      <FilterBar value={filter} counts={counts} onChange={setFilter} />

      <Pressable
        onPress={() => setSort(TODO_SORTS[(TODO_SORTS.indexOf(sort) + 1) % TODO_SORTS.length])}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Sorted by ${SORT_LABELS[sort]}`}
        accessibilityHint="Tap to change the sort order"
        className="flex-row items-center gap-1.5 self-start px-4 pt-3"
      >
        <ArrowUpDown size={14} color={themeColors.primary} />
        <Text className="text-sm text-primary">Sort: {SORT_LABELS[sort]}</Text>
      </Pressable>

      <FlashList
        data={todos}
        keyExtractor={(todo) => todo.id}
        renderItem={({ item }) => (
          <TodoItem
            todo={item}
            onToggle={handleToggle}
            onDelete={handleDelete}
            animated={false}
          />
        )}
        contentContainerClassName="gap-2 p-4 pb-8"
        // Fires before the user reaches the bottom, so the next page is
        // usually already there by the time they get to it.
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null
        }
        ListEmptyComponent={
          hasAnyTodos ? (
            <EmptyState
              icon={<SearchX size={32} color={themeColors.mutedForeground} />}
              title="No matches"
              message="Try a different filter or search term."
            />
          ) : (
            <EmptyState
              icon={<ClipboardList size={32} color={themeColors.mutedForeground} />}
              title="Nothing here yet"
              message="Add your first todo above and it will show up here."
            />
          )
        }
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
      />
    </View>
  );
}
