import { requireRole } from "@/lib/auth/roles";
import { getFormFieldsWithOptions } from "@/app/actions/form-fields";
import { FormFieldsManager } from "@/components/form-fields-manager";

export default async function AdminFormularioPage() {
  await requireRole(["Admin"]);
  const fields = await getFormFieldsWithOptions();

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Formulario de pacientes</h1>
        <p className="text-muted-foreground">
          Agrega, inactiva o elimina preguntas y opciones del formulario
          público de registro de pacientes.
        </p>
      </div>

      <FormFieldsManager initialFields={fields} />
    </div>
  );
}
