import { requireScreen } from "@/lib/auth/roles";
import { getFormFieldsWithOptions } from "@/app/actions/form-fields";
import { PatientsImportView } from "@/components/admin/patients-import-view";

export default async function ImportarPacientesPage() {
  const [, fields] = await Promise.all([requireScreen("admin.pacientes"), getFormFieldsWithOptions()]);

  return <PatientsImportView fields={fields.filter((f) => f.active)} />;
}
