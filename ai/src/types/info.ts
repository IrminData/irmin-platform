import { z } from 'zod';

import { UserSchema } from '@/irmin-api/types/user';
import { WorkspaceSchema } from '@/irmin-api/types/workspace';

// User profile response schema
export const UserProfileResponseSchema = z.object({
  user: UserSchema,
});

// Workspace info response schema
export const WorkspaceInfoResponseSchema = z.object({
  workspace: WorkspaceSchema,
  slug: z.string().describe('Workspace slug'),
});

export const ModelProfileResponseSchema = z.object({
  profile: z.object({
    id: z.string(),
    version: z.string(),
    providerAllowlist: z.array(z.string()),
    privacy: z.object({
      zdrRequired: z.literal(true),
      dataCollection: z.literal('deny'),
    }),
    roles: z.record(
      z.string(),
      z.object({
        primaryModel: z.string(),
        fallbackModels: z.array(z.string()),
        capabilities: z.object({
          tools: z.boolean(),
          structuredOutput: z.boolean(),
          reasoning: z.boolean(),
          contextSize: z.number(),
        }),
        maxInputTokens: z.number(),
        maxOutputTokens: z.number(),
        timeoutMs: z.number(),
      })
    ),
  }),
});
