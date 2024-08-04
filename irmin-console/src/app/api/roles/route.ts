import { Locale } from '@/dictionaries';
import ProfileService from '@/services/api/ProfileService';
import UserAndRoleService from '@/services/api/UserAndRoleService';

/**
 * Get roles from the Irmin API on the server
 *
 * Uses the {@link ProfileService} for authorisation and {@link UserAndRoleService} to fetch roles
 */
export async function GET(req: Request) {
  // Get the token from the Authorization header
  const token = req.headers.get('Authorization');
  if (!token) {
    return new Response('Unauthorised', { status: 401 });
  }

  // Get locale from the Accept-Language header
  const locale = (req.headers.get('Accept-Language') ?? 'en') as Locale;

  // Validate the token by fetching the /profile endpoint
  const profileSrvice = ProfileService.getInstance(locale, token ?? '');
  const profile = await profileSrvice.getProfile();
  if (!profile) {
    return new Response('Unauthorised', { status: 401 });
  }

  // Fetch roles from the /roles endpoint
  const userRoleService = UserAndRoleService.getInstance(locale, token ?? '');
  const roles = await userRoleService.fetchRoles();

  // Return the roles as a JSON response
  return new Response(JSON.stringify(roles), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
