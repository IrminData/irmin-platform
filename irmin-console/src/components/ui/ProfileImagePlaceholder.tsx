import { User } from '@/types/core/User';

const getInitials = (name: string) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('');
  return initials.toUpperCase();
};

/**
 * Placeholder for profile image when user has no profile picture.
 * Shows a circle with user's initials
 *
 * @param props - The component props
 * @param props.user - User object
 * @param props.className - Additional classes
 */
const ProfileImagePlaceholder = ({
  user,
  className = '',
}: {
  user?: User;
  className?: string;
}) => {
  return (
    <div
      className={`bg-accent/20 text-accent relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium ${className ? className : 'h-10 w-10'}`}
      id='profile-image-placeholder'
    >
      <span>
        {getInitials(user ? `${user?.first_name} ${user?.last_name}` : 'User')}
      </span>
    </div>
  );
};

export default ProfileImagePlaceholder;
