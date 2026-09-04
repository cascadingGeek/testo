import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Input, InputField } from '@/components/ui/input';
import { useCategories } from '@/hooks/use-categories';

type CategoryPickerProps = {
  value: string | null;
  onChange: (categoryId: string | null) => void;
};

/** Creation is inline so picking one never means leaving the todo you're editing. */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { categories, isLoading, addCategory } = useCategories();

  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  /**
   * The unique (user_id, name) constraint already makes a double submit safe,
   * but the second insert comes back as "you already have a category with that
   * name" — an error for a category that was in fact just created.
   */
  async function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length === 0 || isSaving) return;

    setIsSaving(true);
    const result = await addCategory(trimmed);
    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onChange(result.data.id);
    setError(null);
    setName('');
    setIsCreating(false);
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-foreground">Category</Text>
        <Pressable
          onPress={() => {
            // Otherwise a failed attempt's message stays attached to the next.
            setIsCreating((current) => !current);
            setError(null);
            setName('');
          }}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text className="text-sm text-primary">{isCreating ? 'Cancel' : '+ New'}</Text>
        </Pressable>
      </View>

      {isCreating ? (
        <View className="gap-2">
          <Input>
            <InputField
              value={name}
              onChangeText={setName}
              placeholder="Category name"
              maxLength={50}
              autoFocus
              onSubmitEditing={handleCreate}
              returnKeyType="done"
              editable={!isSaving}
            />
          </Input>
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
        </View>
      ) : null}

      {isLoading ? (
        <Text className="text-sm text-muted-foreground">Loading categories…</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          <CategoryChip label="None" isSelected={value === null} onPress={() => onChange(null)} />
          {categories.map((category) => (
            <CategoryChip
              key={category.id}
              label={category.name}
              color={category.color}
              isSelected={value === category.id}
              onPress={() => onChange(category.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

type CategoryChipProps = {
  label: string;
  color?: string;
  isSelected: boolean;
  onPress: () => void;
};

function CategoryChip({ label, color, isSelected, onPress }: CategoryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${
        isSelected ? 'border-primary bg-primary' : 'border-border bg-card'
      }`}
    >
      {color ? <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> : null}
      <Text
        className={`text-sm font-medium ${
          isSelected ? 'text-primary-foreground' : 'text-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
