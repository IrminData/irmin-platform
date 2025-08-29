import { z } from 'zod';

// API Error schema
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  timestamp: z.string(),
});

// Type exports
export type ApiError = z.infer<typeof ApiErrorSchema>;
