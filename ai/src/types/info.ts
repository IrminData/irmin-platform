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
