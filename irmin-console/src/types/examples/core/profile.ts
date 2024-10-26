import { User } from '@/types/core/User';

import { roles } from './roles';
import { workspaces } from './workspaces';

/**
 * Example Clerk user object provided by Clerk
 */
export const clerkUser = {
  pathRoot: '/me',
  id: 'user_2nIZ9VtXOtJFepRAZUQLXdp7z9L',
  externalId: null,
  username: null,
  emailAddresses: [
    {
      pathRoot: '/me/email_addresses',
      emailAddress: 'tim@irmin.co',
      linkedTo: [],
      id: 'idn_2nIZ5BC5kLQ0OTGFTZUsaSnf46T',
      verification: {
        pathRoot: '',
        status: 'verified',
        strategy: 'email_link',
        nonce: null,
        externalVerificationRedirectURL: null,
        attempts: null,
        expireAt: new Date('2024-10-11T16:09:25.200Z'),
        error: null,
        verifiedAtClient: null,
      },
    },
  ],
  phoneNumbers: [],
  web3Wallets: [],
  externalAccounts: [],
  passkeys: [],
  samlAccounts: [],
  organizationMemberships: [],
  passwordEnabled: true,
  firstName: 'Tim',
  lastName: 'Borovkov',
  fullName: 'Tim Borovkov',
  primaryEmailAddressId: 'idn_2nIZ5BC5kLQ0OTGFTZUsaSnf46T',
  primaryEmailAddress: {
    pathRoot: '/me/email_addresses',
    emailAddress: 'tim@irmin.co',
    linkedTo: [],
    id: 'idn_2nIZ5BC5kLQ0OTGFTZUsaSnf46T',
    verification: {
      pathRoot: '',
      status: 'verified',
      strategy: 'email_link',
      nonce: null,
      externalVerificationRedirectURL: null,
      attempts: null,
      expireAt: new Date('2024-10-11T16:09:25.200Z'),
      error: null,
      verifiedAtClient: null,
    },
  },
  primaryPhoneNumberId: null,
  primaryPhoneNumber: null,
  primaryWeb3WalletId: null,
  primaryWeb3Wallet: null,
  imageUrl:
    'https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18ybkZodGlBaWdIdGxtcFJQVUhBVzQ5bmRNZ04iLCJyaWQiOiJ1c2VyXzJuSVo5VnRYT3RKRmVwUkFaVVFMWGRwN3o5TCIsImluaXRpYWxzIjoiVEIifQ',
  hasImage: false,
  twoFactorEnabled: false,
  totpEnabled: false,
  backupCodeEnabled: false,
  publicMetadata: {},
  unsafeMetadata: {},
  createOrganizationEnabled: true,
  deleteSelfEnabled: false,
  lastSignInAt: new Date('2024-10-11T15:59:59.549Z'),
  updatedAt: new Date('2024-10-11T15:59:59.580Z'),
  createdAt: new Date('2024-10-11T15:59:59.543Z'),
  cachedSessionsWithActivities: null,
} as unknown as User['user'];

/**
 * Example user profile (eg. currently logged in user)
 *
 * Type: {@link User}
 *
 * @param last - If true, the item will avoid having children
 */
export const profile = (last = false): User => ({
  id: '0',
  clerk_id: clerkUser?.id ?? 'clerk-id',
  first_name: 'Neil',
  last_name: 'Armstrong',
  company: 'NASA',
  email: 'neil.armstrong@nasa.gov',
  phone: '+1 234 567 890',
  profile_picture: '/ui-assets/images/sign-up/avatar-men-sign-up.png',
  roles: !last ? [roles()[0]] : undefined,
  workspace: !last ? workspaces()[0] : undefined,
  user: clerkUser,
});
