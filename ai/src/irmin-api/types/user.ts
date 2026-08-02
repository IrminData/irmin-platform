import { z } from 'zod';

import { RoleSchema } from '@/irmin-api/types/role';

// User schema
export const UserSchema = z.object({
  id: z.string().describe('Unique identifier of the user'),
  first_name: z.string().describe('First name of the user'),
  last_name: z.string().describe('Last name of the user'),
  email: z.email().describe('Email address of the user'),
  phone: z.string().optional().describe('Phone number of the user'),
  company: z.string().optional().describe('Company associated with the user'),
  profile_picture: z
    .url()
    .optional()
    .describe("URL of the user's profile picture"),
  roles: z
    .array(RoleSchema)
    .nullable()
    .optional()
    .describe('Roles assigned to the user'),
});

// Type exports
export type User = z.infer<typeof UserSchema>;
