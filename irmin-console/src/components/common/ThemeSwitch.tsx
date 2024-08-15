'use client';

import { useEffect, useState } from 'react';

import { useTheme } from 'next-themes';

import { FiMoon, FiSun } from 'react-icons/fi';

export default function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) return <></>;

  if (resolvedTheme === 'dark') {
    return (
      <button className='cursor-pointer transition-all hover:opacity-60'>
        <FiSun onClick={() => setTheme('light')} />
      </button>
    );
  }

  if (resolvedTheme === 'light') {
    return (
      <button className='cursor-pointer transition-all hover:opacity-60'>
        <FiMoon onClick={() => setTheme('dark')} />
      </button>
    );
  }

  return <></>;
}
