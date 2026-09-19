import "server-only";
import { randomInt } from "crypto";
import * as z from "zod";

// Excluye caracteres que se confunden fácilmente al transcribir a mano
// (0/O, 1/l/I).
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

function pick(chars: string): string {
  return chars[randomInt(chars.length)];
}

/** Contraseña temporal aleatoria: garantiza mayúscula, minúscula, dígito y símbolo. */
export function generateTempPassword(length = 12): string {
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: Math.max(length - required.length, 0) }, () => pick(ALL));
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

/**
 * Código corto para que Recepción se lo dicte a una paciente por teléfono
 * (ver 0024_patient_claim_code.sql) — mismo alfabeto sin ambigüedades que
 * generateTempPassword, pero sin símbolos ni mezcla de mayúsculas/minúsculas
 * (más fácil de transcribir a mano que una contraseña).
 */
export function generateClaimCode(length = 6): string {
  const alphabet = UPPER + DIGITS;
  return Array.from({ length }, () => pick(alphabet)).join("");
}

export const TEMP_PASSWORD_TTL_MS = 2 * 60 * 60 * 1000;

export const NEW_PASSWORD_REQUIREMENTS_HINT =
  "Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.";

/** Reglas de complejidad para una contraseña elegida por el usuario (no aplica a las autogeneradas). */
export const newPasswordSchema = z
  .string()
  .min(8, { error: "Debe tener al menos 8 caracteres." })
  .regex(/[A-Z]/, { error: "Debe incluir al menos una mayúscula." })
  .regex(/[a-z]/, { error: "Debe incluir al menos una minúscula." })
  .regex(/[0-9]/, { error: "Debe incluir al menos un número." })
  .regex(/[^A-Za-z0-9]/, { error: "Debe incluir al menos un símbolo." });
