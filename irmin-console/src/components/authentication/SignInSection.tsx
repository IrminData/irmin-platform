'use client';

import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

/**
 * Sign In UI component
 */
const SignInSection = () => {
  const { resolvedTheme } = useTheme();

  return (
    <div id='sign-in-section' className='mx-auto space-y-6'>
      <SignIn
        signUpUrl='/sign-up'
        appearance={{
          baseTheme: resolvedTheme === 'dark' ? dark : undefined,
          variables: { colorPrimary: '#a3c2ac' },
        }}
      />
    </div>
  );
};

export default SignInSection;
