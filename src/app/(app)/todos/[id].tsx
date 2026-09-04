import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { CheckCircle2, Circle, Save, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ControlledFormField } from '@/components/controlled-form-field';
import { FullScreenLoader } from '@/components/full-screen-loader';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { themeColors } from '@/core/theme-colors';
import { CategoryPicker } from '@/features/todos/components/category-picker';
import { DueDatePicker } from '@/features/todos/components/due-date-picker';
import { PrioritySelector } from '@/features/todos/components/priority-selector';
import { useTodo } from '@/hooks/use-todo';
import { useTodoMutations } from '@/hooks/use-todo-mutations';
import { todoEditSchema, type TodoEditInput } from '@/schemas/todo';

/** Opened from a deep link there is no history to pop, so back does nothing. */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/todos');
}

export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todo, isLoading, error, reload } = useTodo(id);
  const { saveTodo, toggleTodo, removeTodo } = useTodoMutations();

  const [actionError, setActionError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState } = useForm<TodoEditInput>({
    resolver: standardSchemaResolver(todoEditSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      due_date: null,
      due_time: null,
      category_id: null,
    },
  });

  // The version the form currently holds. Sent back as a precondition so a
  // save cannot overwrite a row that changed after this seed.
  const baseUpdatedAt = useRef<string | null>(null);

  /**
   * Re-seeds whenever the server row changes, not just when the id does —
   * keying on id alone left the form holding a stale copy after a background
   * refetch, which the save then wrote back over the newer data. Skipped while
   * the form is dirty so a refetch never discards what the user is typing;
   * that case is caught at save time by the precondition instead.
   */
  useEffect(() => {
    if (!todo || formState.isDirty) return;
    // Already holding this version — a re-render is not a reason to re-seed.
    if (baseUpdatedAt.current === todo.updated_at) return;

    baseUpdatedAt.current = todo.updated_at;
    reset({
      title: todo.title,
      description: todo.description ?? '',
      priority: todo.priority,
      due_date: todo.due_date,
      due_time: todo.due_time,
      category_id: todo.category_id,
    });
  }, [todo, formState.isDirty, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (baseUpdatedAt.current === null) return;

    const result = await saveTodo(id, values, baseUpdatedAt.current);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    setActionError(null);
    isLeaving.current = true;
    goBack();
  });

  function handleDelete() {
    Alert.alert('Delete todo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!todo) return;

          const result = await removeTodo(todo);
          if (!result.ok) {
            setActionError(result.message);
            return;
          }
          isLeaving.current = true;
          goBack();
        },
      },
    ]);
  }

  /*
   * A swipe-back, the hardware back button or a tab tap would otherwise
   * discard everything typed with no prompt. isDirty is already tracked by
   * React Hook Form; this just asks before throwing it away.
   */
  const navigation = useNavigation();
  const isDirty = formState.isDirty;

  // Set once the screen is leaving on purpose — a saved form is still "dirty"
  // as far as React Hook Form is concerned, and a deleted row has nothing left
  // to protect.
  const isLeaving = useRef(false);

  useEffect(() => {
    if (!isDirty) return;

    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (isLeaving.current) return;
      event.preventDefault();

      Alert.alert('Discard changes?', 'Your edits to this todo will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ]);
    });

    return unsubscribe;
  }, [navigation, isDirty]);

  async function handleToggle() {
    if (!todo) return;

    const result = await toggleTodo(todo);
    if (!result.ok) setActionError(result.message);
  }

  if (isLoading) return <FullScreenLoader onRetry={reload} />;

  /*
   * Only when there is nothing to show. Seeding from the list cache exists so
   * this screen can open without a spinner; falling back to a full-screen
   * error on a failed background refetch would throw that away and make a todo
   * you were just looking at unreachable offline. A refetch failure shows as a
   * banner over the form instead.
   */
  if (!todo) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-base text-muted-foreground">
          {error ?? 'That todo could not be found.'}
        </Text>
        <Button variant="outline" onPress={reload}>
          <ButtonText>Try again</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <ControlledFormField
          control={control}
          name="title"
          label="Title"
          placeholder="What needs doing?"
          maxLength={200}
        />

        <ControlledFormField
          control={control}
          name="description"
          label="Description"
          placeholder="Any extra detail"
          multiline
          numberOfLines={4}
          maxLength={2000}
        />

        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <PrioritySelector value={field.value} onChange={field.onChange} />
          )}
        />

        {/* Two fields, one control: the reminder time only makes sense
            alongside the date it hangs off. */}
        <Controller
          control={control}
          name="due_date"
          render={({ field: dateField }) => (
            <Controller
              control={control}
              name="due_time"
              render={({ field: timeField }) => (
                <DueDatePicker
                  value={dateField.value}
                  time={timeField.value}
                  onChange={dateField.onChange}
                  onTimeChange={timeField.onChange}
                />
              )}
            />
          )}
        />

        <Controller
          control={control}
          name="category_id"
          render={({ field }) => <CategoryPicker value={field.value} onChange={field.onChange} />}
        />

        {/* A refetch that failed over data we still hold: worth saying, not
            worth hiding the form for. */}
        {actionError ?? error ? (
          <View className="rounded-md bg-destructive/10 p-3">
            <Text className="text-sm text-destructive">{actionError ?? error}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <Button onPress={onSubmit} isDisabled={formState.isSubmitting}>
            {formState.isSubmitting ? (
              <ButtonSpinner />
            ) : (
              <Save size={18} color={themeColors.primaryForeground} />
            )}
            <ButtonText>{formState.isSubmitting ? 'Saving…' : 'Save changes'}</ButtonText>
          </Button>

          <Button variant="outline" onPress={handleToggle}>
            {todo.completed ? (
              <Circle size={18} color={themeColors.foreground} />
            ) : (
              <CheckCircle2 size={18} color={themeColors.foreground} />
            )}
            <ButtonText>{todo.completed ? 'Mark as not done' : 'Mark as done'}</ButtonText>
          </Button>

          <Button variant="destructive" onPress={handleDelete}>
            <Trash2 size={18} color="#FFFFFF" />
            <ButtonText>Delete todo</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
