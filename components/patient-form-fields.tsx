import type { FormField } from "@/app/actions/form-fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxClear,
  ComboboxTrigger,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

/** Un campo del catálogo dinámico `form_fields`, renderizado según su `field_type`. */
export function FieldInput({ field, defaultValue }: { field: FormField; defaultValue?: string }) {
  switch (field.field_type) {
    case "textarea":
      return (
        <Textarea id={field.key} name={field.key} required={field.required} defaultValue={defaultValue} />
      );
    case "number":
      return (
        <Input
          id={field.key}
          name={field.key}
          type="number"
          required={field.required}
          defaultValue={defaultValue}
        />
      );
    case "date":
      return <DatePickerField id={field.key} name={field.key} required={field.required} defaultValue={defaultValue} />;
    case "select": {
      const activeOptions = field.options.filter((option) => option.active);
      return (
        <Combobox
          items={activeOptions.map((o) => o.value)}
          name={field.key}
          required={field.required}
          defaultValue={defaultValue ?? null}
        >
          <ComboboxInputGroup>
            <ComboboxInput id={field.key} placeholder="Selecciona una opción" />
            <ComboboxClear />
            <ComboboxTrigger />
          </ComboboxInputGroup>
          <ComboboxPopup>
            <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
            <ComboboxList>
              {(value: string) => (
                <ComboboxItem key={value} value={value}>
                  {value}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </Combobox>
      );
    }
    default:
      return (
        <Input
          id={field.key}
          name={field.key}
          type="text"
          required={field.required}
          defaultValue={defaultValue}
        />
      );
  }
}

export function FieldGroup({
  field,
  defaultValue,
  twoColumn,
}: {
  field: FormField;
  defaultValue?: string;
  twoColumn?: boolean;
}) {
  return (
    <Field
      label={field.label}
      htmlFor={field.key}
      required={field.required}
      className={twoColumn && field.field_type === "textarea" ? "col-span-2" : undefined}
    >
      <FieldInput field={field} defaultValue={defaultValue} />
    </Field>
  );
}
