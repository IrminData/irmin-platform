'use client';

import { useTheme } from 'next-themes';

import { TbMoon, TbSun } from 'react-icons/tb';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useLocale } from '@/context/LocaleContext';

/**
 * Dropdown menu and button to switch between light, dark, and system themes.
 */
export default function ThemeSwitch() {
  const { setTheme } = useTheme();
  const { dict } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='link' size='icon' aria-label='Toggle theme'>
          <TbSun
            className={`
              size-4 scale-100 rotate-0 opacity-60 transition-transform
              dark:scale-0 dark:-rotate-90
            `}
          />
          <TbMoon
            className={`
              absolute size-4 scale-0 rotate-90 opacity-60 transition-transform
              dark:scale-100 dark:rotate-0
            `}
          />
          <span className='sr-only'>{dict.theme.toggle}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          {dict.theme.light}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          {dict.theme.dark}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          {dict.theme.system}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
