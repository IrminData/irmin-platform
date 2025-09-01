import { UserSchema } from '@/irmin-api/types/user';
import { WorkspaceSchema } from '@/irmin-api/types/workspace';
import { z } from 'zod';

// User profile response schema
export const UserProfileResponseSchema = z.object({
  user: UserSchema,
  token: z.string().describe('JWT token for authentication'),
});

// Workspace info response schema
export const WorkspaceInfoResponseSchema = z.object({
  workspace: WorkspaceSchema,
  slug: z.string().describe('Workspace slug'),
});

// Combined user and workspace info response schema
export const UserWorkspaceInfoResponseSchema = z.object({
  user: UserSchema,
  workspace: WorkspaceSchema,
  token: z.string().describe('JWT token for authentication'),
  slug: z.string().describe('Workspace slug'),
});

// Models response schema
export const ModelsResponseSchema = z.object({
  models: z.array(
    z.object({
      name: z.string(),
      provider: z.string(),
      modelId: z.string(),
      description: z.string(),
      inputPricePerMillionTokens: z.number().nullable(),
      outputPricePerMillionTokens: z.number().nullable(),
    })
  ),
});

// MCP tools response schema - detailed tool information
export const McpToolsResponseSchema = z.object({
  enabled: z.boolean(),
  tools: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      type: z.string(),
      schema: z.unknown().optional(),
      serverId: z.string().optional(),
      requiresAuth: z.boolean().optional(),
    })
  ),
  count: z.number(),
  servers: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['command', 'url']),
      requiresAuth: z.boolean(),
      toolCount: z.number(),
    })
  ),
  totalServers: z.number(),
});

// Type exports
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
export type WorkspaceInfoResponse = z.infer<typeof WorkspaceInfoResponseSchema>;
export type UserWorkspaceInfoResponse = z.infer<
  typeof UserWorkspaceInfoResponseSchema
>;
export type ModelsResponse = z.infer<typeof ModelsResponseSchema>;
export type McpToolsResponse = z.infer<typeof McpToolsResponseSchema>;
