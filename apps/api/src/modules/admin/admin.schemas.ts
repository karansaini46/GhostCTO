import { z } from 'zod';

export const adminUsersQuerySchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
  })
  .strict();

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
