import { requireRole } from "@/lib/auth/roles";
import { getFormFieldsWithOptions } from "@/app/actions/form-fields";
import { FormFieldsManager } from "@/components/form-fields-manager";

export default async function AdminFormularioPage() {
  await requireRole(["Admin"]);
  const fields = await getFormFieldsWithOptions();

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">
        Agrega, inactiva o elimina preguntas y opciones del formulario
        público de registro de pacientes.
      </p>

      <FormFieldsManager initialFields={fields} />
    </div>
  );
}
