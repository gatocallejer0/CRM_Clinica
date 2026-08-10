import type { Metadata } from "next";
import { Montserrat, Jost } from "next/font/google";
import "./globals.css";

// Tipografía primaria de marca (guía MAR branding & design).
const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

// "Avant" (Avant Garde Gothic) es una fuente comercial, no disponible en
// Google Fonts. Jost es la alternativa libre más cercana: misma familia
// geométrica de formas circulares (Kabel/Avant Garde).
const jost = Jost({
  variable: "--font-jost",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM Clínica",
  description: "CRM para gestión de pacientes y agendamiento de la clínica",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[image:var(--gradient-bg)] bg-fixed">
        {children}
      </body>
    </html>
  );
}
