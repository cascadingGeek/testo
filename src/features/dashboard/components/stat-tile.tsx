import { Pressable, Text, View } from 'react-native';

type StatTileProps = {
  label: string;
  value: number;
  /** Marks a tile as a status rather than a plain count (e.g. overdue). */
  tone?: 'neutral' | 'critical';
  onPress?: () => void;
};

/**
 * A count is a single current value, so it gets a stat tile — not a one-bar
 * chart. Four counts get a row of them.
 *
 * The label always states what the number means, so the colour on a critical
 * tile reinforces the status rather than being the only thing carrying it.
 */
export function StatTile({ label, value, tone = 'neutral', onPress }: StatTileProps) {
  const isCritical = tone === 'critical' && value > 0;

  // Pressable and View take the same props here, so the tile is a button
  // only when it has somewhere to go — no dead taps on a static tile.
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${value} ${label}. Show these todos.` : undefined}
      className="flex-1 gap-1 rounded-lg bg-card p-3"
    >
      <Text
        className={`text-2xl font-semibold ${
          isCritical ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {value}
      </Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </Container>
  );
}
