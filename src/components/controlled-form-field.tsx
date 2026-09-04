import type { ComponentProps } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { FormField } from '@/components/form-field';

type ControlledFormFieldProps<TValues extends FieldValues> = Omit<
  ComponentProps<typeof FormField>,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> & {
  control: Control<TValues>;
  name: FieldPath<TValues>;
  /** Trim on blur — trimming while typing fights the user. */
  trimOnBlur?: boolean;
};

export function ControlledFormField<TValues extends FieldValues>({
  control,
  name,
  trimOnBlur = false,
  ...fieldProps
}: ControlledFormFieldProps<TValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormField
          {...fieldProps}
          value={field.value ?? ''}
          onChangeText={field.onChange}
          onBlur={() => {
            if (trimOnBlur && typeof field.value === 'string') field.onChange(field.value.trim());
            field.onBlur();
          }}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
