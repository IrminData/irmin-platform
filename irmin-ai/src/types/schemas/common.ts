import { z } from 'zod';

// API Error schema
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  timestamp: z.string(),
});

// Pagination query schema
export const PaginationQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Paginated response schema
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

// MCP Tool schema
export const McpToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.unknown()),
  handler: z.function().optional(), // Function type for runtime
});

// Type exports
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type PaginationQuery = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
export type PaginatedResponse<T> = z.infer<ReturnType<typeof PaginatedResponseSchema<z.ZodType<T>>>>;
export type McpTool = z.infer<typeof McpToolSchema>;
