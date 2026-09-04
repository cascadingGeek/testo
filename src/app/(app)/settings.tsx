import { LogOut, Tag, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { signOut } from '@/api/auth';
import { EmptyState } from '@/components/empty-state';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { themeColors } from '@/core/theme-colors';
import { NotificationSettings } from '@/features/notifications/components/notification-settings';
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

      <NotificationSettings />

      <View className="gap-3">
        <Text className="text-lg font-semibold text-foreground">Categories</Text>

        {isLoading ? (
          <ActivityIndicator />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<Tag size={28} color={themeColors.mutedForeground} />}
            title="No categories yet"
            message="Create one while editing a todo."
          />
        ) : (
          categories.map((category) => (
            <View
              key={category.id}
              className="flex-row items-center gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
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
                <Trash2 size={18} color={themeColors.destructive} />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <Button variant="destructive" onPress={handleSignOut} isDisabled={isSigningOut}>
        {isSigningOut ? <ButtonSpinner /> : <LogOut size={18} color="#FFFFFF" />}
        <ButtonText>{isSigningOut ? 'Signing out…' : 'Sign out'}</ButtonText>
      </Button>
    </ScrollView>
  );
}
