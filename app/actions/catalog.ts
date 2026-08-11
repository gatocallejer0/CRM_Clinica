"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit, diffSummary } from "@/lib/audit";
import type { ServiceCategory } from "./appointments";

export type CatalogFormState = { error?: string; success?: boolean } | undefined;

// ── Servicios ────────────────────────────────────────────────────────────
// listServices() (solo activos, para el selector de Agenda) ya vive en
// appointments.ts — aquí solo lo que necesita el CRUD de Catálogo.

export type ServiceRow = {
  id: string;
  name: string;
  category: ServiceCategory;
  duration_minutes: number;
  price: number | null;
  active: boolean;
};

/** Todos los servicios (activos e inactivos), para administrarlos. Admin-only. */
export async function listAllServices(): Promise<ServiceRow[]> {
  await requireRole(["Admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, category, duration_minutes, price, active")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

const ServiceSchema = z.object({
  name: z.string().min(2, { error: "El nombre es muy corto." }).trim(),
  category: z.enum(["prenatal", "general", "seguimiento"], { error: "Selecciona una categoría." }),
});

function readServiceFields(formData: FormData) {
  const validated = ServiceSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
  });
  if (!validated.success) return { error: "Revisa los datos del formulario." } as const;

  const duration = Number(formData.get("durationMinutes"));
  if (!Number.isFinite(duration) || duration <= 0) {
    return { error: "La duración debe ser mayor a 0." } as const;
  }

  const priceRaw = formData.get("price");
  const price = typeof priceRaw === "string" && priceRaw.trim() ? Number(priceRaw) : null;
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    return { error: "El precio no es válido." } as const;
  }

  return {
    name: validated.data.name,
    category: validated.data.category,
    duration_minutes: duration,
    price,
  };
}

export async function createService(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const profile = await requireRole(["Admin"]);

  const fields = readServiceFields(formData);
  if ("error" in fields) return { error: fields.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({ ...fields, active: true })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "No se pudo crear el servicio." };

  await logAudit({
    tableName: "services",
    recordId: data.id,
    action: "create",
    summary: `Creó el servicio "${fields.name}".`,
    performedBy: profile,
  });

  revalidatePath("/catalogo");
  revalidatePath("/agenda");
  return { success: true };
}

export async function updateService(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const profile = await requireRole(["Admin"]);

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Servicio inválido." };

  const fields = readServiceFields(formData);
  if ("error" in fields) return { error: fields.error };

  const active = formData.get("active") === "true";
  const after = {
    name: fields.name,
    category: fields.category,
    duration_minutes: fields.duration_minutes,
    price: fields.price,
    active,
  };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("services")
    .select("name, category, duration_minutes, price, active")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("services").update(after).eq("id", id);
  if (error) return { error: error.message };

  if (before) {
    const summary = diffSummary(before, after, {
      name: "Nombre",
      category: "Categoría",
      duration_minutes: "Duración",
      price: "Precio",
      active: "Activo",
    });
    if (summary) {
      await logAudit({ tableName: "services", recordId: id, action: "update", summary, performedBy: profile });
    }
  }

  revalidatePath("/catalogo");
  revalidatePath("/agenda");
  return { success: true };
}

// ── Productos ────────────────────────────────────────────────────────────

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  stock: number;
  price: number | null;
  image_url: string | null;
  active: boolean;
};

/** Todos los productos (activos e inactivos), para administrarlos. Admin-only. */
export async function listProducts(): Promise<ProductRow[]> {
  await requireRole(["Admin"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, unit, stock, price, image_url, active")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

const ProductSchema = z.object({
  name: z.string().min(2, { error: "El nombre es muy corto." }).trim(),
  unit: z.string().min(1, { error: "Indica la unidad de medida." }).trim(),
});

function readProductFields(formData: FormData) {
  const validated = ProductSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
  });
  if (!validated.success) return { error: "Revisa los datos del formulario." } as const;

  const stock = Number(formData.get("stock"));
  if (!Number.isFinite(stock) || stock < 0) {
    return { error: "El stock debe ser un número igual o mayor a 0." } as const;
  }

  const priceRaw = formData.get("price");
  const price = typeof priceRaw === "string" && priceRaw.trim() ? Number(priceRaw) : null;
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    return { error: "El precio no es válido." } as const;
  }

  const descriptionRaw = formData.get("description");
  const description = typeof descriptionRaw === "string" && descriptionRaw.trim() ? descriptionRaw.trim() : null;

  const imageUrlRaw = formData.get("imageUrl");
  const image_url = typeof imageUrlRaw === "string" && imageUrlRaw.trim() ? imageUrlRaw.trim() : null;

  return {
    name: validated.data.name,
    unit: validated.data.unit,
    stock,
    price,
    description,
    image_url,
  };
}

export async function createProduct(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const profile = await requireRole(["Admin"]);

  const fields = readProductFields(formData);
  if ("error" in fields) return { error: fields.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...fields, active: true })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "No se pudo crear el producto." };

  await logAudit({
    tableName: "products",
    recordId: data.id,
    action: "create",
    summary: `Creó el producto "${fields.name}".`,
    performedBy: profile,
  });

  revalidatePath("/catalogo");
  return { success: true };
}

export async function updateProduct(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const profile = await requireRole(["Admin"]);

  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { error: "Producto inválido." };

  const fields = readProductFields(formData);
  if ("error" in fields) return { error: fields.error };

  const active = formData.get("active") === "true";
  const after = {
    name: fields.name,
    unit: fields.unit,
    stock: fields.stock,
    price: fields.price,
    description: fields.description,
    image_url: fields.image_url,
    active,
  };

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("products")
    .select("name, unit, stock, price, description, image_url, active")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("products").update(after).eq("id", id);
  if (error) return { error: error.message };

  if (before) {
    const summary = diffSummary(before, after, {
      name: "Nombre",
      unit: "Unidad",
      stock: "Stock",
      price: "Precio",
      active: "Activo",
    });
    if (summary) {
      await logAudit({ tableName: "products", recordId: id, action: "update", summary, performedBy: profile });
    }
  }

  revalidatePath("/catalogo");
  return { success: true };
}

// ── Ventas ───────────────────────────────────────────────────────────────

export type SaleItemRow = {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type SaleRow = {
  id: string;
  patient_id: string | null;
  patient_name: string | null;
  sold_by_name: string;
  total: number;
  notes: string | null;
  created_at: string;
  items: SaleItemRow[];
};

/** Ventas más recientes primero, con sus líneas y el nombre de la paciente (si aplica). Admin-only. */
export async function listSales(): Promise<SaleRow[]> {
  await requireRole(["Admin"]);
  const supabase = await createClient();

  type Row = {
    id: string;
    patient_id: string | null;
    sold_by_name: string;
    total: number;
    notes: string | null;
    created_at: string;
    sale_items: SaleItemRow[];
  };

  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, patient_id, sold_by_name, total, notes, created_at, sale_items(product_name, quantity, unit_price, subtotal)",
    )
    .order("created_at", { ascending: false })
    .returns<Row[]>();

  if (error) throw new Error(error.message);

  const patientIds = [...new Set((data ?? []).map((s) => s.patient_id).filter((id): id is string => !!id))];
  const namesByPatientId = new Map<string, string>();
  if (patientIds.length > 0) {
    const { data: patients } = await supabase
      .from("patient_summary")
      .select("id, full_name")
      .in("id", patientIds);
    for (const p of patients ?? []) namesByPatientId.set(p.id, p.full_name ?? "Paciente sin nombre");
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    patient_id: s.patient_id,
    patient_name: s.patient_id ? (namesByPatientId.get(s.patient_id) ?? "Paciente sin nombre") : null,
    sold_by_name: s.sold_by_name,
    total: s.total,
    notes: s.notes,
    created_at: s.created_at,
    items: s.sale_items,
  }));
}

const SaleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive({ error: "La cantidad debe ser mayor a 0." }),
  unitPrice: z.coerce.number().min(0),
});

export async function createSale(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const profile = await requireRole(["Admin"]);

  let parsedItems: unknown;
  try {
    parsedItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "No se pudieron leer los productos de la venta." };
  }

  const itemsResult = z.array(SaleItemSchema).min(1, { error: "Agrega al menos un producto." }).safeParse(parsedItems);
  if (!itemsResult.success) {
    return { error: "Agrega al menos un producto con cantidad válida." };
  }

  const patientIdRaw = formData.get("patientId");
  const patientId = typeof patientIdRaw === "string" && patientIdRaw.trim() ? patientIdRaw : null;
  const notesRaw = formData.get("notes");
  const notes = typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_sale", {
    p_patient_id: patientId,
    p_sold_by: profile.id,
    p_sold_by_name: profile.full_name,
    p_notes: notes,
    p_items: itemsResult.data.map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    })),
  });

  if (error) {
    const message = error.message.includes("stock_check")
      ? "Stock insuficiente para completar la venta."
      : error.message;
    return { error: message };
  }

  revalidatePath("/catalogo");
  return { success: true };
}
