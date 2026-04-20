import { describe, it, expect } from "vitest";
import {
  emailSchema,
  phoneSchema,
  passwordSchema,
  signupSchema,
  loginSchema,
  firstZodError,
} from "../validation";

describe("validation - emailSchema", () => {
  it("aceita e-mails válidos", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
    expect(emailSchema.safeParse("  user@example.com  ").success).toBe(true);
  });
  it("rejeita e-mail inválido ou vazio", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("validation - phoneSchema", () => {
  it("aceita 10 ou 11 dígitos com ou sem máscara", () => {
    expect(phoneSchema.safeParse("11987654321").success).toBe(true);
    expect(phoneSchema.safeParse("(11) 98765-4321").success).toBe(true);
    expect(phoneSchema.safeParse("(11) 3456-7890").success).toBe(true);
  });
  it("rejeita telefone curto demais", () => {
    expect(phoneSchema.safeParse("123456").success).toBe(false);
    expect(phoneSchema.safeParse("").success).toBe(false);
  });
});

describe("validation - passwordSchema", () => {
  it("aceita senha com 6+ caracteres", () => {
    expect(passwordSchema.safeParse("abc123").success).toBe(true);
  });
  it("rejeita senha curta demais", () => {
    expect(passwordSchema.safeParse("abc").success).toBe(false);
  });
});

describe("validation - signupSchema", () => {
  const base = {
    nome: "João da Silva",
    email: "joao@example.com",
    telefone: "11987654321",
    password: "senha123",
    confirmPassword: "senha123",
    cidade: "São Paulo",
    estado: "SP",
  };

  it("aceita payload válido", () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });
  it("aceita cidade/estado vazios", () => {
    expect(signupSchema.safeParse({ ...base, cidade: "", estado: "" }).success).toBe(true);
  });
  it("rejeita quando senhas divergem", () => {
    const r = signupSchema.safeParse({ ...base, confirmPassword: "outra" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(firstZodError(r.error)).toBe("As senhas não coincidem.");
    }
  });
  it("rejeita nome muito curto", () => {
    expect(signupSchema.safeParse({ ...base, nome: "A" }).success).toBe(false);
  });
});

describe("validation - loginSchema", () => {
  it("aceita login válido", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
  it("rejeita login sem senha", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
