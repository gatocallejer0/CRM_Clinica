"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardListIcon, PackageIcon, PencilIcon, PlusIcon, ReceiptIcon } from "lucide-react";
import type { ServiceRow, ProductRow, SaleRow } from "@/app/actions/catalog";
import { CATEGORY_LABELS } from "@/components/agenda/appointment-meta";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditLogDialog } from "@/components/shared/audit-log-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { BackToAdminLink } from "@/components/admin/back-to-admin-link";
import { ServiceDialog } from "./service-dialog";
import { ProductDialog } from "./product-dialog";
import { SaleDialog } from "./sale-dialog";
import { formatCurrency } from "@/lib/format";

type Tab = "servicios" | "productos" | "ventas";

const TABS: { value: Tab; label: string }[] = [
  { value: "servicios", label: "Servicios" },
  { value: "productos", label: "Productos" },
  { value: "ventas", label: "Ventas" },
];

const DATE_FORMAT = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" });

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={active ? "border-transparent" : undefined}
      style={
        active
          ? { color: "var(--status-confirmed-fg)", backgroundColor: "var(--status-confirmed-bg)" }
          : undefined
      }
    >
      {active ? "Activo" : "Inactivo"}
    </Badge>
  );
}

export function CatalogoView({
  services,
  products,
  sales,
}: {
  services: ServiceRow[];
  products: ProductRow[];
  sales: SaleRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("servicios");

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRow | undefined>(undefined);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | undefined>(undefined);

  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [saleDialogKey, setSaleDialogKey] = useState(0);

  function refresh() {
    router.refresh();
  }

  function openCreateService() {
    setEditingService(undefined);
    setServiceDialogOpen(true);
  }

  function openEditService(service: ServiceRow) {
    setEditingService(service);
    setServiceDialogOpen(true);
  }

  function openCreateProduct() {
    setEditingProduct(undefined);
    setProductDialogOpen(true);
  }

  function openEditProduct(product: ProductRow) {
    setEditingProduct(product);
    setProductDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <BackToAdminLink />

      <div className="flex justify-end">
        {tab === "servicios" && (
          <Button onClick={openCreateService}>
            <PlusIcon />
            Nuevo servicio
          </Button>
        )}
        {tab === "productos" && (
          <Button onClick={openCreateProduct}>
            <PlusIcon />
            Nuevo producto
          </Button>
        )}
        {tab === "ventas" && (
          <Button
            onClick={() => {
              setSaleDialogKey((k) => k + 1);
              setSaleDialogOpen(true);
            }}
          >
            <PlusIcon />
            Nueva venta
          </Button>
        )}
      </div>

      <div className="flex w-fit flex-wrap items-center gap-1.5 rounded-2xl border border-white/70 bg-white/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "servicios" && (
        <Card className="gap-0 p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="pl-5 font-medium text-foreground">{service.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{CATEGORY_LABELS[service.category]}</Badge>
                  </TableCell>
                  <TableCell>{service.duration_minutes} min</TableCell>
                  <TableCell>{formatCurrency(service.price)}</TableCell>
                  <TableCell>
                    <StatusBadge active={service.active} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex items-center justify-end">
                      <AuditLogDialog tableName="services" recordId={service.id} title={service.name} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditService(service)}
                        title="Editar servicio"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {services.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState icon={ClipboardListIcon} message="Sin servicios todavía." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === "productos" && (
        <Card className="gap-0 p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Producto</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-2.5">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria, sin dominio fijo para next/image
                        <img
                          src={product.image_url}
                          alt=""
                          className="size-9 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-neutral)] font-heading text-xs font-bold text-white">
                          {product.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="truncate text-xs text-muted-foreground">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={product.stock <= 0 ? "font-semibold text-destructive" : undefined}>
                      {product.stock} {product.unit}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(product.price)}</TableCell>
                  <TableCell>
                    <StatusBadge active={product.active} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex items-center justify-end">
                      <AuditLogDialog tableName="products" recordId={product.id} title={product.name} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditProduct(product)}
                        title="Editar producto"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState icon={PackageIcon} message="Sin productos todavía." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === "ventas" && (
        <Card className="gap-0 p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Fecha</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Vendido por</TableHead>
                <TableHead className="pr-5 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="pl-5 whitespace-nowrap">
                    {DATE_FORMAT.format(new Date(sale.created_at))}
                  </TableCell>
                  <TableCell>{sale.patient_name ?? "—"}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="text-sm text-muted-foreground">
                      {sale.items.map((i) => `${i.quantity} ${i.product_name}`).join(", ")}
                    </span>
                  </TableCell>
                  <TableCell>{sale.sold_by_name}</TableCell>
                  <TableCell className="pr-5 text-right font-semibold text-foreground">
                    {formatCurrency(sale.total)}
                  </TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState icon={ReceiptIcon} message="Sin ventas todavía." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <ServiceDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        service={editingService}
        onSaved={refresh}
      />
      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        product={editingProduct}
        onSaved={refresh}
      />
      <SaleDialog
        key={saleDialogKey}
        open={saleDialogOpen}
        onOpenChange={setSaleDialogOpen}
        products={products}
        onSaved={refresh}
      />
    </div>
  );
}
