"use client";

import { useState, useTransition, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Trash2Icon } from "lucide-react";
import {
  createFormField,
  updateFormField,
  deleteFormField,
  createFormFieldOption,
  updateFormFieldOption,
  deleteFormFieldOption,
  type FormField,
  type FormFieldOption,
  type FormFieldSection,
  type FormFieldType,
} from "@/app/actions/form-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Texto corto",
  textarea: "Texto largo",
  number: "Número",
  date: "Fecha",
  select: "Selección (lista)",
};

// Entrada/salida de filas en listas que cambian ocasionalmente (agregar o
// eliminar una pregunta/opción), no en cada render — evita que el elemento
// aparezca o desaparezca de golpe. transform+opacity únicamente, curva y
// duración de la skill "animate" (ease-out fuerte, 200ms).
const ROW_MOTION = {
  layout: true as const,
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const },
};

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[áàäâã]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöôõ]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n")
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function OptionRow({
  option,
  onChange,
}: {
  option: FormFieldOption;
  onChange: (updated: FormFieldOption | null) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function toggleActive() {
    startTransition(async () => {
      const result = await updateFormFieldOption(option.id, {
        active: !option.active,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onChange({ ...option, active: !option.active });
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFormFieldOption(option.id);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      onChange(null);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="-mx-2 grid max-w-md grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-muted">
        <span className={option.active ? "" : "text-muted-foreground line-through"}>
          {option.value}
        </span>
        <Switch
          checked={option.active}
          onCheckedChange={toggleActive}
          disabled={pending}
          aria-label={option.active ? "Inactivar opción" : "Activar opción"}
        />
        {confirming ? (
          <div className="flex gap-2">
            <Button type="button" variant="destructive" size="xs" disabled={pending} onClick={handleDelete}>
              Confirmar
            </Button>
            <Button type="button" variant="ghost" size="xs" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setConfirming(true)}
            aria-label="Eliminar opción"
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function OptionsEditor({
  field,
  onFieldChange,
}: {
  field: FormField;
  onFieldChange: (updated: FormField) => void;
}) {
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleOptionChange(optionId: string, updated: FormFieldOption | null) {
    onFieldChange({
      ...field,
      options: updated
        ? field.options.map((o) => (o.id === optionId ? updated : o))
        : field.options.filter((o) => o.id !== optionId),
    });
  }

  function handleAdd() {
    const value = newValue.trim();
    if (!value) return;

    startTransition(async () => {
      const result = await createFormFieldOption({ fieldId: field.id, value });
      if (result.error || !result.option) {
        setError(result.error ?? "No se pudo agregar la opción.");
        return;
      }
      setError(undefined);
      setNewValue("");
      onFieldChange({ ...field, options: [...field.options, result.option] });
    });
  }

  return (
    <div className="mt-1 flex flex-col gap-1 border-t border-border pt-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">Opciones</p>
      <AnimatePresence initial={false}>
        {field.options.map((option) => (
          <motion.div key={option.id} {...ROW_MOTION}>
            <OptionRow option={option} onChange={(updated) => handleOptionChange(option.id, updated)} />
          </motion.div>
        ))}
      </AnimatePresence>
      {field.options.length === 0 && (
        <p className="text-xs text-muted-foreground">Sin opciones todavía.</p>
      )}
      <div className="mt-1 flex gap-2">
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Nueva opción"
          className="max-w-48"
        />
        <Button type="button" size="sm" disabled={pending} onClick={handleAdd}>
          Agregar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function FieldRow({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (updated: FormField | null) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function toggleActive() {
    startTransition(async () => {
      const result = await updateFormField(field.id, { active: !field.active });
      if (result.error) {
        setError(result.error);
        return;
      }
      onChange({ ...field, active: !field.active });
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFormField(field.id);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      onChange(null);
    });
  }

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="-mx-2 grid max-w-xl grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              field.active ? "font-medium" : "font-medium text-muted-foreground line-through"
            }
          >
            {field.label}
          </span>
          <Badge variant="secondary">{FIELD_TYPE_LABELS[field.field_type]}</Badge>
          {field.required && <Badge variant="outline">Obligatoria</Badge>}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Switch
            checked={field.active}
            onCheckedChange={toggleActive}
            disabled={pending}
            aria-label={field.active ? "Inactivar pregunta" : "Activar pregunta"}
          />
          Activa
        </label>
        {confirming ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={handleDelete}
            >
              Confirmar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setConfirming(true)}
            aria-label="Eliminar pregunta"
          >
            <Trash2Icon />
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {field.field_type === "select" && (
        <OptionsEditor field={field} onFieldChange={onChange} />
      )}
    </div>
  );
}

function AddFieldForm({
  section,
  onCreated,
}: {
  section: FormFieldSection;
  onCreated: (field: FormField) => void;
}) {
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<FormFieldType>("text");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createFormField({
        section,
        key: slugify(trimmed),
        label: trimmed,
        fieldType,
        required,
      });
      if (result.error || !result.field) {
        setError(result.error ?? "No se pudo crear la pregunta.");
        return;
      }
      setError(undefined);
      setLabel("");
      setFieldType("text");
      setRequired(false);
      onCreated(result.field);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 pt-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`new-label-${section}`}>Nueva pregunta</Label>
        <Input
          id={`new-label-${section}`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej. ¿Tiene seguro médico?"
          className="w-64"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Tipo</Label>
        <Combobox
          items={Object.keys(FIELD_TYPE_LABELS)}
          value={fieldType}
          onValueChange={(value) => setFieldType((value ?? "text") as FormFieldType)}
          itemToStringLabel={(v: string) => FIELD_TYPE_LABELS[v as FormFieldType] ?? v}
        >
          <ComboboxInputGroup className="w-40">
            <ComboboxInput />
            <ComboboxTrigger />
          </ComboboxInputGroup>
          <ComboboxPopup>
            <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
            <ComboboxList>
              {(v: string) => (
                <ComboboxItem key={v} value={v}>
                  {FIELD_TYPE_LABELS[v as FormFieldType]}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </Combobox>
      </div>

      <label className="flex items-center gap-2 pb-1.5 text-sm">
        <Switch checked={required} onCheckedChange={setRequired} />
        Obligatoria
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Agregando..." : "Agregar pregunta"}
      </Button>

      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </form>
  );
}

function SectionCard({
  title,
  description,
  section,
  fields,
}: {
  title: string;
  description: string;
  section: FormFieldSection;
  fields: FormField[];
}) {
  const [items, setItems] = useState(fields);

  function handleCreated(field: FormField) {
    setItems((prev) => [...prev, field]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        <AnimatePresence initial={false}>
          {items.map((field) => (
            <motion.div key={field.id} {...ROW_MOTION}>
              <FieldRow
                field={field}
                onChange={(updated) => {
                  setItems((prev) =>
                    updated
                      ? prev.map((f) => (f.id === field.id ? updated : f))
                      : prev.filter((f) => f.id !== field.id),
                  );
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <AddFieldForm section={section} onCreated={handleCreated} />
      </CardContent>
    </Card>
  );
}

export function FormFieldsManager({ initialFields }: { initialFields: FormField[] }) {
  const generalFields = initialFields.filter((f) => f.section === "general");
  const medicalFields = initialFields.filter((f) => f.section === "medical_history");

  return (
    <div className="flex flex-col gap-8">
      <SectionCard
        title="Datos generales"
        description="Preguntas de la primera sección del formulario."
        section="general"
        fields={generalFields}
      />
      <SectionCard
        title="Antecedentes médicos"
        description="Preguntas de la segunda sección del formulario."
        section="medical_history"
        fields={medicalFields}
      />
    </div>
  );
}
