import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { Input, InputField } from '@/components/ui/input';

type FormFieldProps = ComponentProps<typeof InputField> & {
  label: string;
  /** Validation message. When set, the field renders in its invalid state. */
  error?: string;
};

export function FormField({ label, error, ...inputProps }: FormFieldProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <Input isInvalid={Boolean(error)}>
        <InputField {...inputProps} />
      </Input>
      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
    </View>
  );
}
