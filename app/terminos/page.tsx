import type { Metadata } from "next";
import Link from "next/link";
import { AuthBackgroundBlobs } from "@/components/auth-background-blobs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PendingDetailBanner } from "@/components/legal/pending-detail-banner";
import { Placeholder } from "@/components/legal/placeholder";

export const metadata: Metadata = {
  title: "Términos y Condiciones — CRM Clínica",
  description: "Condiciones de uso del formulario de registro y agendamiento en línea de la clínica.",
};

const LAST_UPDATED = "pendiente de publicar";

const h2 = "font-heading mt-7 mb-2 text-base font-semibold text-foreground first:mt-0";
const p = "text-sm leading-relaxed text-muted-foreground";
const ul = "list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground";

export default function TerminosPage() {
  return (
    <div className="relative flex flex-1 justify-center overflow-hidden p-6 py-10">
      <AuthBackgroundBlobs />
      <div className="relative flex w-full max-w-2xl flex-col gap-4">
        <PendingDetailBanner />
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Términos y Condiciones</CardTitle>
            <CardDescription>Última actualización: {LAST_UPDATED}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={p}>
              Estos términos aplican al uso del formulario de registro en línea y del sistema de agendamiento de{" "}
              <Placeholder>Nombre legal de la clínica</Placeholder> (&ldquo;la clínica&rdquo;). Al enviar el
              formulario de registro, aceptas estos términos.
            </p>

            <h2 className={h2}>1. Qué es este formulario</h2>
            <p className={p}>
              Este formulario es una herramienta administrativa para recopilar tus datos de contacto y
              antecedentes médicos antes de tu cita, y agilizar tu atención. No sustituye una consulta médica, no
              constituye diagnóstico ni tratamiento, y <strong className="text-foreground">no debe usarse para
              reportar una emergencia médica</strong> — si tienes una emergencia, acude directamente a un servicio
              de emergencias o llama a los números de emergencia correspondientes.
            </p>

            <h2 className={h2}>2. Veracidad de la información</h2>
            <p className={p}>
              Eres responsable de que los datos que proporciones sean exactos y estén actualizados, especialmente
              tus antecedentes médicos y datos de contacto — una doctora los usará para tu atención. Si tus datos
              cambian, infórmalo a la clínica lo antes posible.
            </p>

            <h2 className={h2}>3. Uso aceptable</h2>
            <p className={p}>Al usar este sistema, te comprometes a no:</p>
            <ul className={ul}>
              <li>Registrar datos de otra persona sin su consentimiento.</li>
              <li>Intentar acceder a información de otras pacientes o del personal sin autorización.</li>
              <li>Usar el sistema para enviar contenido falso, ofensivo o malicioso.</li>
              <li>Intentar vulnerar, sobrecargar o interferir con el funcionamiento del sistema.</li>
            </ul>

            <h2 className={h2}>4. Código de registro</h2>
            <p className={p}>
              Si la clínica te agendó una cita por teléfono, te compartirá un código corto para que completes tu
              ficha desde este formulario. Ese código es personal — no lo compartas con nadie más que no sea tú
              misma, ya que sirve precisamente para que solo tú puedas completar tus propios datos.
            </p>

            <h2 className={h2}>5. Disponibilidad del servicio</h2>
            <p className={p}>
              Hacemos un esfuerzo razonable para mantener el sistema disponible, pero puede haber interrupciones
              por mantenimiento o causas fuera de nuestro control. No garantizamos disponibilidad ininterrumpida.
            </p>

            <h2 className={h2}>6. Privacidad</h2>
            <p className={p}>
              El uso de tus datos se rige por nuestra{" "}
              <Link href="/politica-privacidad" className="text-foreground underline underline-offset-2">
                Política de Privacidad
              </Link>
              , que forma parte de estos términos.
            </p>

            <h2 className={h2}>7. Cambios a estos términos</h2>
            <p className={p}>
              Podemos actualizar estos términos ocasionalmente. Si hacemos cambios importantes, actualizaremos la
              fecha al inicio de esta página.
            </p>

            <h2 className={h2}>8. Ley aplicable y contacto</h2>
            <p className={p}>
              Estos términos se rigen por las leyes de la República de Guatemala. Para consultas, contáctanos:
            </p>
            <ul className={ul}>
              <li>
                Correo: <Placeholder>correo de contacto</Placeholder>
              </li>
              <li>
                Teléfono: <Placeholder>teléfono de contacto</Placeholder>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
