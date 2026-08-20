import { Pressable, Text, View } from 'react-native';

type StatTileProps = {
  label: string;
  value: number;
  tone?: 'neutral' | 'critical';
  onPress?: () => void;
};

export function StatTile({ label, value, tone = 'neutral', onPress }: StatTileProps) {
  const isCritical = tone === 'critical' && value > 0;
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${value} ${label}. Show these todos.` : undefined}
      className="flex-1 gap-1 rounded-lg bg-card p-3"
    >
      <Text
        className={`text-2xl font-semibold ${isCritical ? 'text-destructive' : 'text-foreground'}`}
      >
        {value}
      </Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </Container>
  );
}
