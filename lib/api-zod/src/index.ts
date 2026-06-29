import { z } from "zod";

export const HealthCheckResponse = z.object({
  status: z.literal("ok"),
});

export const GenerateBrandsBody = z.object({
  description: z.string().min(1),
  category: z.string().min(1),
  keywords: z.string().optional(),
});

export const CheckBrandAvailabilityBody = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
});
