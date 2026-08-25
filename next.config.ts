import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Actions vienen limitadas a 1 MB por defecto — subir un
      // documento clínico (imagen/PDF) pasa por uploadClinicalDocument, cuyo
      // tope real es 20 MB (ver lib/clinical-document-limits.ts). Este valor
      // va un poco arriba de esos 20 MB a propósito: el cuerpo del request
      // incluye el multipart boundary y otros campos del formulario además
      // del archivo, así que un archivo de exactamente 20 MB necesita algo
      // de margen extra o el framework lo corta a medias (error confuso
      // "Unexpected end of form" en vez del mensaje claro del action).
      bodySizeLimit: "21mb",
    },
  },
};

export default nextConfig;
