import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Input, InputField } from '@/components/ui/input';
import { useCategories } from '@/features/categories/use-categories';
import type { Category } from '@/types/todo';

type CategoryPickerProps = {
  value: string | null;
  onChange: (categoryId: string | null) => void;
};

/**
 * Categories are picked and created in the same place.
 *
 * A separate "manage categories" screen would mean abandoning the todo you
 * are editing to go and create one. Inline creation keeps the user where
 * they are, which matters more on a phone than on a desktop.
 */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { categories, isLoading, addCategory } = useCategories();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;

    const result = await addCategory(trimmed);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    // Select the category we just made: creating one and then having to tap
    // it is a step nobody wants.
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
          onPress={() => setIsCreating((current) => !current)}
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
            />
          </Input>
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
        </View>
      ) : null}

      {isLoading ? (
        <Text className="text-sm text-muted-foreground">Loading categories…</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          <CategoryChip
            label="None"
            isSelected={value === null}
            onPress={() => onChange(null)}
          />
          {categories.map((category: Category) => (
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
      {color ? (
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      ) : null}
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
