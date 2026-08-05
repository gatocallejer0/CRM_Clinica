import { PatientRegistrationForm } from "@/components/patient-registration-form";
import { getFormFieldsWithOptions } from "@/app/actions/form-fields";
import { AuthBackgroundBlobs } from "@/components/auth-background-blobs";

export default async function RegistroPacientePage() {
  const fields = await getFormFieldsWithOptions();
  const activeFields = fields.filter((field) => field.active);

  return (
    <div className="relative flex flex-1 justify-center p-6 py-10">
      <AuthBackgroundBlobs />
      <PatientRegistrationForm fields={activeFields} />
    </div>
  );
}
