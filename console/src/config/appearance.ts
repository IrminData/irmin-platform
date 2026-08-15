const almanacPrimaryColors = {
  light: '#799310',
  dark: '#d1f349',
} as const;

/**
 * Keeps Clerk's embedded surfaces aligned with the console's flat geometry and
 * prevents iOS from zooming text fields whose computed font size is below 16px.
 */
export const almanacClerkElements = {
  card: { borderRadius: '2px', boxShadow: 'none' },
  cardBox: { borderRadius: '2px', boxShadow: 'none' },
  formButtonPrimary: { borderRadius: '2px', boxShadow: 'none' },
  formFieldInput: { borderRadius: '2px', fontSize: '16px' },
  socialButtonsBlockButton: { borderRadius: '2px', boxShadow: 'none' },
} as const;

/**
 * Returns the Almanac accent used by third-party widgets that cannot consume
 * the console's CSS custom properties directly.
 */
export function getAlmanacPrimaryColor(resolvedTheme?: string) {
  return resolvedTheme === 'dark'
    ? almanacPrimaryColors.dark
    : almanacPrimaryColors.light;
}
