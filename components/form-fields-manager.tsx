"use client";

import { useState, useTransition, type FormEvent } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Texto corto",
  textarea: "Texto largo",
  number: "Número",
  date: "Fecha",
  select: "Selección (lista)",
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
      <div className="flex items-center gap-2 text-sm">
        <span className={option.active ? "" : "text-muted-foreground line-through"}>
          {option.value}
        </span>
        <Button type="button" variant="ghost" size="xs" disabled={pending} onClick={toggleActive}>
          {option.active ? "Inactivar" : "Activar"}
        </Button>
        {confirming ? (
          <>
            <Button type="button" variant="destructive" size="xs" disabled={pending} onClick={handleDelete}>
              Confirmar
            </Button>
            <Button type="button" variant="ghost" size="xs" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button type="button" variant="ghost" size="xs" onClick={() => setConfirming(true)}>
            Eliminar
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
    <div className="mt-1 flex flex-col gap-2 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">Opciones</p>
      <div className="flex flex-col gap-1">
        {field.options.map((option) => (
          <OptionRow
            key={option.id}
            option={option}
            onChange={(updated) => handleOptionChange(option.id, updated)}
          />
        ))}
        {field.options.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin opciones todavía.</p>
        )}
      </div>
      <div className="flex gap-2">
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
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
          {!field.active && <Badge variant="outline">Inactiva</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={toggleActive}>
            {field.active ? "Inactivar" : "Activar"}
          </Button>
          {confirming ? (
            <>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={handleDelete}
              >
                Confirmar eliminar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              Eliminar
            </Button>
          )}
        </div>
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
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 border-t pt-4">
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
        <Select
          value={fieldType}
          onValueChange={(value) => setFieldType(value as FormFieldType)}
          items={FIELD_TYPE_LABELS}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(FIELD_TYPE_LABELS) as [FormFieldType, string][]).map(
              ([value, typeLabel]) => (
                <SelectItem key={value} value={value}>
                  {typeLabel}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-2 pb-1.5 text-sm">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />
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
      <CardContent className="flex flex-col gap-3">
        {items.map((field) => (
          <FieldRow
            key={field.id}
            field={field}
            onChange={(updated) => {
              setItems((prev) =>
                updated
                  ? prev.map((f) => (f.id === field.id ? updated : f))
                  : prev.filter((f) => f.id !== field.id),
              );
            }}
          />
        ))}
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
