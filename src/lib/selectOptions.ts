export type SelectValue = string | number | (string | number)[] | null;

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export function isSelectListOptionSelected(
  option: Pick<SelectOption, 'value'>,
  multiple: boolean,
  modelValue: SelectValue
): boolean {
  if (multiple) return Array.isArray(modelValue) && modelValue.includes(option.value);
  return modelValue === option.value;
}
