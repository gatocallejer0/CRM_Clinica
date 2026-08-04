import { PatientRegistrationForm } from "@/components/patient-registration-form";
import { getFormFieldsWithOptions } from "@/app/actions/form-fields";

export default async function RegistroPacientePage() {
  const fields = await getFormFieldsWithOptions();
  const activeFields = fields.filter((field) => field.active);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <PatientRegistrationForm fields={activeFields} />
    </div>
  );
}
