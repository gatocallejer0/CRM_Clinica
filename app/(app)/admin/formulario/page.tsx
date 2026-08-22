import { requireRole } from "@/lib/auth/roles";
import { getFormFieldsWithOptions } from "@/app/actions/form-fields";
import { FormFieldsManager } from "@/components/form-fields-manager";
import { BackToAdminLink } from "@/components/admin/back-to-admin-link";

export default async function AdminFormularioPage() {
  // getFormFieldsWithOptions no depende de requireRole (RLS ya distingue
  // anon/personal), así que puede correr en paralelo sin riesgo.
  const [, fields] = await Promise.all([requireRole(["Admin"]), getFormFieldsWithOptions()]);

  return (
    <div className="flex flex-col gap-6">
      <BackToAdminLink />

      <FormFieldsManager initialFields={fields} />
    </div>
  );
}
