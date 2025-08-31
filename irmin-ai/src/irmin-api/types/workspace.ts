import { z } from 'zod';

import { UserSchema } from './user';

// Workspace schema
export const WorkspaceSchema = z.object({
  id: z.string().describe('Unique identifier of the workspace'),
  name: z.string().describe('Name of the workspace'),
  slug: z.string().describe('Slug for the workspace'),
  description: z.string().describe('Description of the workspace'),
  owner: UserSchema.optional().describe('Owner of the workspace'),
  users: z
    .array(UserSchema)
    .optional()
    .describe('List of users in the workspace'),
});

// Type exports
export type Workspace = z.infer<typeof WorkspaceSchema>;
