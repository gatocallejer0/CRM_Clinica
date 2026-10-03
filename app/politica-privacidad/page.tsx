import type { Metadata } from "next";
import Link from "next/link";
import { AuthBackgroundBlobs } from "@/components/auth-background-blobs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PendingDetailBanner } from "@/components/legal/pending-detail-banner";
import { Placeholder } from "@/components/legal/placeholder";

export const metadata: Metadata = {
  title: "Política de Privacidad — CRM Clínica",
  description: "Qué datos recopila el sistema de la clínica, para qué se usan y con quién se comparten.",
};

// Fecha de esta versión — actualízala manualmente cada vez que se edite el
// contenido de esta página (no hay versionado automático).
const LAST_UPDATED = "pendiente de publicar";

const h2 = "font-heading mt-7 mb-2 text-base font-semibold text-foreground first:mt-0";
const p = "text-sm leading-relaxed text-muted-foreground";
const ul = "list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground";

export default function PoliticaPrivacidadPage() {
  return (
    <div className="relative flex flex-1 justify-center overflow-hidden p-6 py-10">
      <AuthBackgroundBlobs />
      <div className="relative flex w-full max-w-2xl flex-col gap-4">
        <PendingDetailBanner />
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">Política de Privacidad</CardTitle>
            <CardDescription>Última actualización: {LAST_UPDATED}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={p}>
              Esta página explica qué información recopila <Placeholder>Nombre legal de la clínica</Placeholder>{" "}
              (&ldquo;la clínica&rdquo;, &ldquo;nosotros&rdquo;) a través de su sistema de agendamiento y
              expediente de pacientes, para qué la usamos, con quién la compartimos y cómo puedes ejercer tus
              derechos sobre ella.
            </p>

            <h2 className={h2}>1. Qué información recopilamos</h2>
            <p className={p}>
              Cuando agendas una cita o completas tu registro como paciente —ya sea en persona, por teléfono con
              Recepción, o a través del formulario en línea— podemos recopilar:
            </p>
            <ul className={ul}>
              <li>Datos de contacto: correo electrónico, teléfono, dirección.</li>
              <li>Datos de identificación: nombre completo, documento de identificación (DPI), NIT.</li>
              <li>
                Datos de salud: antecedentes médicos, alergias, medicamentos, tipo de sangre, enfermedades
                familiares, y demás información que proporciones en el formulario de antecedentes médicos.
              </li>
              <li>Datos de la cita: fecha, hora, servicio solicitado y doctora asignada.</li>
              <li>
                Registro de cobros por los servicios recibidos (no procesamos ni almacenamos datos de tarjetas de
                pago directamente).
              </li>
            </ul>
            <p className={p}>
              El único dato obligatorio para completar tu registro en línea es el correo electrónico; el resto de
              los campos del formulario son opcionales, aunque te recomendamos completarlos para que tu atención
              médica sea más precisa.
            </p>

            <h2 className={h2}>2. Para qué usamos tu información</h2>
            <ul className={ul}>
              <li>Agendar, confirmar y dar seguimiento a tus citas.</li>
              <li>Mantener tu expediente clínico para que la doctora te atienda con el contexto adecuado.</li>
              <li>Registrar los cobros por los servicios que recibes.</li>
              <li>Contactarte sobre tu cita o tu atención, cuando sea necesario.</li>
            </ul>
            <p className={p}>No usamos tu información para fines publicitarios ni la vendemos a terceros.</p>

            <h2 className={h2}>3. Con quién compartimos tu información</h2>
            <p className={p}>
              Tu información solo la ve el personal autorizado de la clínica (doctoras, recepción y
              administración), según lo que necesite cada uno para hacer su trabajo. Además, usamos a los
              siguientes proveedores para operar el sistema — cada uno almacena o procesa datos en nuestro
              nombre, bajo sus propias políticas de seguridad:
            </p>
            <ul className={ul}>
              <li>
                <strong className="text-foreground">Supabase</strong> — aloja nuestra base de datos (toda la
                información descrita arriba).
              </li>
              <li>
                <strong className="text-foreground">Vercel</strong> — aloja la aplicación web que usas para
                registrarte y que usa el personal para administrar la clínica.
              </li>
              <li>
                <strong className="text-foreground">Google Calendar</strong> — si tu doctora conecta su cuenta de
                Google al sistema, el nombre de la paciente y el horario de tu cita se sincronizan a su
                calendario de Google, para que pueda ver su agenda desde ahí también.
              </li>
            </ul>
            <p className={p}>
              No compartimos tu información con ninguna otra empresa, ni la usamos para publicidad de terceros.
            </p>

            <h2 className={h2}>4. Cuánto tiempo conservamos tu información</h2>
            <p className={p}>
              Conservamos tu expediente mientras mantengas una relación activa como paciente de la clínica, y
              después por el tiempo que la buena práctica médica y la normativa aplicable a expedientes clínicos
              lo requieran.
            </p>

            <h2 className={h2}>5. Seguridad</h2>
            <p className={p}>
              Protegemos tu información con acceso restringido por roles (solo el personal autorizado puede ver
              datos de pacientes), contraseñas individuales por cada cuenta del personal, conexión cifrada
              (HTTPS) en todo el sistema, y revisiones periódicas de seguridad del código y la configuración.
              Ningún sistema es 100% infalible, pero tomamos estas medidas en serio.
            </p>

            <h2 className={h2}>6. Tus derechos</h2>
            <p className={p}>
              Puedes solicitarnos en cualquier momento acceder a tu información, corregirla si está
              desactualizada, o pedir que la eliminemos (sujeto a las obligaciones de conservación de expedientes
              médicos que mencionamos arriba). Para ejercer cualquiera de estos derechos, contáctanos:
            </p>
            <ul className={ul}>
              <li>
                Correo: <Placeholder>correo de contacto</Placeholder>
              </li>
              <li>
                Teléfono: <Placeholder>teléfono de contacto</Placeholder>
              </li>
              <li>
                Dirección: <Placeholder>ciudad / dirección</Placeholder>
              </li>
            </ul>

            <h2 className={h2}>7. Menores de edad</h2>
            <p className={p}>
              Si se registra a una paciente menor de edad, asumimos que quien completa el formulario cuenta con
              la autoridad de madre, padre o tutor legal para hacerlo.
            </p>

            <h2 className={h2}>8. Cambios a esta política</h2>
            <p className={p}>
              Podemos actualizar esta política ocasionalmente. Si hacemos cambios importantes, actualizaremos la
              fecha al inicio de esta página.
            </p>

            <p className={`${p} mt-6`}>
              Ver también nuestros{" "}
              <Link href="/terminos" className="text-foreground underline underline-offset-2">
                Términos y Condiciones
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
