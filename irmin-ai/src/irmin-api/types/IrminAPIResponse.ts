import { z } from 'zod';

// Pagination metadata schema
export const IrminAPIPaginationMetadataSchema = z.object({
  total: z.number().optional().describe('Total number of items available'),
  page: z.number().optional().describe('Current page number'),
  per_page: z.number().optional().describe('Number of items per page'),
  total_pages: z.number().optional().describe('Total number of pages'),
  has_more: z
    .boolean()
    .optional()
    .describe('Whether there are more items available'),
  next: z
    .string()
    .optional()
    .describe('The next identifier (page number or token)'),
});

// API response schema
export const IrminAPIResponseSchema = z.object({
  pagination: IrminAPIPaginationMetadataSchema.optional().describe(
    'Pagination metadata'
  ),
  metadata: z
    .record(z.unknown())
    .optional()
    .describe('Additional metadata from the API response'),
  message: z.string().optional().describe('Message from the API response'),
  errors: z
    .array(z.string())
    .optional()
    .describe('Errors from the API response'),
  data: z
    .unknown()
    .nullable()
    .optional()
    .describe('Data from the API response'),
});

// Binary response schema
export const IrminAPIBinaryResponseSchema = z.union([
  z.instanceof(Blob),
  z.unknown(), // JSONValue - using unknown as a fallback
]);

// Type exports
export type IrminAPIPaginationMetadata = z.infer<
  typeof IrminAPIPaginationMetadataSchema
>;
export type IrminAPIResponse<T = unknown> = Omit<
  z.infer<typeof IrminAPIResponseSchema>,
  'data'
> & {
  data?: T | null;
};
export type IrminAPIBinaryResponse = z.infer<
  typeof IrminAPIBinaryResponseSchema
>;
