/**
 * Set a cookie
 *
 * To remove a cookie, set negative expiry
 *
 * @param name - The name of the cookie
 * @param value - The value of the cookie
 * @param days - The number of days until the cookie expires
 * {@link https://www.w3schools.com/js/js_cookies.asp | W3Schools}
 */
export function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
}

/**
 * Get a cookie
 * @param name - The name of the cookie
 * @returns The value of the cookie or null if not found
 * {@link https://www.w3schools.com/js/js_cookies.asp | W3Schools}
 */
// eslint-disable-next-line import-x/no-unused-modules
export function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}
