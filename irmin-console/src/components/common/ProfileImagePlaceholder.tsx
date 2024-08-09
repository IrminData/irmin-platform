import { WorkspaceUser } from '@/types/api/Workspace';

const ProfileImagePlaceholder = ({
  user,
  className = '',
}: {
  user: WorkspaceUser;
  className?: string;
}) => {
  const getInitials = (name: string) => {
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('');
    return initials.toUpperCase();
  };
  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gray-100 font-medium text-irmin_blue ${className ? className : 'h-10 w-10'}`}
      id='profile-image-placeholder'
    >
      <span>{getInitials(user.name)}</span>
    </div>
  );
};

export default ProfileImagePlaceholder;
