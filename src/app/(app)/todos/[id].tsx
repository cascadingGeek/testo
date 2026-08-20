import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { CategoryPicker } from '@/features/todos/components/category-picker';
import { DueDatePicker } from '@/features/todos/components/due-date-picker';
import { PrioritySelector } from '@/features/todos/components/priority-selector';
import { todoEditSchema } from '@/features/todos/todo-schemas';
import { useTodo } from '@/features/todos/use-todo';
import { toFieldErrors } from '@/lib/form-errors';
import type { TodoPriority } from '@/types/todo';

type Field = 'title' | 'description' | 'priority' | 'due_date' | 'category_id';

export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todo, isLoading, error, reload, save, toggleCompleted, remove } = useTodo(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Seed the form once the row arrives. `todo.id` rather than `todo` as the
  // dependency: re-seeding on every save would discard edits made while the
  // request was in flight.
  useEffect(() => {
    if (!todo) return;
    setTitle(todo.title);
    setDescription(todo.description ?? '');
    setPriority(todo.priority);
    setDueDate(todo.due_date);
    setCategoryId(todo.category_id);
  }, [todo?.id]);

  async function handleSave() {
    const parsed = todoEditSchema.safeParse({
      title,
      description,
      priority,
      due_date: dueDate,
      category_id: categoryId,
    });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors<Field>(parsed.error));
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    const result = await save(parsed.data);
    setIsSaving(false);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    setActionError(null);
    router.back();
  }

  function handleDelete() {
    // Deletion is irreversible and there is no undo, so it gets a confirm.
    // Alert.alert renders the platform's own native dialog on each OS.
    Alert.alert('Delete todo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await remove();
          if (!result.ok) {
            setActionError(result.message);
            return;
          }
          router.back();
        },
      },
    ]);
  }

  async function handleToggle() {
    const result = await toggleCompleted();
    if (!result.ok) setActionError(result.message);
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  // Covers both a deleted todo and one belonging to another user: RLS makes
  // those indistinguishable, which is exactly the intent.
  if (error || !todo) {
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
        <FormField
          label="Title"
          value={title}
          onChangeText={setTitle}
          error={fieldErrors.title}
          placeholder="What needs doing?"
          maxLength={200}
        />

        <FormField
          label="Description"
          value={description}
          onChangeText={setDescription}
          error={fieldErrors.description}
          placeholder="Any extra detail"
          multiline
          numberOfLines={4}
          maxLength={2000}
        />

        <PrioritySelector value={priority} onChange={setPriority} />

        <DueDatePicker value={dueDate} onChange={setDueDate} />

        <CategoryPicker value={categoryId} onChange={setCategoryId} />

        {actionError ? (
          <View className="rounded-md bg-destructive/10 p-3">
            <Text className="text-sm text-destructive">{actionError}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <Button onPress={handleSave} isDisabled={isSaving}>
            {isSaving ? <ButtonSpinner /> : null}
            <ButtonText>{isSaving ? 'Saving…' : 'Save changes'}</ButtonText>
          </Button>

          <Button variant="outline" onPress={handleToggle}>
            <ButtonText>
              {todo.completed ? 'Mark as not done' : 'Mark as done'}
            </ButtonText>
          </Button>

          <Button variant="destructive" onPress={handleDelete}>
            <ButtonText>Delete todo</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
