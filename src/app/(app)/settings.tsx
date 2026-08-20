import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { signOut } from '@/api/auth';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { useCategories } from '@/hooks/use-categories';
import { useAuthStore } from '@/store/auth-store';

export default function SettingsScreen() {
  const email = useAuthStore((state) => state.session?.user.email);
  const { categories, isLoading, removeCategory } = useCategories();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);
    const result = await signOut();

    if (!result.ok) {
      setIsSigningOut(false);
      setError(result.message);
    }
    // On success the gate redirects and this screen unmounts.
  }

  function handleDeleteCategory(id: string, name: string) {
    Alert.alert(
      `Delete "${name}"?`,
      'Todos in this category will be kept and become uncategorised.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await removeCategory(id);
            if (!result.ok) setError(result.message);
          },
        },
      ]
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-8 p-6 pt-16">
      <View className="gap-1">
        <Text className="text-3xl font-bold text-foreground">Settings</Text>
        <Text className="text-base text-muted-foreground">{email}</Text>
      </View>

      {error ? (
        <View className="rounded-md bg-destructive/10 p-3">
          <Text className="text-sm text-destructive">{error}</Text>
        </View>
      ) : null}

      <View className="gap-3">
        <Text className="text-lg font-semibold text-foreground">Categories</Text>

        {isLoading ? (
          <ActivityIndicator />
        ) : categories.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            No categories yet. Create one while editing a todo.
          </Text>
        ) : (
          categories.map((category) => (
            <View key={category.id} className="flex-row items-center gap-3 rounded-lg bg-card p-4">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <Text className="flex-1 text-base text-foreground">{category.name}</Text>
              <Pressable
                onPress={() => handleDeleteCategory(category.id, category.name)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`Delete category ${category.name}`}
              >
                <Text className="text-sm text-destructive">Delete</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Button variant="destructive" onPress={handleSignOut} isDisabled={isSigningOut}>
        {isSigningOut ? <ButtonSpinner /> : null}
        <ButtonText>{isSigningOut ? 'Signing out…' : 'Sign out'}</ButtonText>
      </Button>
    </ScrollView>
  );
}
