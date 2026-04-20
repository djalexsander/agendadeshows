/**
 * Centralized validation schemas (zod).
 * Reused across forms to keep error messages consistent and prevent
 * silent acceptance of invalid input.
 */
import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Informe seu e-mail." })
  .max(255, { message: "E-mail muito longo." })
  .email({ message: "E-mail inválido." });

/** Telefone brasileiro: 10 ou 11 dígitos (com DDD). Aceita máscara — só conta dígitos. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, { message: "Informe seu telefone." })
  .refine((v) => {
    const digits = v.replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11;
  }, { message: "Telefone deve ter DDD + número (10 ou 11 dígitos)." });

export const passwordSchema = z
  .string()
  .min(6, { message: "A senha deve ter pelo menos 6 caracteres." })
  .max(128, { message: "Senha muito longa." });

export const nameSchema = z
  .string()
  .trim()
  .min(2, { message: "Informe seu nome completo." })
  .max(120, { message: "Nome muito longo." });

export const signupSchema = z
  .object({
    nome: nameSchema,
    email: emailSchema,
    telefone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    cidade: z.string().trim().max(120).optional().or(z.literal("")),
    estado: z.string().trim().max(2).optional().or(z.literal("")),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Informe sua senha." }),
});

/**
 * Returns the first user-facing error message from a ZodError, or null.
 * Helpful for surfacing one toast at a time.
 */
export function firstZodError(error: z.ZodError): string | null {
  return error.issues[0]?.message ?? null;
}
