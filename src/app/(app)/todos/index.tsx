import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { FilterBar } from '@/features/todos/components/filter-bar';
import { TodoItem } from '@/features/todos/components/todo-item';
import { countByFilter, selectTodos, sortTodos } from '@/features/todos/todo-filters';
import { SORT_LABELS, TODO_SORTS, useTodoViewStore } from '@/features/todos/todo-view-store';
import type { TodoWithCategory } from '@/features/todos/todos-api';
import { useTodos } from '@/features/todos/use-todos';
import { todayString } from '@/lib/dates';

export default function TodosScreen() {
  const { todos, isLoading, isRefreshing, error, refresh, addTodo, toggleTodo, removeTodo } =
    useTodos();

  // Selected field-by-field rather than as one object: a component that
  // subscribes to the whole store re-renders when any part of it changes.
  const filter = useTodoViewStore((state) => state.filter);
  const query = useTodoViewStore((state) => state.query);
  const sort = useTodoViewStore((state) => state.sort);
  const setFilter = useTodoViewStore((state) => state.setFilter);
  const setQuery = useTodoViewStore((state) => state.setQuery);
  const setSort = useTodoViewStore((state) => state.setSort);
  const [title, setTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  // Computed once per render pass rather than per todo, so every row in this
  // pass is measured against the same day boundary.
  const today = todayString();

  // useMemo because this runs on every keystroke in the search box. With a
  // handful of todos it is cheap either way; the point is that the work is
  // tied to the data changing, not to unrelated re-renders.
  const visibleTodos = useMemo(
    () => sortTodos(selectTodos(todos, filter, query, today), sort),
    [todos, filter, query, sort, today]
  );

  const counts = useMemo(() => countByFilter(todos, today), [todos, today]);

  // Stable identities so memoised rows are not invalidated on every render.
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

  // A failed first load has nothing to show, so the error takes the screen.
  // Once todos are on screen, a failed action must not blank them out.
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
            // A search box that cannot be emptied in one tap is a nuisance;
            // this is the iOS-native clear affordance.
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
        // Tells FlatList which rows are which, so it can recycle views
        // correctly instead of rebuilding the list on every change.
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
        // Pull-to-refresh is the expected way to reload a list on mobile.
        // There is no equivalent gesture on the web, so this is native-first.
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
      />
    </View>
  );
}
