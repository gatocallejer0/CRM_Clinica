import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { buildCsv } from "@/lib/csv";

type FieldRow = {
  key: string;
  field_type: string;
  options: { value: string; active: boolean }[];
};

export async function GET() {
  await requireRole(["Admin"]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("form_fields")
    .select("key, field_type, sort_order, options:form_field_options(value, active, sort_order)")
    .eq("active", true)
    .order("sort_order")
    .order("sort_order", { referencedTable: "form_field_options" });

  if (error) {
    return new Response("No se pudo generar la plantilla.", { status: 500 });
  }

  const fields = (data ?? []) as FieldRow[];
  const header = ["email", ...fields.map((f) => f.key)];

  // Fila de ejemplo con formatos válidos (fecha AAAA-MM-DD, una opción real
  // de cada "select", etc.) — se debe borrar antes de subir el archivo.
  const example = [
    "ejemplo@correo.com (borra esta fila)",
    ...fields.map((f) => {
      if (f.field_type === "date") return "1990-08-16";
      if (f.field_type === "number") return "28";
      if (f.field_type === "select") return f.options.find((o) => o.active)?.value ?? "";
      return "";
    }),
  ];

  const csv = buildCsv([header, example]);
  const bom = "﻿";

  return new Response(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-pacientes.csv"',
    },
  });
}
