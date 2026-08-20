import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import type { TodoWithCategory } from '@/api/todos';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FilterBar } from '@/features/todos/components/filter-bar';
import { TodoItem } from '@/features/todos/components/todo-item';
import { useTodos } from '@/hooks/use-todos';
import { SORT_LABELS, TODO_SORTS, useTodoViewStore } from '@/store/todo-view-store';
import { todayString } from '@/utils/dates';
import { countByFilter, selectTodos, sortTodos } from '@/utils/todo-filters';

export default function TodosScreen() {
  const { todos, isLoading, isRefreshing, error, refresh, addTodo, toggleTodo, removeTodo } =
    useTodos();

  // Selected field by field: subscribing to the whole store re-renders on
  // every unrelated change.
  const filter = useTodoViewStore((state) => state.filter);
  const query = useTodoViewStore((state) => state.query);
  const sort = useTodoViewStore((state) => state.sort);
  const setFilter = useTodoViewStore((state) => state.setFilter);
  const setQuery = useTodoViewStore((state) => state.setQuery);
  const setSort = useTodoViewStore((state) => state.setSort);

  const [title, setTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const today = todayString();
  const visibleTodos = useMemo(
    () => sortTodos(selectTodos(todos, filter, query, today), sort),
    [todos, filter, query, sort, today]
  );
  const counts = useMemo(() => countByFilter(todos, today), [todos, today]);

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setIsAdding(true);
    const result = await addTodo(trimmed);
    setIsAdding(false);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    setActionError(null);
    setTitle('');
  }

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

  // A failed action must not blank out todos that are already on screen.
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
        className="self-start px-4 pt-3"
      >
        <Text className="text-sm text-primary">Sort: {SORT_LABELS[sort]}</Text>
      </Pressable>

      <FlatList
        data={visibleTodos}
        keyExtractor={(todo) => todo.id}
        renderItem={({ item }) => (
          <TodoItem todo={item} onToggle={handleToggle} onDelete={handleDelete} />
        )}
        contentContainerClassName="gap-2 p-4 pb-8"
        ListEmptyComponent={
          <View className="items-center gap-2 py-16">
            <Text className="text-lg font-medium text-foreground">
              {todos.length === 0 ? 'Nothing here yet' : 'No matches'}
            </Text>
            <Text className="text-center text-muted-foreground">
              {todos.length === 0
                ? 'Add your first todo above and it will show up here.'
                : 'Try a different filter or search term.'}
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
      />
    </View>
  );
}
