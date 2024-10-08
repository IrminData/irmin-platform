'use client';

import ConsoleTitle from '@/components/console/ConsoleTitle';
import WrappedTabs from '@/components/ui/tabs/WrappedTabs';

import { useLocale } from '@/context/LocaleContext';

import ChangePassword from './ChangePassword';
import GeneralSettings from './GeneralSettings';

/**
 * Console user profile settings section.
 */
export default function ProfileSettingsSection() {
  const { dict } = useLocale();
  return (
    <>
      <ConsoleTitle title={dict.profile.profileSettings} />
      <WrappedTabs
        tabs={[
          {
            slug: 'general',
            name: dict.profile.general,
            content: <GeneralSettings />,
          },
          {
            slug: 'change-password',
            name: dict.profile.changePassword,
            content: <ChangePassword />,
          },
        ]}
      />
    </>
  );
}
