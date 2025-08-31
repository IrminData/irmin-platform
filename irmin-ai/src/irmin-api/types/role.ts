import { z } from 'zod';

// Role schema
export const RoleSchema = z.object({
  id: z.string().describe('ID of the role'),
  role: z.string().describe('Role name'),
  description: z.string().describe('Description of the role'),
  isOwner: z.boolean().describe('Whether the role is the owner role'),
  isDefault: z.boolean().describe('Whether the role is the default role'),
});

// Type exports
export type Role = z.infer<typeof RoleSchema>;
