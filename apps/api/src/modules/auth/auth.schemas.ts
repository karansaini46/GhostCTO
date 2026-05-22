import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(12).max(128);

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(120).optional(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const emptyBodySchema = z.object({}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
