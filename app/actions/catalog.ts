"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireScreen } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logAudit, diffSummary } from "@/lib/audit";
import type { ServiceCategory, PatientOption } from "./appointments";

export type CatalogFormState = { error?: string; success?: boolean } | undefined;

/** Paciente puntual (id, nombre, correo) para precargar el selector de "Nueva venta". */
export async function getPatientOption(patientId: string): Promise<PatientOption | null> {
  await requireScreen("cobros");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_summary")
    .select("id, full_name, email")
    .eq("id", patientId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { id: data.id, full_name: data.full_name ?? "Paciente sin nombre", email: data.email };
}

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

/**
 * Todos los servicios (activos e inactivos) — los usan Catálogo (para
 * administrarlos) y Cobros (para venderlos). Sin requireScreen a propósito:
 * RLS (services: active staff can select) ya filtra por pantalla
 * (agenda/admin.catalogo/cobros), igual que listServices() en
 * appointments.ts.
 */
export async function listAllServices(): Promise<ServiceRow[]> {
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
  const profile = await requireScreen("admin.catalogo");

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

  revalidatePath("/admin/catalogo");
  revalidatePath("/agenda");
  return { success: true };
}

export async function updateService(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const profile = await requireScreen("admin.catalogo");

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

  revalidatePath("/admin/catalogo");
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

/**
 * Todos los productos (activos e inactivos) — los usan Catálogo (para
 * administrarlos) y Cobros (para venderlos). Sin requireScreen a propósito,
 * mismo criterio que listAllServices(): RLS ya filtra por pantalla.
 */
export async function listProducts(): Promise<ProductRow[]> {
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
  const profile = await requireScreen("admin.catalogo");

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

  revalidatePath("/admin/catalogo");
  return { success: true };
}

export async function updateProduct(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const profile = await requireScreen("admin.catalogo");

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

  revalidatePath("/admin/catalogo");
  return { success: true };
}

// ── Ventas ───────────────────────────────────────────────────────────────

export type SaleItemKind = "product" | "service";

export type SaleItemRow = {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  kind: SaleItemKind;
};

export type SaleStatus = "borrador" | "pagado" | "pendiente_pago";
export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia";

export type SaleRow = {
  id: string;
  patient_id: string | null;
  patient_name: string | null;
  sold_by_name: string;
  total: number;
  notes: string | null;
  status: SaleStatus;
  payment_method: PaymentMethod | null;
  created_at: string;
  items: SaleItemRow[];
};

/** Ventas más recientes primero, con sus líneas y el nombre de la paciente (si aplica). Pantalla: cobros. */
export async function listSales(): Promise<SaleRow[]> {
  await requireScreen("cobros");
  const supabase = await createClient();

  type ItemRow = {
    product_id: string | null;
    service_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  };

  type Row = {
    id: string;
    patient_id: string | null;
    sold_by_name: string;
    total: number;
    notes: string | null;
    status: SaleStatus;
    payment_method: PaymentMethod | null;
    created_at: string;
    sale_items: ItemRow[];
  };

  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, patient_id, sold_by_name, total, notes, status, payment_method, created_at, sale_items(product_id, service_id, product_name, quantity, unit_price, subtotal)",
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
    status: s.status,
    payment_method: s.payment_method,
    created_at: s.created_at,
    items: s.sale_items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
      kind: i.service_id ? ("service" as const) : ("product" as const),
    })),
  }));
}

const PaymentMethodSchema = z.enum(["efectivo", "tarjeta", "transferencia"]);

const SaleItemSchema = z
  .object({
    productId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    quantity: z.coerce
      .number()
      .int({ error: "La cantidad debe ser un número entero." })
      .positive({ error: "La cantidad debe ser mayor a 0." }),
    // Solo para mostrar el total en el diálogo antes de guardar — create_sale
    // (SQL) ignora este valor y usa siempre products.price/services.price,
    // así que no hay forma de vender a un precio distinto del catálogo
    // editando el request (ver migración 0023_sale_price_from_catalog.sql).
    unitPrice: z.coerce.number().min(0),
  })
  .refine((item) => !!item.productId !== !!item.serviceId, {
    error: "Cada línea debe ser un producto o un servicio.",
  });

export async function createSale(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const profile = await requireScreen("cobros");

  let parsedItems: unknown;
  try {
    parsedItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "No se pudieron leer los productos de la venta." };
  }

  const itemsResult = z
    .array(SaleItemSchema)
    .min(1, { error: "Agrega al menos un producto o servicio." })
    .safeParse(parsedItems);
  if (!itemsResult.success) {
    return { error: "Agrega al menos un producto o servicio con cantidad válida." };
  }

  const patientIdRaw = formData.get("patientId");
  const patientId = typeof patientIdRaw === "string" && patientIdRaw.trim() ? patientIdRaw : null;
  const notesRaw = formData.get("notes");
  const notes = typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null;

  const paymentMethodResult = PaymentMethodSchema.safeParse(formData.get("paymentMethod"));
  if (!paymentMethodResult.success) {
    return { error: "Selecciona el método de pago." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_sale", {
    p_patient_id: patientId,
    p_sold_by: profile.id,
    p_sold_by_name: profile.full_name,
    p_notes: notes,
    p_items: itemsResult.data.map((i) => ({
      product_id: i.productId ?? null,
      service_id: i.serviceId ?? null,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    })),
    p_payment_method: paymentMethodResult.data,
  });

  if (error) {
    const message = error.message.includes("stock_check")
      ? "Stock insuficiente para completar la venta."
      : error.message;
    return { error: message };
  }

  revalidatePath("/admin/catalogo");
  revalidatePath("/cobros");
  return { success: true };
}

/**
 * Crea el cobro del servicio de una cita al marcarla "atendida" — para que
 * Recepción no tenga que darlo de alta a mano. Se llama desde
 * appointments.ts tanto en el marcado manual (queda "pendiente_pago", se
 * cobra después en Cobros) como en el automático por horario vencido (queda
 * "pagado" directo, con "efectivo" como método por defecto — nadie está ahí
 * para elegirlo en ese momento; el personal lo corrige después si en
 * realidad se pagó de otra forma). Nunca lanza: es un efecto secundario
 * best-effort, igual que la sincronización con Google Calendar — que esto
 * falle no debe impedir que la cita se marque atendida.
 *
 * Idempotente por `appointment_id` (índice único en sales): si esta cita ya
 * generó un cobro, Postgres devuelve un choque de unicidad que se ignora en
 * silencio en vez de crear uno duplicado.
 */
export async function createSaleFromAttendedAppointment({
  appointmentId,
  patientId,
  serviceId,
  price,
  soldBy,
  soldByName,
  status = "pendiente_pago",
  paymentMethod,
}: {
  appointmentId: string;
  patientId: string;
  serviceId: string;
  price: number;
  soldBy: string | null;
  soldByName: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
}): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("create_sale", {
    p_patient_id: patientId,
    p_sold_by: soldBy,
    p_sold_by_name: soldByName,
    p_notes: "Generado automáticamente al marcar la cita como atendida.",
    p_items: [{ product_id: null, service_id: serviceId, quantity: 1, unit_price: price }],
    p_appointment_id: appointmentId,
    p_status: status,
    p_payment_method: paymentMethod ?? null,
  });

  if (error && error.code !== "23505") {
    // 23505 = unique_violation (ya existe un cobro para esta cita) — no es un error real.
    console.error("[createSaleFromAttendedAppointment] Error:", error.message);
  }

  if (!error) {
    revalidatePath("/cobros");
  }
}

const UpdateSaleStatusSchema = z
  .object({
    saleId: z.string().uuid(),
    status: z.enum(["borrador", "pagado", "pendiente_pago"]),
    paymentMethod: PaymentMethodSchema.optional(),
  })
  // El método de pago solo es obligatorio al dejar la venta como "pagado" —
  // para "borrador"/"pendiente_pago" no hay nada que registrar todavía.
  .refine((data) => data.status !== "pagado" || !!data.paymentMethod, {
    error: "Selecciona el método de pago.",
    path: ["paymentMethod"],
  });

export async function updateSaleStatus(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  await requireScreen("cobros");

  const paymentMethodRaw = formData.get("paymentMethod");
  const parsed = UpdateSaleStatusSchema.safeParse({
    saleId: formData.get("saleId"),
    status: formData.get("status"),
    paymentMethod: paymentMethodRaw || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Estado inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_sale_status", {
    p_sale_id: parsed.data.saleId,
    p_status: parsed.data.status,
    p_payment_method: parsed.data.paymentMethod ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/cobros");
  return { success: true };
}

type PrintItemRow = {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

export type SaleReceiptData = {
  id: string;
  createdAt: string;
  patientName: string | null;
  soldByName: string;
  notes: string | null;
  total: number;
  items: PrintItemRow[];
};

/** Datos de una venta para el recibo imprimible (/recibo/[saleId]). Pantalla: cobros. */
export async function getSaleForPrint(saleId: string): Promise<SaleReceiptData | null> {
  await requireScreen("cobros");
  const supabase = await createClient();

  const { data: sale, error } = await supabase
    .from("sales")
    .select(
      "id, patient_id, sold_by_name, total, notes, created_at, sale_items(product_name, quantity, unit_price, subtotal)",
    )
    .eq("id", saleId)
    .maybeSingle<{
      id: string;
      patient_id: string | null;
      sold_by_name: string;
      total: number;
      notes: string | null;
      created_at: string;
      sale_items: PrintItemRow[];
    }>();

  if (error) throw new Error(error.message);
  if (!sale) return null;

  let patientName: string | null = null;
  if (sale.patient_id) {
    const { data: patient } = await supabase
      .from("patient_summary")
      .select("full_name")
      .eq("id", sale.patient_id)
      .maybeSingle();
    patientName = patient?.full_name ?? "Paciente sin nombre";
  }

  return {
    id: sale.id,
    createdAt: sale.created_at,
    patientName,
    soldByName: sale.sold_by_name,
    notes: sale.notes,
    total: sale.total,
    items: sale.sale_items,
  };
}
