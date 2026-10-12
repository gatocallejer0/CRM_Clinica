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
              derechos sobre ella. Somos una clínica de ginecología y obstetricia, y sabemos que la información
              de salud sexual y reproductiva es de las más íntimas que existen — por eso la tratamos con el
              máximo nivel de reserva.
            </p>

            <h2 className={h2}>1. Qué información recopilamos</h2>
            <p className={p}>
              Cuando agendas una cita o completas tu registro como paciente —ya sea en persona, por teléfono con
              Recepción, o a través del formulario en línea— y a lo largo de tu atención, podemos recopilar:
            </p>
            <ul className={ul}>
              <li>Datos de contacto: correo electrónico, teléfono, dirección y contacto de emergencia.</li>
              <li>Datos de identificación: nombre completo, fecha de nacimiento, documento de identificación (DPI), NIT.</li>
              <li>
                Antecedentes médicos generales: medicamentos, cirugías, alergias, enfermedades familiares, seguro
                médico, hábitos (tabaco, alcohol) y demás información del formulario de antecedentes médicos.
              </li>
              <li>
                Expediente clínico ginecológico y obstétrico: motivo de consulta, antecedentes ginecológicos y
                obstétricos, historial menstrual, embarazos, partos, métodos anticonceptivos, resultados de
                laboratorio, ultrasonidos, diagnósticos, recetas y notas médicas de la doctora.
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
            <p className={p}>
              Usamos estos datos <strong className="text-foreground">únicamente</strong> para tu atención médica y
              la administración de la consulta. No los usamos para fines publicitarios ni los vendemos a
              terceros. La base de este tratamiento es el consentimiento que nos das al registrarte y la propia
              relación médico-paciente.
            </p>

            <h2 className={h2}>3. Datos especialmente sensibles</h2>
            <p className={p}>
              <strong className="text-foreground">Salud sexual y reproductiva.</strong> Embarazos, pérdidas
              gestacionales, métodos anticonceptivos, infecciones de transmisión sexual y procedimientos
              ginecológicos reciben protección reforzada dentro de la clínica: solo los consulta la doctora
              tratante y el personal que ella autorice para tu atención.
            </p>
            <p className={p}>
              <strong className="text-foreground">VIH e infecciones de transmisión sexual.</strong> Estos
              diagnósticos reciben confidencialidad reforzada, en atención a lo que exige la Ley General para el
              Combate del Virus de Inmunodeficiencia Humana y del Síndrome de Inmunodeficiencia Adquirida y de la
              Promoción, Protección y Defensa de los Derechos Humanos ante el VIH/SIDA (Decreto 27-2000).
            </p>
            <p className={p}>
              <strong className="text-foreground">Pacientes menores de edad.</strong> Sus datos se registran con
              el consentimiento de su madre, padre o representante legal. Esta política no exime a la clínica de
              sus obligaciones legales de denunciar casos de violencia o abuso sexual cuando correspondan.
            </p>

            <h2 className={h2}>4. Lo que nunca hacemos</h2>
            <ul className={ul}>
              <li>
                <strong className="text-foreground">No vendemos</strong> ni alquilamos tu información a terceros.
              </li>
              <li>
                <strong className="text-foreground">No usamos</strong> tus datos para publicidad, perfiles
                comerciales ni contacto de marketing.
              </li>
              <li>
                <strong className="text-foreground">No entrenamos</strong> modelos de inteligencia artificial con
                tu información.
              </li>
              <li>
                <strong className="text-foreground">No compartimos</strong> tu información con aseguradoras,
                empleadores o familiares sin tu autorización, salvo que la ley nos obligue a ello.
              </li>
            </ul>

            <h2 className={h2}>5. Con quién compartimos tu información</h2>
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
              También podemos compartir información con autoridades, únicamente cuando exista una orden judicial
              o una obligación legal expresa. Fuera de estos casos, no compartimos tu información con ninguna
              otra empresa ni la usamos para publicidad de terceros.
            </p>

            <h2 className={h2}>6. Cuánto tiempo conservamos tu información</h2>
            <p className={p}>
              Conservamos tu expediente mientras mantengas una relación activa como paciente de la clínica, y
              después por el tiempo que exige la normativa sanitaria aplicable a expedientes clínicos (Código de
              Salud, Decreto 90-97) y la buena práctica médica.
            </p>

            <h2 className={h2}>7. Seguridad</h2>
            <p className={p}>Protegemos tu información con:</p>
            <ul className={ul}>
              <li>Acceso restringido por roles: solo el personal autorizado puede ver datos de pacientes, y cada quien ve solo lo que su puesto necesita.</li>
              <li>Contraseñas individuales por cada cuenta del personal, con cifrado gestionado por nuestro proveedor de autenticación.</li>
              <li>Conexión cifrada (HTTPS) en todo el sistema.</li>
              <li>Una bitácora que registra quién crea, modifica o elimina cada registro, y cuándo.</li>
              <li>Revisiones periódicas de seguridad del código y la configuración.</li>
            </ul>
            <p className={p}>Ningún sistema es 100% infalible, pero tomamos estas medidas en serio.</p>

            <h2 className={h2}>8. Tus derechos</h2>
            <p className={p}>
              Puedes solicitarnos en cualquier momento <strong className="text-foreground">conocer</strong> qué
              datos tuyos guardamos, <strong className="text-foreground">corregirlos</strong> si están
              desactualizados, o pedir que los eliminemos (sujeto a las obligaciones de conservación de
              expedientes médicos que mencionamos arriba), conforme a los artículos 24 y 31 de la Constitución
              Política de la República de Guatemala. Para ejercer cualquiera de estos derechos, contáctanos:
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

            <h2 className={h2}>9. Si ocurre un incidente de seguridad</h2>
            <p className={p}>
              Si detectamos un acceso no autorizado, pérdida o alteración de tus datos, te lo haremos saber lo
              antes posible, indicándote qué ocurrió, qué información pudo verse afectada y qué medidas tomamos.
            </p>

            <h2 className={h2}>10. Cambios a esta política</h2>
            <p className={p}>
              Podemos actualizar esta política ocasionalmente. Si hacemos cambios importantes, actualizaremos la
              fecha al inicio de esta página.
            </p>

            <h2 className={h2}>11. Marco legal</h2>
            <p className={p}>
              Guatemala aún no cuenta con una ley general de protección de datos personales. Esta política se
              basa en la Constitución Política de la República (artículos 24 y 31), el Código Penal (delitos
              informáticos, artículos 274 A al 274 G), el Código de Salud (Decreto 90-97) y la Ley General para
              el Combate del VIH y SIDA (Decreto 27-2000). La actualizaremos cuando entre en vigor una ley
              específica de protección de datos.
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
