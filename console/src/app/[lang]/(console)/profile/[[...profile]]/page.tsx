import ProfileSection from '@/components/user/ProfileSection';

// Title falls through to the profile layout's `title.default` ("Profile · Irmin").
// Setting one here would compose the layout template and yield "Profile – Profile · Irmin".

export default function ProfilePage() {
  return <ProfileSection />;
}
