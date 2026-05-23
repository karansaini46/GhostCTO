import { z } from 'zod';

export const licenseVerificationSchema = z
  .object({
    licenseKey: z.string().trim().min(1).max(256),
  })
  .strict();

export type LicenseVerificationInput = z.infer<typeof licenseVerificationSchema>;
